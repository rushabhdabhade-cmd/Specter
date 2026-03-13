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

export interface ObservationSection {
    screenshot: string;
    domContext: string;
}

export interface Observation {
    screenshot: string; // Current or main screenshot (base64)
    screenshots?: string[]; // DEPRECATED: use sections
    url: string;
    title: string;
    domContext?: string; // Current or main dom context
    dimensions: { width: number; height: number };
    sections?: ObservationSection[];
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
    decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist?: string[], triedElements?: string[]): Promise<Action>;
    analyzeSection(observation: Observation, persona: PersonaProfile, sectionLabel: string): Promise<{ ux_feedback: string }>;
    generateSummary(prompt: string): Promise<string>;
}
