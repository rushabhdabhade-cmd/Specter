import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Observation, Action, PersonaProfile, LLMProvider } from './types';

const ActionSchema = z.object({
    type: z.enum(['click', 'type', 'scroll', 'wait', 'complete', 'fail']),
    selector: z.string().optional().describe('CSS selector or label index like [15]'),
    text: z.string().optional().describe('Text to type if action is type'),
    reasoning: z.string().describe('Inner monologue of the persona'),
    emotional_state: z.string().describe('Current emotion (e.g., frustrated, excited, curious)')
});

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
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
                        { type: "text", text: `Current URL: ${observation.url}\nPast actions:\n${JSON.stringify(history)}` },
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
        const prompt = `You are a synthetic user testing a website. 
        Your persona:
        Name: ${persona.name}
        Goal: ${persona.goal_prompt}
        Tech Literacy: ${persona.tech_literacy}
        
        Current URL: ${observation.url}
        Past actions: ${JSON.stringify(history)}
        
        DOM Context (Interactable Elements):
        ${observation.domContext}
        
        The provided image is a screenshot of the website with red labels [ID] on interactive elements.
        To interact, specify the type and the selector (e.g., "[15]").
        
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
    private model: string;

    constructor() {
        this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'llava';
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        const prompt = `You are a synthetic user testing a website. 
        Your persona:
        Name: ${persona.name}
        Goal: ${persona.goal_prompt}
        Tech Literacy: ${persona.tech_literacy}
        
        Current URL: ${observation.url}
        Past actions: ${JSON.stringify(history)}
        
        DOM Context (Interactable Elements):
        ${observation.domContext}
        
        The provided image is a screenshot of the website with red labels [ID] on interactive elements.
        Return a valid JSON object ONLY:
        {
            "type": "click" | "type" | "scroll" | "wait" | "complete" | "fail",
            "selector": "string (optional)",
            "text": "string (optional)",
            "reasoning": "string",
            "emotional_state": "string"
        }`;

        console.log(`🤖 Requesting Ollama assist at ${this.host}... (Model: ${this.model})`);
        console.time('ollama_generate');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for local LLM

        try {
            console.log(`🧠 Starting Ollama inference (this may take a few minutes on local hardware)...`);
            const response = await fetch(`${this.host}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    images: [observation.screenshot],
                    stream: false,
                    format: 'json'
                }),
                signal: controller.signal
            });

            console.timeEnd('ollama_generate');
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error body');
                throw new Error(`Ollama error (${response.status}): ${errorText || response.statusText}`);
            }

            const data = await response.json();
            return JSON.parse(data.response) as Action;
        } catch (error: any) {
            console.timeEnd('ollama_generate');
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') throw new Error('Ollama request timed out after 2 minutes');
            throw error;
        }
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
