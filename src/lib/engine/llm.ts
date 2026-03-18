import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    Observation, Action, PersonaProfile, LLMProvider,
    Archetype, ObservationSection, PageScanAnalysis
} from './types';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ActionSchema = z.object({
    type: z.enum(['click', 'type', 'scroll', 'wait', 'complete', 'fail', 'skip_node']),
    selector: z.string().optional(),
    text: z.string().optional(),
    reasoning: z.string(),
    emotional_state: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    emotional_intensity: z.number().min(0).max(1),
    specific_emotion: z.string().optional(),
    ux_feedback: z.string(),
    proposed_solution: z.string().optional(),
    possible_paths: z.array(z.string()).default([])
});

const SectionResultSchema = z.object({
    label: z.string(),
    ux_feedback: z.string(),
    emotional_state: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    emotional_intensity: z.number().min(0).max(1),
    proposed_solution: z.string().optional()
});

const PageScanSchema = z.object({
    sections: z.array(SectionResultSchema),
    overall_emotion: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    overall_intensity: z.number().min(0).max(1),
    page_summary: z.string()
});

const PersonaSchema = z.object({
    name: z.string(),
    age_range: z.string(),
    geolocation: z.string(),
    tech_literacy: z.enum(['low', 'medium', 'high']),
    domain_familiarity: z.string(),
    goal_prompt: z.string()
});

const ArchetypeSchema = z.object({
    id: z.string(),
    icon_type: z.enum(['users', 'zap', 'user', 'check', 'globe', 'x', 'shopping-cart', 'home', 'settings']),
    desc: z.string()
});

// ─── Shared prompt builders ───────────────────────────────────────────────────

function trimHistory(history: Action[]): string {
    return JSON.stringify(
        history.slice(-4).map(a => ({
            t: a.type,
            s: (a.selector || a.text || '').slice(0, 40),
            url: (a.current_url || '').slice(-35),
            r: (a.reasoning || '').slice(0, 50)
        }))
    );
}

function trimDom(domContext: string | undefined, max = 28): string {
    if (!domContext) return '[]';
    try {
        const els = JSON.parse(domContext);
        // Prefer interactive elements (links, buttons, inputs) over generic elements
        const interactive = els.filter((e: any) =>
            ['link', 'button', 'textbox', 'searchbox', 'input'].includes((e.role || '').toLowerCase())
        );
        const rest = els.filter((e: any) =>
            !['link', 'button', 'textbox', 'searchbox', 'input'].includes((e.role || '').toLowerCase())
        );
        const merged = [...interactive, ...rest].slice(0, max);
        return JSON.stringify(merged.map((e: any) => ({ role: e.role, text: e.text, sel: e.selector })));
    } catch {
        return '[]';
    }
}

function buildActionPrompt(
    observation: Observation,
    persona: PersonaProfile,
    history: Action[],
    blacklist: string[] = [],
    triedElements: string[] = []
): string {
    const uniquePages = new Set(history.map(a => a.current_url?.split('?')[0])).size;
    return `You are ${persona.name} (${persona.tech_literacy} tech literacy, goal: ${persona.goal_prompt}).
URL: ${observation.url} | Pages explored: ${uniquePages}

INTERACTIVE ELEMENTS:
${trimDom(observation.domContext)}

RECENT HISTORY:
${trimHistory(history)}

BLOCKED: ${[...blacklist, ...triedElements].slice(0, 10).join(', ') || 'none'}

INSTRUCTIONS:
- Behave as this persona. Explore the page as they would.
- 'reasoning': first-person internal monologue (why you're choosing this action).
- 'ux_feedback': honest critique of what is visually confusing, missing, or well-designed RIGHT NOW on this screen.
- 'proposed_solution': specific, actionable fix for the designer (required if friction found).
- Use 'skip_node' if the page is a 404, completely irrelevant to your goal, or has no useful content.
- Use 'complete' only when you have fully explored your goal path.

⚠️ AUTH FORMS — STRICT RULE (highest priority):
If the current page contains a login form, sign-up form, registration form, or any page that asks for credentials (email/password, phone/OTP, social login buttons), you MUST:
1. Set 'type' to 'skip_node'.
2. Write 'ux_feedback' about the design of the auth form itself (clarity, trust signals, friction).
3. Do NOT attempt to type into any field. Do NOT click login/signup/submit buttons.
This applies to: /login, /signin, /signup, /register, /auth, /account/create, and any page whose primary content is an authentication form.

Return JSON: { type, text, reasoning, emotional_state, emotional_intensity, specific_emotion, ux_feedback, proposed_solution, possible_paths }`;
}

