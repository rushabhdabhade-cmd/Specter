import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Observation, Action, PersonaProfile, LLMProvider, Archetype } from './types';

const ActionSchema = z.object({
    type: z.enum(['click', 'type', 'scroll', 'wait', 'complete', 'fail']),
    selector: z.string().optional(),
    text: z.string().optional(),
    reasoning: z.string(),
    emotional_state: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    emotional_intensity: z.number().min(0).max(1),
    specific_emotion: z.string().optional(),
    ux_feedback: z.string(),
    proposed_solution: z.string().optional(),
    possible_paths: z.array(z.string())
});

const SectionAnalysisSchema = z.object({
    ux_feedback: z.string(),
    emotional_state: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    emotional_intensity: z.number().min(0).max(1),
    proposed_solution: z.string().optional()
});

const PersonaSchema = z.object({
    name: z.string(),
    age_range: z.string(),
    geolocation: z.string(),
    tech_literacy: z.enum(['low', 'medium', 'high']),
    domain_familiarity: z.string(),
    goal_prompt: z.string()
});

const PersonaCohortSchema = z.array(PersonaSchema);

const ArchetypeSchema = z.object({
    id: z.string(),
    icon_type: z.enum(['users', 'zap', 'user', 'check', 'globe', 'x', 'shopping-cart', 'home', 'settings']),
    desc: z.string()
});

const ArchetypeCohortSchema = z.array(ArchetypeSchema);

// ─── Token-saving helpers ─────────────────────────────────────────────────────

function trimHistory(history: Action[]): string {
    return JSON.stringify(
        history.slice(-5).map(a => ({
            t: a.type,
            s: a.selector || a.text,
            url: a.current_url?.slice(-30),
            r: a.reasoning?.slice(0, 40)
        }))
    );
}

function truncateDom(domContext: string | undefined, maxElements = 40): string {
    if (!domContext) return '[]';
    try {
        const elements = JSON.parse(domContext);
        return JSON.stringify(elements.slice(0, maxElements));
    } catch {
        return '[]';
    }
}

function buildActionPrompt(
    observation: Observation,
    persona: PersonaProfile,
    history: Action[],
    blockedPaths: string[] = [],
    triedElements: string[] = []
): string {
    const uniquePagesVisited = new Set(history.map(a => a.current_url?.split('#')[0])).size;

    return `You are ${persona.name} (tech literacy: ${persona.tech_literacy}).
Goal: ${persona.goal_prompt}
URL: ${observation.url}
Explored: ${uniquePagesVisited}/3 unique pages.

MISSION:
Evaluate visual hierarchy, messaging clarity, and friction. 

DOM ELEMENTS:
${truncateDom(observation.domContext)}

HISTORY:
${trimHistory(history)}

TRIED (FAILURES): ${triedElements.join(', ') || 'None'}

RULES:
- 'text': Action description.
- 'reasoning': [INTERNAL MONOLOGUE] Why YOU chosen this action based on your persona goal and mindset (e.g., "I am looking for pricing, so I will scroll down").
- 'ux_feedback': [CRITIQUE] What is wrong or right with the website design/copy here (e.g., "The pricing plan is buried below unrelated content").
- 'proposed_solution': [MANDATORY on friction] Specific advice for the designer (e.g., "Move the Pricing grid above the fold to capture high intent buyers").
- 'possible_paths': Array of simple strings.

Return JSON: { "type","text","reasoning","emotional_state","emotional_intensity","specific_emotion","ux_feedback","proposed_solution","possible_paths" }`;
}

