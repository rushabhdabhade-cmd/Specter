import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Observation, Action, PersonaProfile, LLMProvider } from './types';

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

// ─── Token-saving helpers ─────────────────────────────────────────────────────

/** Trim history to only the essential fields to save tokens. */
function trimHistory(history: Action[]): string {
    return JSON.stringify(
        history.slice(-10).map(a => ({
            t: a.type,
            s: a.selector,
            url: a.current_url,
            r: a.reasoning?.slice(0, 60)
        }))
    );
}

/** Truncate DOM context to a max number of elements and chars. */
function truncateDom(domContext: string | undefined, maxElements = 60, maxChars = 3000): string {
    if (!domContext) return '[]';
    try {
        const elements = JSON.parse(domContext);
        const capped = elements.slice(0, maxElements);
        const str = JSON.stringify(capped);
        return str.length > maxChars ? str.slice(0, maxChars) + '…]' : str;
    } catch {
        return domContext.slice(0, maxChars);
    }
}

/** Compact persona/action prompt shared by all providers. */
function buildActionPrompt(
    observation: Observation,
    persona: PersonaProfile,
    history: Action[],
    blockedPaths: string[] = [],
    triedElements: string[] = []
): string {
    const lastAction = history[history.length - 1];
    const isStuck = lastAction &&
        (lastAction.type === 'click' || lastAction.type === 'type') &&
        lastAction.current_url === observation.url;
    const stuckNote = isStuck
        ? `⚠️ STUCK: Last ${lastAction.type} on ${lastAction.selector || '?'} did not change the page. 
Suggestions:
- Try a DIFFERENT element (e.g. a link in the footer or a mobile menu icon).
- SCROLL down to see if the page content changed below the fold.
- Check if you need to click a parent container instead.\n`
        : '';

    const triedNote = triedElements.length > 0
        ? `[CRITICAL] TRIED ELEMENTS ON THIS URL (FAILURES):
The following elements were ALREADY CLICKED but did NOT lead to a new page. 
DO NOT CLICK THEM AGAIN. DO NOT CLICK VARIATIONS OF THEM. 
CLICKING THESE AGAIN WILL CAUSE AN INFINITE LOOP REDUCING YOUR SCORE.
TRIED ELEMENTS:
${triedElements.map(e => `- "${e}"`).join('\n')}

Actionable Advice: 
- If you've tried the main CTAs, look for sub-links, footer links, or social icons.
- If you're stuck, SCROLL to find new sections.
- Do NOT express "delight" if you decide to click a tried element; instead, express FRUSTRATION.\n`
        : '';

    const uniquePagesVisited = new Set(history.map(a => a.current_url?.split('#')[0])).size;

    let visualGuidance = '';
    let elementsContext = '';

    if (observation.sections && observation.sections.length > 0) {
        visualGuidance = `I have provided ${observation.sections.length} sections of the page (captured while scrolling Top -> Mid -> Bottom). 
Each section consists of a screenshot followed by its specific INTERACTIVE ELEMENTS (JSON).
[CRITICAL] Use the JSON immediate following a screenshot to identify elements labeled [0], [1], etc. in that specific image.`;

        elementsContext = observation.sections.map((s, idx) => {
            const label = idx === 0 ? 'TOP' : idx === 1 ? 'MIDDLE' : 'BOTTOM';
            return `--- SECTION: ${label} ---\n(Context for the image above)\n${truncateDom(s.domContext)}\n`;
        }).join('\n');
    } else {
        visualGuidance = `The provided image has indigo labels like [0], [1], etc. these correspond EXACTLY to the "index" in the JSON below.`;
        elementsContext = `INTERACTIVE ELEMENTS (JSON):\n${truncateDom(observation.domContext)}`;
    }

    return `You are ${persona.name}, a synthetic UX Auditor (tech literacy: ${persona.tech_literacy}).
Goal: ${persona.goal_prompt}
Current URL: ${observation.url}
Unique Pages Visited: ${uniquePagesVisited}/3 (Goal: Explore at least 3 unique sub-pages before completing)
${stuckNote}
${triedNote}

UX AUDIT DIRECTIVE:
Your primary objective is to evaluate the website's quality. Provide detailed, critical observations in 'ux_feedback' regarding:
- Visual Hierarchy: Is the most important content emphasized? 
- Content Quality: Is the messaging clear and relevant?
- Navigation Friction: Are there confusing menus, broken links, or repetitive steps?
- Responsiveness: Does the layout feel cramped or poorly spaced?

VISUAL GUIDANCE:
${visualGuidance}

${elementsContext}

HISTORY (Last 10):
${trimHistory(history)}

TASK:
1) Analyze ALL provided screenshots and their corresponding semantic elements.
2) Decide the NEXT action to move toward your goal AND increase page variety.
3) If you've already explored a page, favor finding NEW links/buttons to other sections.
4) Provide a DETAILED UX observation in 'ux_feedback'.

Rules:
- [CRITICAL] Instead of using precise coordinates or indices, describe the target element in the 'text' field (e.g., "the login button", "the pricing link").
- The engine now uses AI to find the element based on your description.
- Never repeat an action that didn't change the state.
- [CRITICAL] Be critical. If something is generic or misplaced, say so.

EMOTIONAL STATE:
You must select a granular emotion and an intensity (0.0 to 1.0) that best reflects your current experience:
- Delight: High satisfaction/joy from a successful task or great discovery.
- Satisfaction: Contentment; things are working as expected.
- Curiosity: Interest in a section or link; wanting to explore further.
- Surprise: Unexpected but interesting/positive revelation.
- Neutral: Standard interaction with no specific pulse.
- Confusion: UI is ambiguous, you're unsure where to go, or something feels slightly "off".
- Boredom: Content is generic, layout is repetitive, or goal progress feels slow.
- Frustration: Direct friction (broken links, loops, complex forms, missing info).
- Disappointment: Goal progress failed or content didn't meet expectations.
- specific_emotion: A short 2-3 word string providing more nuance (e.g., "Cautious Optimism", "Brief Annoyance", "Discovery Spark").
- proposed_solution: [MANDATORY IF FRICTION DETECTED] If you express Confusion, Boredom, Frustration, or Disappointment, you MUST provide a concrete, technical recommendation on how to fix the issue (e.g., "Move the 'Skip' button to the top-right", "Increase contrast on the secondary CTA", "Simplify the 4-step onboarding into a single page").

[SCORING DIRECTIVE]
- High Intensity (0.8+) for Frustration/Disappointment significantly drains the UX score.
- High Intensity (0.8+) for Delight/Satisfaction provides a positive boost.
- If you state that a discovery is "good", "useful", or "helpful" in your reasoning, you MUST return a positive emotion (Delight/Satisfaction/Curiosity) with appropriate intensity.

Return JSON: { "type","selector"?, "text", "reasoning","emotional_state","emotional_intensity","specific_emotion"?, "ux_feedback", "proposed_solution"?, "possible_paths" }`;
}

