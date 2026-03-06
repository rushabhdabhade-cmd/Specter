import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
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
        To click or type on an element, use the label in the selector field, e.g., "[15]".
        
        Decide your next action based on your persona and the visual state.
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

// Factory or switcher logic
export class LLMService {
    private provider: LLMProvider;

    constructor(providerType: 'openai' | 'ollama' = 'openai') {
        if (providerType === 'openai') {
            this.provider = new OpenAIProvider();
        } else {
            throw new Error(`Provider ${providerType} not implemented yet`);
        }
    }

    async decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action> {
        return this.provider.decideNextAction(observation, persona, history);
    }
}