// ─── Providers ────────────────────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    constructor() { this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'Synthetic UX Auditor. JSON ONLY.' },
                {
                    role: 'user', content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${observation.screenshot}` } }
                    ]
                }
            ],
            response_format: zodResponseFormat(ActionSchema, 'action')
        });
        return JSON.parse(response.choices[0].message.content || '{}');
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, label: string): Promise<any> {
        const response = await this.client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "UX Auditor. JSON ONLY." },
                {
                    role: "user", content: [
                        { type: "text", text: `Analyze the ${label} section of the page for persona: ${persona.name}` },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${observation.screenshot}` } }
                    ]
                }
            ],
            response_format: zodResponseFormat(SectionAnalysisSchema, "feedback")
        });
        return JSON.parse(response.choices[0].message.content || '{}');
    }

    async generateSummary(prompt: string): Promise<string> {
        const res = await this.client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] });
        return res.choices[0].message.content || '';
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const res = await this.client.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user", content: `You are a UX Researcher. Generate 5 detailed user persona categories for: ${siteContext}. Constraints: ${userPrompt}. Archetypes: ${archetypes.join(', ')}. 
RESPONSE FORMAT: JSON with "personas" key. 
Each persona MUST have: 
- "name": A CATEGORY OR ROLE NAME (e.g., "Budget Traveler", "Power User"). DO NOT USE HUMAN NAMES (like "John Doe").
- "age_range", "geolocation", "tech_literacy" (low/medium/high), "domain_familiarity", "goal_prompt"` }],
            response_format: { type: "json_object" }
        });
        const parsed = JSON.parse(res.choices[0].message.content || '{"personas": []}');
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const res = await this.client.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: `Suggest 6 user archetypes for: ${siteContext}` }],
            response_format: { type: "json_object" }
        });
        const parsed = JSON.parse(res.choices[0].message.content || '{"archetypes": []}');
        return parsed.archetypes || [];
    }
}

export class GeminiProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;
    constructor(apiKey?: string) { this.genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || ''); }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { responseMimeType: 'application/json' } });
        const result = await model.generateContent([prompt, { inlineData: { data: observation.screenshot, mimeType: 'image/jpeg' } }]);
        const action = JSON.parse(result.response.text());

        // Normalize possible_paths to ensure they are strings
        if (action.possible_paths) {
            if (!Array.isArray(action.possible_paths)) {
                action.possible_paths = typeof action.possible_paths === 'string' ? [action.possible_paths] : [];
            }
            action.possible_paths = action.possible_paths.map((p: any) =>
                typeof p === 'object' ? (p.path_name || p.description || JSON.stringify(p)) : String(p)
            );
        } else {
            action.possible_paths = [];
        }

        return action;
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, label: string): Promise<any> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent([`Analyze the ${label} section. persona: ${persona.name}`, { inlineData: { data: observation.screenshot, mimeType: "image/jpeg" } }]);
        return JSON.parse(result.response.text());
    }

    async generateSummary(prompt: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const res = await model.generateContent(prompt);
        return res.response.text();
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        const prompt = `You are a Senior UX Researcher. 
Based on the following site context, generate 5 detailed and realistic user persona categories.
SITE CONTEXT:
${siteContext}

SELECTED ARCHETYPES:
${archetypes.join(', ')}

CUSTOM CONSTRAINTS:
${userPrompt || 'None'}

RESPONSE FORMAT:
Return a JSON object with a "personas" key containing an array of persona objects.
Each persona MUST have: 
- "name": A CATEGORY OR ROLE NAME (e.g., "Budget Traveler", "Power User", "Casual Shopper"). DO NOT USE HUMAN NAMES (like "John Doe").
- "age_range": e.g., "25-34"
- "geolocation": e.g., "urban" or "suburban"
- "tech_literacy": (low, medium, or high)
- "domain_familiarity": description of their knowledge in this industry
- "goal_prompt": (a first-person description of their mindset/goal).`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        try {
            const parsed = JSON.parse(text);
            const personas = parsed.personas || (Array.isArray(parsed) ? parsed : []);
            return personas;
        } catch (e) {
            console.error("Failed to parse Gemini personas:", text);
            return [];
        }
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        const prompt = `Review the following site content and suggest 6 distinct user archetypes that represent the primary audience segments.
SITE CONTEXT:
${siteContext}

RESPONSE FORMAT:
Return a JSON object with an "archetypes" key containing an array of archetype objects.
Each archetype MUST have: 
- "id": A unique short string (e.g., "Frequent Shopper")
- "icon_type": One of [users, zap, user, check, globe, x, shopping-cart, home, settings]
- "desc": A 1-sentence description of the segment