// ─── Providers ────────────────────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);

        const content: any[] = [{ type: 'text', text: prompt }];

        if (observation.sections && observation.sections.length > 0) {
            observation.sections.forEach((s, idx) => {
                const label = idx === 0 ? 'TOP' : idx === 1 ? 'MIDDLE' : 'BOTTOM';
                content.push({ type: 'text', text: `IMAGE: ${label} SECTION` });
                content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${s.screenshot}` } });
            });
        } else {
            content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${observation.screenshot}` } });
        }

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a synthetic UX persona navigating a website. Always return valid JSON.' },
                { role: 'user', content }
            ],
            response_format: zodResponseFormat(ActionSchema, 'action')
        });

        const choice = response.choices[0].message.content;
        if (!choice) throw new Error('No response from OpenAI');
        return JSON.parse(choice) as Action;
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, sectionLabel: string): Promise<{
        ux_feedback: string,
        emotional_state: string,
        emotional_intensity: number,
        proposed_solution?: string
    }> {
        const prompt = `You are evaluating a specific section of a webpage (${sectionLabel}).
Goal: ${persona.goal_prompt}
Current URL: ${observation.url}

Analyze the provided screenshot and semantic elements for this section. Focus purely on UX observations and value proposition.
Identify any friction and propose a solution if necessary.
Provide your findings including an emotional tag (delight, satisfaction, curiosity, surprise, neutral, confusion, boredom, frustration, disappointment) and intensity (0.0-1.0).
Provide your findings in the requested JSON format.`;

        const response = await this.client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a world-class UX Auditor. Your goal is to provide granular, objective feedback. Always return valid JSON."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${observation.screenshot}` } },
                    ],
                },
            ],
            response_format: zodResponseFormat(SectionAnalysisSchema, "feedback"),
        });

        const res = JSON.parse(response.choices[0].message.content || '{}');
        return {
            ux_feedback: typeof res.ux_feedback === 'string' ? res.ux_feedback : JSON.stringify(res.ux_feedback || 'No feedback provided'),
            emotional_state: res.emotional_state || 'neutral',
            emotional_intensity: res.emotional_intensity ?? 0.3,
            proposed_solution: res.proposed_solution
        };
    }

    async generateSummary(prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }]
        });
        return response.choices[0].message.content || '';
    }
}