function buildPageScanPrompt(
    sections: ObservationSection[],
    pageUrl: string,
    pageTitle: string,
    persona: PersonaProfile
): string {
    const sectionLabels = sections.map(s => s.label || 'Section').join(', ');
    return `You are a UX auditor evaluating a webpage as the persona: ${persona.name}.
Persona goal: ${persona.goal_prompt}
Page: ${pageTitle} (${pageUrl})
Sections captured: ${sectionLabels}

For EACH section screenshot (provided as images in order), analyze:
1. Visual hierarchy — is the most important content prominent?
2. Content clarity — is the messaging clear for this persona?
3. Friction — any confusing UI, missing CTAs, broken layouts, or trust issues?
4. Emotional response — how would this persona feel seeing this section?

Be specific and critical. Generic feedback like "looks clean" is not acceptable.
Point to exact elements: headlines, CTAs, images, forms, navigation items.

Return JSON matching this structure:
{
  "sections": [
    { "label": "Top", "ux_feedback": "...", "emotional_state": "...", "emotional_intensity": 0.0-1.0, "proposed_solution": "..." },
    ...
  ],
  "overall_emotion": "...",
  "overall_intensity": 0.0-1.0,
  "page_summary": "2-3 sentence summary of overall UX quality for this persona"
}`;
}

// ─── OpenAI Provider ──────────────────────────────────────────────────────────
// Uses gpt-4o for vision tasks (decideNextAction, analyzePageSections)
// Uses gpt-4o-mini for text-only tasks (summaries, personas, archetypes) — ~15x cheaper

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 600,
            messages: [
                { role: 'system', content: 'Synthetic UX persona. JSON only.' },
                {
                    role: 'user', content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${observation.screenshot}`, detail: 'low' } }
                    ]
                }
            ],
            response_format: zodResponseFormat(ActionSchema, 'action')
        });
        return JSON.parse(response.choices[0].message.content || '{}');
    }

    // Single API call for ALL page sections — replaces N separate analyzeSection() calls
    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        const prompt = buildPageScanPrompt(sections, pageUrl, pageTitle, persona);

        const content: any[] = [{ type: 'text', text: prompt }];
        for (const section of sections) {
            content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${section.screenshot}`, detail: 'low' }
            });
        }

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1000,
            messages: [
                { role: 'system', content: 'UX auditor. JSON only. Be specific and critical.' },
                { role: 'user', content }
            ],
            response_format: zodResponseFormat(PageScanSchema, 'page_scan')
        });

        return JSON.parse(response.choices[0].message.content || '{}');
    }

    // text-only: use mini model
    async generateSummary(prompt: string): Promise<string> {
        const res = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
        });
        return res.choices[0].message.content || '';
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const res = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 800,
            messages: [{
                role: 'user',
                content: `UX Researcher. Generate 5 user persona categories for: ${siteContext}.
Constraints: ${userPrompt || 'none'}. Archetypes: ${archetypes.join(', ')}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }
Use role names not human names (e.g. "Budget Traveler", not "John Doe").`
            }],
            response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(res.choices[0].message.content || '{"personas":[]}');
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const res = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 400,
            messages: [{
                role: 'user',
                content: `Suggest 6 user archetypes for this site. Return JSON: { "archetypes": [{ "id", "icon_type", "desc" }] }
icon_type must be one of: users, zap, user, check, globe, x, shopping-cart, home, settings
Site: ${siteContext}`
            }],
            response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(res.choices[0].message.content || '{"archetypes":[]}');
        return parsed.archetypes || [];
    }
}

// ─── Gemini Provider ──────────────────────────────────────────────────────────
// Uses gemini-2.0-flash for everything — free tier available, fast, vision-capable

export class GeminiProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
    }

    private get flashModel() {
        return this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const result = await this.flashModel.generateContent([
            prompt,
            { inlineData: { data: observation.screenshot, mimeType: 'image/jpeg' } }
        ]);
        const action = JSON.parse(result.response.text());

        // Normalize possible_paths
        if (!Array.isArray(action.possible_paths)) {
            action.possible_paths = typeof action.possible_paths === 'string' ? [action.possible_paths] : [];
        }
        action.possible_paths = action.possible_paths.map((p: any) =>
            typeof p === 'object' ? (p.path_name || p.description || JSON.stringify(p)) : String(p)
        );
        return action;
    }

    // Single call with all section images
    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        const prompt = buildPageScanPrompt(sections, pageUrl, pageTitle, persona);

        const parts: any[] = [prompt];
        for (const section of sections) {
            parts.push({ inlineData: { data: section.screenshot, mimeType: 'image/jpeg' } });
        }

        const result = await this.flashModel.generateContent(parts);
        try {
            return JSON.parse(result.response.text());
        } catch {
            return {
                sections: sections.map(s => ({
                    label: s.label || 'Section',
                    ux_feedback: 'Analysis unavailable',
                    emotional_state: 'neutral',
                    emotional_intensity: 0.3
                })),
                overall_emotion: 'neutral',
                overall_intensity: 0.3,
                page_summary: 'Analysis unavailable'
            };
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const res = await model.generateContent(prompt);
        return res.response.text();
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const prompt = `UX Researcher. Generate 5 user persona categories for: ${siteContext}.
Archetypes: ${archetypes.join(', ')}. Constraints: ${userPrompt || 'none'}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }
Use role names not human names.`;
        const res = await this.flashModel.generateContent(prompt);
        try {
            const parsed = JSON.parse(res.response.text());
            return parsed.personas || (Array.isArray(parsed) ? parsed : []);
        } catch {
            return [];
        }
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const prompt = `Suggest 6 user archetypes for this site.
Return JSON: { "archetypes": [{ "id", "icon_type", "desc" }] }
icon_type must be one of: users, zap, user, check, globe, x, shopping-cart, home, settings
Site: ${siteContext}`;
        const res = await this.flashModel.generateContent(prompt);
        try {
            const parsed = JSON.parse(res.response.text());
            return (parsed.archetypes || []).map((a: any, i: number) => ({
                id: a.id || `Archetype-${i}`,
                icon_type: a.icon_type || 'users',
                desc: a.desc || 'No description'
            }));
        } catch {
            return [];
        }
    }
}

