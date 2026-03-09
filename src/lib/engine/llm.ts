import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Observation, Action, PersonaProfile, LLMProvider } from './types';

const ActionSchema = z.object({
    type: z.enum(['click', 'type', 'scroll', 'wait', 'complete', 'fail']),
    selector: z.string().optional().describe('Selector index in [index] format'),
    text: z.string().optional().describe('Text to type if action is type'),
    reasoning: z.string().describe('Inner monologue of the persona'),
    emotional_state: z.string().describe('Current emotion (e.g., frustrated, excited, curious)'),
    ux_feedback: z.string().describe('Qualitative feedback about the current screen based on the persona'),
    possible_paths: z.array(z.string()).describe('Summary of possible navigational paths identified from the DOM')
});

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const lastAction = history[history.length - 1];
        const isStuck = lastAction && (lastAction.type === 'click' || lastAction.type === 'type') && lastAction.current_url === observation.url;
        const stuckWarning = isStuck ? `⚠️ STUCK WARNING: Your last action (${lastAction.type} ${lastAction.selector || ''}) did NOT change the page URL. Try a DIFFERENT element or scroll. Do NOT repeat the same click.\n` : '';

        const systemPrompt = `You are a synthetic user testing a website. 
        Your persona:
        Name: ${persona.name}
        Goal: ${persona.goal_prompt}
        Tech Literacy: ${persona.tech_literacy}
        
        You will receive a screenshot and a list of your past actions.
        The screenshot has red labels with numbers like [0], [1], etc. on interactive elements.
        
        DOM Context (Interactable Elements):
        ${observation.domContext}
        
        To click or type on an element, use the label in the selector field, e.g., "[15]".
        
        BEHAVIORAL REQUIREMENTS:
        - In your "reasoning", don't just say what you are doing. Explain WHY based on your persona.
        - If you have low tech literacy, show your confusion or preference for large, obvious buttons.
        - If you are an expert, mention if you feel the UI is slow or the information architecture is off.
        - Decision making should reflect your emotional state.
        
        STRUCTURED THINKING REQUIREMENT:
        In your "reasoning" field, you MUST follow this 3-step structure:
        1. [VISUAL AWARENESS]: Describe what you see in the screenshot.
        2. [CODE OVERVIEW]: Analyze the interactive elements in the DOM context.
        3. [ACTION INTENT]: Decide your action based on steps 1 and 2.
        
        REPETITIVE ACTION PREVENTION:
        - Review your "Past actions". If you clicked a selector and the "current_url" stayed the same, that action failed to navigate.
        - You MUST NOT repeat an action that recently failed to change the page state. Try a different button or scroll.
        - NOTE: If you don't see an element you previously tried, it has been HIDDEN by the engine because it was found to be non-functional for your goal. Explore other options.
        
        Decide your next action based on your persona, the visual state, and the DOM context.
        If you have reached your goal, use action "complete".
        If you are stuck or can't find what you need, use action "fail".`;

        const response = await this.client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: `Current URL: ${observation.url}\nPast actions:\n${JSON.stringify(history.slice(-5))}\n\n${stuckWarning}` },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/jpeg;base64,${observation.screenshot}` }
                        }
                    ]
                }
            ],
            response_format: zodResponseFormat(ActionSchema, "action")
        });

        const choice = response.choices[0].message.content;
        if (!choice) throw new Error('No response from LLM');

        return JSON.parse(choice) as Action;
    }
}

export class GeminiProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey?: string) {
        const key = apiKey || process.env.GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(key);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const lastAction = history[history.length - 1];
        const isStuck = lastAction && (lastAction.type === 'click' || lastAction.type === 'type') && lastAction.current_url === observation.url;
        const stuckWarning = isStuck ? `⚠️ STUCK WARNING: Your last action (${lastAction.type} ${lastAction.selector || ''}) did NOT change the page URL. Try a DIFFERENT element or scroll. Do NOT repeat the same click.\n` : '';

        const prompt = `You are a synthetic user testing a website. 
        Your persona:
        Name: ${persona.name}
        Goal: ${persona.goal_prompt}
        Tech Literacy: ${persona.tech_literacy}
        
        Current URL: ${observation.url}
        Past actions: ${JSON.stringify(history.slice(-5))}
        
        ${stuckWarning}
        
        DOM Context (Interactable Elements):
        ${observation.domContext}
        
        The provided image is a screenshot of the website with red labels [ID] on interactive elements.
        To interact, specify the type and the selector (e.g., "[15]").
        
        BEHAVIORAL REQUIREMENTS:
        - In your "reasoning", explain your thought process using your persona's perspective.
        - If you're frustrated, let it show in your reasoning and emotional_state.
        - Be specific about what UI elements draw your attention or confuse you.
        
        STRUCTURED THINKING REQUIREMENT:
        In your "reasoning" field, you MUST follow this 3-step structure:
        1. [VISUAL AWARENESS]: Describe what you see in the screenshot.
        2. [CODE OVERVIEW]: Analyze the interactive elements in the DOM context.
        3. [ACTION INTENT]: Decide your action based on steps 1 and 2.
        
        AUTONOMOUS PROACTIVITY:
        - Do NOT use "wait" more than once per 5 steps. If you are confused, you MUST scroll or click to discover more.
        - Avoid analysis paralysis.
        
        REPETITIVE ACTION PREVENTION:
        - If "Past actions" show you clicked a selector and the "current_url" did not change, DO NOT click it again. 
        - You MUST choose a different interactable element or scroll to find new options.
        - NOTE: Non-functional elements may be masked/hidden from your view to prevent loops.
        
        Return a valid JSON object following this structure:
        {
            "type": "click" | "type" | "scroll" | "wait" | "complete" | "fail",
            "selector": "string (optional)",
            "text": "string (optional)",
            "reasoning": "string",
            "emotional_state": "string"
        }`;

        console.time('gemini_generate');
        const result = await this.model.generateContent([
            prompt,
            {
                inlineData: {
                    data: observation.screenshot,
                    mimeType: "image/jpeg"
                }
            }
        ]);
        console.timeEnd('gemini_generate');

        const response = await result.response;
        const text = response.text();
        return JSON.parse(text) as Action;
    }
}

export class OllamaProvider implements LLMProvider {
    private host: string;
    private models: string[];

    constructor() {
        this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const modelStr = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || 'llava, llama3.2-vision:latest';
        this.models = modelStr.split(',').map(m => m.trim());
    }

    private async fetchWithRetry(model: string, prompt: string, screenshot: string, signal: AbortSignal, retries = 2): Promise<any> {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(`${this.host}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model,
                        prompt: prompt,
                        images: [screenshot],
                        stream: false,
                        format: 'json'
                    }),
                    signal: signal
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'No error body');
                    throw new Error(`Ollama error (${response.status}): ${errorText || response.statusText}`);
                }

                return await response.json();
            } catch (err: any) {
                if (i === retries || err.name === 'AbortError') throw err;
                const delay = Math.pow(2, i) * 1000;
                console.warn(`⚠️ Model ${model} failed (attempt ${i + 1}/${retries + 1}), retrying in ${delay}ms...`, err.message);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const lastAction = history[history.length - 1];
        const isStuck = lastAction && (lastAction.type === 'click' || lastAction.type === 'type') && lastAction.current_url === observation.url;
        const stuckWarning = isStuck ? `⚠️ STUCK WARNING: Your last action (${lastAction.type} ${lastAction.selector || ''}) did NOT change the page URL. Try a DIFFERENT element or scroll. Do NOT repeat the same click.\n` : '';

        const prompt = `You are a synthetic user testing a website. 
        Your persona:
        Name: ${persona.name}
        Goal: ${persona.goal_prompt}
        Tech Literacy: ${persona.tech_literacy}
        
        Current URL: ${observation.url}
        Past actions: ${JSON.stringify(history.slice(-5))}
        
        ${stuckWarning}
        
        DOM Context (Interactable Elements):
        ${observation.domContext}
        
        The provided image is a screenshot of the website with red labels [ID] on interactive elements.
        
        INSTRUCTIONS:
        - Reason like your persona.
        - STRUCTURED THINKING REQUIREMENT:
        In your "reasoning" field, you MUST follow this 3-step structure:
        1. [VISUAL AWARENESS]: Describe what you see in the screenshot.
        2. [CODE OVERVIEW]: Analyze the interactive elements in the DOM context.
        3. [ACTION INTENT]: Decide your action based on steps 1 and 2.
        
        REPETITIVE ACTION PREVENTION:
        - Look at your "Past actions". If you already tried a selector and you are still on the same "current_url", it didn't work.
        - Do NOT repeat failed actions. Try a different path.
        - NOTE: Elements that fail to progress the session are automatically HIDDEN to help you focus on alternative paths.
        
        Return a valid JSON object ONLY:
        {
            "type": "click" | "type" | "scroll" | "wait" | "complete" | "fail",
            "selector": "string (optional)",
            "text": "string (optional)",
            "reasoning": "string",
            "emotional_state": "string"
        }`;

        console.log(`🤖 Starting Multi-Model Pulse (${this.models.length} models)...`);
        console.time('multi_model_total');

        let results: ({ model: string, action: Action } | null)[] = [];

        try {
            // Attempt 1: Parallel Pulse
            results = await Promise.all(this.models.map(async (model) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min for parallel

                try {
                    const data = await this.fetchWithRetry(model, prompt, observation.screenshot, controller.signal);
                    clearTimeout(timeoutId);
                    const parsed = JSON.parse(data.response) as Action;
                    return { model, action: parsed };
                } catch (err: any) {
                    console.error(`❌ Parallel Model ${model} failed:`, err.message);
                    return null;
                }
            }));
        } catch (err) {
            console.warn('Critical parallel pulse failure, falling back to sequential...');
        }

        const validResults = results.filter((r): r is { model: string, action: Action } => r !== null);

        // Attempt 2: Sequential Failover (if parallel pulse yielded nothing)
        if (validResults.length === 0) {
            console.warn('⚠️ All parallel models failed. Starting Sequential Failover...');
            for (const model of this.models) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min for sequential

                try {
                    console.log(`🧠 Sequential backup attempt with ${model}...`);
                    const data = await this.fetchWithRetry(model, prompt, observation.screenshot, controller.signal);
                    clearTimeout(timeoutId);
                    const parsed = JSON.parse(data.response) as Action;
                    validResults.push({ model, action: parsed });
                    break; // Exit after first successful backup
                } catch (err: any) {
                    console.error(`❌ Sequential Model ${model} failed:`, err.message);
                }
            }
        }

        console.timeEnd('multi_model_total');

        if (validResults.length === 0) throw new Error('All Ollama models failed (including Sequential Failover)');

        return this.synthesize(validResults);
    }

    private synthesize(results: { model: string, action: Action }[]): Action {
        // Simple consensus: take the first one as primary for the physical action, but merge qualitative data
        const primary = results[0].action;

        let collectiveReasoning = results.map(r => `[${r.model}]: ${r.action.reasoning}`).join('\n\n');
        let collectiveUX = results.map(r => `[${r.model}]: ${r.action.ux_feedback}`).join('\n\n');

        // Flatten and deduplicate possible paths
        const allPaths = Array.from(new Set(results.flatMap(r => r.action.possible_paths || [])));

        // If we have multiple models, use a meta-reasoning header
        if (results.length > 1) {
            collectiveReasoning = `Multi-Model Consensus Results:\n\n${collectiveReasoning}`;
            collectiveUX = `Unified UX Feedback:\n\n${collectiveUX}`;
        }

        return {
            ...primary,
            reasoning: collectiveReasoning,
            ux_feedback: collectiveUX,
            possible_paths: allPaths
        };
    }
}

// Factory or switcher logic
export class LLMService {
    private provider: LLMProvider;

    constructor(config?: { provider: 'ollama' | 'gemini' | 'openai', apiKey?: string }) {
        const providerType = config?.provider || 'ollama';

        if (providerType === 'gemini') {
            this.provider = new GeminiProvider(config?.apiKey);
        } else if (providerType === 'openai') {
            this.provider = new OpenAIProvider(); // We'll update this if needed later
        } else {
            this.provider = new OllamaProvider();
        }
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        return this.provider.decideNextAction(observation, persona, history);
    }
}