export class GeminiProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey?: string) {
        const key = apiKey || process.env.GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(key);
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);

        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const content: any[] = [prompt];
                if (observation.sections && observation.sections.length > 0) {
                    observation.sections.forEach((s, idx) => {
                        const label = idx === 0 ? 'TOP' : idx === 1 ? 'MIDDLE' : 'BOTTOM';
                        content.push(`IMAGE: ${label} SECTION`);
                        content.push({ inlineData: { data: s.screenshot, mimeType: 'image/jpeg' } });
                    });
                } else if (observation.screenshot.length > 100) {
                    content.push({ inlineData: { data: observation.screenshot, mimeType: 'image/jpeg' } });
                }

                const result = await model.generateContent(content);
                const response = await result.response;
                if (response) {
                    const result = JSON.parse(response.text()) as Action;
                    // Harden: Ensure ux_feedback is a string
                    if (result.ux_feedback && typeof result.ux_feedback === 'object') {
                        result.ux_feedback = JSON.stringify(result.ux_feedback);
                    }
                    return result;
                }
            } catch (err: any) {
                lastError = err;
                console.error(`❌ Gemini ${modelName} failed: `, err.message);
            }
        }

        throw lastError || new Error('All Gemini models failed');
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, sectionLabel: string): Promise<{ ux_feedback: string, emotional_state: string, emotional_intensity: number, proposed_solution?: string }> {
        const prompt = `You are evaluating a specific section of a webpage(${sectionLabel}).
    Goal: ${persona.goal_prompt}
Current URL: ${observation.url}

Analyze the provided screenshot and semantic elements for this section.Focus purely on UX observations and value proposition.
Identify any friction and propose a solution if necessary.
Provide your findings including an emotional tag(delight, satisfaction, curiosity, surprise, neutral, confusion, boredom, frustration, disappointment) and intensity(0.0 - 1.0).
Return JSON: { "ux_feedback", "emotional_state", "emotional_intensity", "proposed_solution" ? } `;

        const model = this.genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: observation.screenshot,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const text = result.response.text();
        try {
            const parsed = JSON.parse(text);
            return {
                ux_feedback: typeof parsed.ux_feedback === 'string' ? parsed.ux_feedback : JSON.stringify(parsed.ux_feedback || parsed),
                emotional_state: parsed.emotional_state || 'neutral',
                emotional_intensity: parsed.emotional_intensity ?? 0.3,
                proposed_solution: parsed.proposed_solution
            };
        } catch (e) {
            return { ux_feedback: text, emotional_state: 'neutral', emotional_intensity: 0.3 };
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (err: any) {
                lastError = err;
                console.error(`❌ Gemini summary ${modelName} failed: `, err.message);
            }
        }
        throw lastError || new Error('All Gemini models failed for summary');
    }
}

export class OllamaProvider implements LLMProvider {
    private host: string;
    private models: string[];

    constructor() {
        this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const modelStr = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || 'llava';
        this.models = modelStr.split(',').map(m => m.trim());
    }

    private async fetchWithRetry(model: string, prompt: string, screenshots: string[], signal: AbortSignal, retries = 2): Promise<any> {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(`${this.host} /api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        prompt,
                        images: screenshots || [],
                        stream: false,
                        format: 'json'
                    }),
                    signal
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'No error body');
                    throw new Error(`Ollama error(${response.status}): ${errorText} `);
                }

                return await response.json();
            } catch (err: any) {
                if (i === retries || err.name === 'AbortError') throw err;
                const delay = Math.pow(2, i) * 1000;
                console.warn(`⚠️ ${model} attempt ${i + 1}/${retries + 1} failed. Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        console.log(`🤖 Ollama inference (${this.models.join(', ')})...`);
        console.time('inference_total');

        let validResults: { model: string, action: Action }[] = [];

        try {
            const results = await Promise.all(this.models.map(async (model) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 300000);
                try {
                    const screenshots = observation.sections && observation.sections.length > 0
                        ? observation.sections.map(s => s.screenshot)
                        : [observation.screenshot];
                    const data = await this.fetchWithRetry(model, prompt, screenshots, controller.signal);
                    clearTimeout(timeoutId);
                    const action = JSON.parse(data.response) as Action;
                    // Harden: Ensure ux_feedback is a string
                    if (action.ux_feedback && typeof action.ux_feedback === 'object') {
                        action.ux_feedback = JSON.stringify(action.ux_feedback);
                    }
                    return { model, action };
                } catch (err: any) {
                    console.error(`❌ ${model} failed:`, err.message);
                    return null;
                }
            }));
            validResults = results.filter((r): r is { model: string, action: Action } => r !== null);
        } catch (err) {
            console.warn('Critical inference failure, falling back to sequential...');
        }