Example: { "archetypes": [{ "id": "Developer", "icon_type": "zap", "desc": "Technical user exploring APIs" }] }`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        try {
            const parsed = JSON.parse(text);
            const archetypes = parsed.archetypes || (Array.isArray(parsed) ? parsed : []);
            return archetypes.map((a: any, idx: number) => ({
                id: a.id || `Archetype-${idx}`,
                icon_type: a.icon_type || 'users',
                desc: a.desc || 'No description provided'
            }));
        } catch (e) {
            console.error("Failed to parse Gemini archetypes:", text);
            return [];
        }
    }
}

export class OllamaProvider implements LLMProvider {
    private host: string;
    private models: string[];

    constructor() {
        this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const modelStr = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || 'llama3.2-vision';
        this.models = modelStr.split(',').map(m => m.trim());
    }

    private async fetchWithRetry(model: string, prompt: string, screenshots: string[], signal: AbortSignal): Promise<any> {
        const response = await fetch(`${this.host}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, images: screenshots || [], stream: false, format: 'json' }),
            signal
        });
        if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
        return await response.json();
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const model = this.models[0]; // Efficiency Fix: Use only the primary model by default

        console.log(`🤖 Ollama inference (${model})...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        try {
            const data = await this.fetchWithRetry(model, prompt, [observation.screenshot], controller.signal);
            return JSON.parse(data.response) as Action;
        } catch (err: any) {
            console.error(`❌ ${model} failed, falling back to backup if available...`);
            if (this.models.length > 1) {
                const data = await this.fetchWithRetry(this.models[1], prompt, [observation.screenshot], controller.signal);
                return JSON.parse(data.response) as Action;
            }
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const data = await this.fetchWithRetry(this.models[0], prompt, [], new AbortController().signal);
        return data.response;
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const prompt = `You are a UX Researcher. Generate 5 detailed user persona categories for: ${siteContext}. Constraints: ${userPrompt}. Archetypes: ${archetypes.join(', ')}. 
RESPONSE FORMAT: JSON with "personas" key containing an array.
Each persona MUST have: 
- "name": A CATEGORY OR ROLE NAME (e.g., "Budget Traveler", "Power User"). DO NOT USE HUMAN NAMES (like "John Doe").
- "age_range", "geolocation", "tech_literacy" (low/medium/high), "domain_familiarity", "goal_prompt"`;
        const data = await this.fetchWithRetry(this.models[0], prompt, [], new AbortController().signal);
        const parsed = JSON.parse(data.response);
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const data = await this.fetchWithRetry(this.models[0], `Suggest 6 archetypes for: ${siteContext}`, [], new AbortController().signal);
        const parsed = JSON.parse(data.response);
        return parsed.archetypes || [];
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, label: string): Promise<any> {
        const prompt = `Analyze the ${label} section for UX persona: ${persona.name}. URL: ${observation.url}`;
        const data = await this.fetchWithRetry(this.models[0], prompt, [observation.screenshot], new AbortController().signal);
        return JSON.parse(data.response);
    }
}

export class LLMService {
    private provider: LLMProvider;
    constructor(config?: { provider: 'ollama' | 'gemini' | 'openai', apiKey?: string }) {
        const type = config?.provider || 'ollama';
        if (type === 'gemini') this.provider = new GeminiProvider(config?.apiKey);
        else if (type === 'openai') this.provider = new OpenAIProvider();
        else this.provider = new OllamaProvider();
    }
    async decideNextAction(obs: Observation, p: PersonaProfile, h: Action[], b: string[] = [], t: string[] = []): Promise<Action> { return this.provider.decideNextAction(obs, p, h, b, t); }
    async analyzeSection(obs: Observation, p: PersonaProfile, l: string): Promise<any> { return this.provider.analyzeSection(obs, p, l); }
    async generateSummary(p: string): Promise<string> { return this.provider.generateSummary(p); }
    async generatePersonas(s: string, u: string, a: string[]): Promise<PersonaProfile[]> { return this.provider.generatePersonas(s, u, a); }
    async suggestArchetypes(s: string): Promise<Archetype[]> { return this.provider.suggestArchetypes(s); }
}
