export type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail';

export type UXEmotion = 'delight' | 'satisfaction' | 'curiosity' | 'surprise' | 'neutral' | 'confusion' | 'boredom' | 'frustration' | 'disappointment';

export interface Action {
    type: ActionType;
    selector?: string;
    text?: string;
    reasoning: string;
    emotional_state: UXEmotion | string;
    emotional_intensity: number; // 0.0 to 1.0
    current_url?: string; // The URL where this action was taken
    ux_feedback?: string; // Qualitative feedback about the current screen
    proposed_solution?: string; // Actionable advice if friction is detected
    specific_emotion?: string; // More nuanced emotion label (e.g. 'cautious optimism')
    possible_paths?: string[]; // Potential navigational paths identified in this step
}

export interface Archetype {
    id: string;
    icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
    desc: string;
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

export interface HeuristicMetrics {
    broken_links: string[];
    navigation_latency: number[]; // MS
    request_failures: number;
    action_latency: number[]; // MS for Stagehand acts
    last_load_time: number;
}

export interface LLMProvider {
    decideNextAction(observation: Observation, persona: PersonaProfile, history: Action[], blacklist?: string[], triedElements?: string[]): Promise<Action>;
    analyzeSection(observation: Observation, persona: PersonaProfile, sectionLabel: string): Promise<{
        ux_feedback: string,
        emotional_state: string,
        emotional_intensity: number,
        proposed_solution?: string
    }>;
    generateSummary(prompt: string): Promise<string>;
    generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]>;
    suggestArchetypes(siteContext: string): Promise<Archetype[]>;
}