        if (validResults.length === 0) {
            for (const model of this.models) {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 600000);
                try {
                    const screenshots = observation.sections && observation.sections.length > 0
                        ? observation.sections.map(s => s.screenshot)
                        : [observation.screenshot];
                    const data = await this.fetchWithRetry(model, prompt, screenshots, controller.signal);
                    validResults.push({ model, action: JSON.parse(data.response) as Action });
                    break;
                } catch (err: any) {
                    console.error(`❌ Backup ${model} failed:`, err.message);
                }
            }
        }

        console.timeEnd('inference_total');
        if (validResults.length === 0) throw new Error('Ollama provider unavailable');

        return this.synthesize(validResults);
    }

    async generateSummary(prompt: string): Promise<string> {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(`${this.host}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: this.models[0], prompt, stream: false }),
                signal: controller.signal
            });
            const data = await response.json();
            return data.response;
        } catch (err: any) {
            console.error('❌ Ollama summary failed:', err.message);
            return 'AI summary unavailable.';
        }
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, sectionLabel: string): Promise<{ ux_feedback: string, emotional_state: string, emotional_intensity: number, proposed_solution?: string }> {
        const prompt = `[UX SPECIALIST AUDIT: ${sectionLabel.toUpperCase()}]
Goal: ${persona.goal_prompt}
URL: ${observation.url}

Task: Analyze this specific section and provide qualitative UX feedback.
Focus: Visual hierarchy, clarity of purpose, and potential friction.
Identify any friction and propose a solution if necessary.
Provide emotional tag (delight, satisfaction, curiosity, surprise, neutral, confusion, boredom, frustration, disappointment) and intensity (0.0-1.0).

Return strictly JSON: { "ux_feedback", "emotional_state", "emotional_intensity", "proposed_solution"? }`;

        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 60000);

        try {
            const result = await this.fetchWithRetry(
                this.models[0], // Use first available vision model
                prompt,
                [observation.screenshot],
                abortController.signal
            );
            const parsed = JSON.parse(result.message?.content || result.response || '{}');
            return {
                ux_feedback: typeof parsed.ux_feedback === 'string' ? parsed.ux_feedback : JSON.stringify(parsed.ux_feedback || parsed),
                emotional_state: parsed.emotional_state || 'neutral',
                emotional_intensity: parsed.emotional_intensity ?? 0.3,
                proposed_solution: parsed.proposed_solution
            };
        } catch (e) {
            console.error(`Ollama analysis failed:`, e);
            return { ux_feedback: "Local analysis timed out.", emotional_state: 'neutral', emotional_intensity: 0.3 };
        } finally {
            clearTimeout(timeout);
        }
    }

    private synthesize(results: { model: string, action: Action }[]): Action {
        if (results.length === 1) return results[0].action;

        const primary = results[0].action;
        const reasoning = results.map(r => `[${r.model}] ${r.action.reasoning}`).join('\n\n');
        const ux = results.map(r => `[${r.model}] ${r.action.ux_feedback}`).join('\n\n');
        const paths = Array.from(new Set(results.flatMap(r => r.action.possible_paths || [])));

        return { ...primary, reasoning, ux_feedback: ux, possible_paths: paths };
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class LLMService {
    private provider: LLMProvider;

    constructor(config?: { provider: 'ollama' | 'gemini' | 'openai', apiKey?: string }) {
        const providerType = config?.provider || 'ollama';
        if (providerType === 'gemini') {
            this.provider = new GeminiProvider(config?.apiKey);
        } else if (providerType === 'openai') {
            this.provider = new OpenAIProvider();
        } else {
            this.provider = new OllamaProvider();
        }
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = [], triedElements: string[] = []): Promise<Action> {
        return this.provider.decideNextAction(observation, persona, history, blacklist, triedElements);
    }

    async analyzeSection(observation: Observation, persona: PersonaProfile, sectionLabel: string): Promise<{ ux_feedback: string, emotional_state: string, emotional_intensity: number, proposed_solution?: string }> {
        return this.provider.analyzeSection(observation, persona, sectionLabel);
    }

    async generateSummary(prompt: string): Promise<string> {
        return this.provider.generateSummary(prompt);
    }
}
