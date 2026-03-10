export type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail';

export interface Action {
    type: ActionType;
    selector?: string;
    text?: string;
    reasoning: string;
    emotional_state: string;
    current_url?: string; // The URL where this action was taken
    ux_feedback?: string; // Qualitative feedback about the current screen
    possible_paths?: string[]; // Potential navigational paths identified in this step
}

export interface Observation {
    screenshot: string; // Base64
    url: string;
    title: string;
    domContext?: string;
    dimensions: { width: number; height: number };
}

export interface PersonaProfile {
    name: string;
    age_range: string;
    geolocation: string;
    tech_literacy: 'low' | 'medium' | 'high';
    domain_familiarity: string;
    goal_prompt: string;
}

export interface LLMProvider {
    decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[]): Promise<Action>;
    generateSummary(prompt: string): Promise<string>;
}
