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
        history.slice(-4).map(a => ({
            t: a.type,
            s: a.selector,
            url: a.current_url,
            r: a.reasoning?.slice(0, 60)
        }))
    );
}

/** Truncate DOM context to a max number of elements and chars. */
function truncateDom(domContext: string | undefined, maxElements = 40, maxChars = 2000): string {
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
    history: Action[]
): string {
    const lastAction = history[history.length - 1];
    const isStuck = lastAction &&
        (lastAction.type === 'click' || lastAction.type === 'type') &&
        lastAction.current_url === observation.url;
    const stuckNote = isStuck
        ? `⚠️ STUCK: Last ${lastAction.type} on ${lastAction.selector || '?'} did not navigate. Try something different.\n`
        : '';

    return `You are ${persona.name}, a synthetic user (tech: ${persona.tech_literacy}).
Goal: ${persona.goal_prompt}
URL: ${observation.url}
${stuckNote}
DOM (interactive elements, capped): ${truncateDom(observation.domContext)}
History (last 4): ${trimHistory(history)}

Reason as your persona — show emotions. Think: 1)What do you see? 2)What are your options? 3)What will you do?
Rules: Never repeat a selector that didn't change the URL. Prefer scroll/different element when stuck. Max 1 wait per 5 steps.
If goal reached → complete. If totally stuck → fail.

Return JSON: { "type","selector"?,"text"?,"reasoning","emotional_state","ux_feedback","possible_paths":[] }`;
}

// ─── Providers ────────────────────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history);

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

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history);

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

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history);
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

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        return this.provider.decideNextAction(observation, persona, history);
    }

    async generateSummary(prompt: string): Promise<string> {
        return this.provider.generateSummary(prompt);
    }
}