// ─── Ollama Provider (local / free) ──────────────────────────────────────────

export class OllamaProvider implements LLMProvider {
    private host: string;
    private models: string[];

    constructor() {
        this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const modelStr = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || 'llama3.2-vision';
        this.models = modelStr.split(',').map(m => m.trim());
    }

    private async call(model: string, prompt: string, images: string[]): Promise<any> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);
        try {
            const res = await fetch(`${this.host}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, images, stream: false, format: 'json' }),
                signal: controller.signal
            });
            if (!res.ok) throw new Error(`Ollama ${res.status}`);
            return await res.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        try {
            const data = await this.call(this.models[0], prompt, [observation.screenshot]);
            return JSON.parse(data.response) as Action;
        } catch {
            if (this.models.length > 1) {
                const data = await this.call(this.models[1], prompt, [observation.screenshot]);
                return JSON.parse(data.response) as Action;
            }
            throw new Error('All Ollama models failed');
        }
    }

    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        // Ollama: send only the primary (first) section screenshot to keep inference fast
        const prompt = buildPageScanPrompt(sections, pageUrl, pageTitle, persona);
        const primaryImage = sections[0]?.screenshot || '';
        try {
            const data = await this.call(this.models[0], prompt, [primaryImage]);
            return JSON.parse(data.response);
        } catch {
            return {
                sections: sections.map(s => ({
                    label: s.label || 'Section',
                    ux_feedback: 'Analysis unavailable',
                    emotional_state: 'neutral',
                    emotional_intensity: 0.3
                })),
                overall_emotion: 'neutral',
                overall_intensity: 0.3,
                page_summary: 'Analysis unavailable'
            };
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const data = await this.call(this.models[0], prompt, []);
        return data.response;
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const prompt = `Generate 5 user persona categories for: ${siteContext}. Constraints: ${userPrompt}. Archetypes: ${archetypes.join(', ')}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }`;
        const data = await this.call(this.models[0], prompt, []);
        const parsed = JSON.parse(data.response);
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const data = await this.call(this.models[0], `Suggest 6 archetypes for: ${siteContext}. Return JSON: { "archetypes": [...] }`, []);
        const parsed = JSON.parse(data.response);
        return parsed.archetypes || [];
    }
}

// ─── LLMService facade ────────────────────────────────────────────────────────

export class LLMService {
    private provider: LLMProvider;

    constructor(config?: { provider: 'ollama' | 'gemini' | 'openai'; apiKey?: string }) {
        const type = config?.provider || 'gemini'; // Default to Gemini (free tier)
        if (type === 'openai') this.provider = new OpenAIProvider();
        else if (type === 'gemini') this.provider = new GeminiProvider(config?.apiKey);
        else this.provider = new OllamaProvider();
    }

    decideNextAction(obs: Observation, p: PersonaProfile, h: Action[], b: string[] = [], t: string[] = []): Promise<Action> {
        return this.provider.decideNextAction(obs, p, h, b, t);
    }

    analyzePageSections(sections: ObservationSection[], url: string, title: string, p: PersonaProfile): Promise<PageScanAnalysis> {
        return this.provider.analyzePageSections(sections, url, title, p);
    }

    generateSummary(prompt: string): Promise<string> {
        return this.provider.generateSummary(prompt);
    }

    generatePersonas(s: string, u: string, a: string[]): Promise<PersonaProfile[]> {
        return this.provider.generatePersonas(s, u, a);
    }

    suggestArchetypes(s: string): Promise<Archetype[]> {
        return this.provider.suggestArchetypes(s);
    }
}