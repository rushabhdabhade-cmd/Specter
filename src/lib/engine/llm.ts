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
    emotional_state: z.string(),
    ux_feedback: z.string(),
    possible_paths: z.array(z.string())
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
    blockedPaths: string[] = []
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

    return `You are ${persona.name}, a synthetic user (tech literacy: ${persona.tech_literacy}).
Goal: ${persona.goal_prompt}
Current URL: ${observation.url}
${stuckNote}

VISUAL GUIDANCE:
The provided image has indigo labels like [0], [1], etc. these correspond EXACTLY to the "index" in the JSON below.

INTERACTIVE ELEMENTS (JSON):
${truncateDom(observation.domContext)}

HISTORY (Last 10):
${trimHistory(history)}

${blockedPaths.length > 0 ? `🚫 PREVIOUSLY FAILED PATHS (Identity: Text:URL):
${blockedPaths.join('\n')}\n` : ''}

TASK:
1) Analyze the screenshot and JSON. Note the location of labels.
2) Use IDs/Classes in the JSON to identify structural components (e.g., "login-btn").
3) Decide the NEXT action to move toward your goal.
4) Provide qualitative UX feedback in 'ux_feedback'.

Rules:
- [CRITICAL] ALWAYS use the labels in brackets, e.g., "[index]", for the 'selector' field. 
- [FORBIDDEN] Do NOT use CSS selectors, IDs, or classes in the 'selector' field.
- Do NOT attempt any elements that match the FAILED PATHS listed above (even if they have a different index now).
- Never repeat an index click that didn't change the state/URL.
- Max 1 wait per 5 actions.

EMOTIONAL STATE:
- Delight: High satisfaction. Use this if navigation is fast, clear, matches your expectation, or feels premium. **Mandatory if you describe the step as "clear", "straightforward", "logical", or "easy".**
- Neutral: Standard interaction with no specific positive or negative feedback.
- Confusion: Lost, unsure where to click, or UI is ambiguous.
- Frustration: Stuck, broken UI, repeated failures, or loops.

[CRITICAL] Reward smooth, logical navigation by selecting 'Delight'. 
[CRITICAL] If you state that the UI is "clear" or "straightforward" in your reasoning/feedback, you MUST return 'delight' in the 'emotional_state' field.

Return JSON: { "type","selector"?,"text"?,"reasoning","emotional_state","ux_feedback","possible_paths":[] }`;
}

// ─── Providers ────────────────────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist);

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a synthetic UX persona navigating a website. Always return valid JSON.' },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${observation.screenshot}` } }
                    ]
                }
            ],
            response_format: zodResponseFormat(ActionSchema, 'action')
        });

        const choice = response.choices[0].message.content;
        if (!choice) throw new Error('No response from OpenAI');
        return JSON.parse(choice) as Action;
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

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist);

        const screenshotSize = observation.screenshot?.length || 0;
        if (screenshotSize < 100) {
            console.warn('⚠️ Screenshot too small:', screenshotSize, 'bytes');
        }

        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const content: any[] = [prompt];
                if (screenshotSize > 100) {
                    content.push({ inlineData: { data: observation.screenshot, mimeType: 'image/jpeg' } });
                }

                const result = await model.generateContent(content);
                const response = await result.response;
                if (response) {
                    return JSON.parse(response.text()) as Action;
                }
            } catch (err: any) {
                lastError = err;
                console.error(`❌ Gemini ${modelName} failed:`, err.message);
            }
        }

        throw lastError || new Error('All Gemini models failed');
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
                console.error(`❌ Gemini summary ${modelName} failed:`, err.message);
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

    private async fetchWithRetry(model: string, prompt: string, screenshot: string, signal: AbortSignal, retries = 2): Promise<any> {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(`${this.host}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        prompt,
                        images: screenshot ? [screenshot] : [],
                        stream: false,
                        format: 'json'
                    }),
                    signal
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'No error body');
                    throw new Error(`Ollama error (${response.status}): ${errorText}`);
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

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = []): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist);
        console.log(`🤖 Ollama inference (${this.models.join(', ')})...`);
        console.time('inference_total');

        let validResults: { model: string, action: Action }[] = [];

        try {
            const results = await Promise.all(this.models.map(async (model) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 300000);
                try {
                    const data = await this.fetchWithRetry(model, prompt, observation.screenshot, controller.signal);
                    clearTimeout(timeoutId);
                    return { model, action: JSON.parse(data.response) as Action };
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
                    const data = await this.fetchWithRetry(model, prompt, observation.screenshot, controller.signal);
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

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist: string[] = []): Promise<Action> {
        return this.provider.decideNextAction(observation, persona, history, blacklist);
    }

    async generateSummary(prompt: string): Promise<string> {
        return this.provider.generateSummary(prompt);
    }
}
