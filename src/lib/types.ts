export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string | null
                    plan_tier: 'free' | 'pro' | 'team' | null
                    stripe_customer_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    name?: string | null
                    plan_tier?: 'free' | 'pro' | 'team' | null
                    stripe_customer_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string | null
                    plan_tier?: 'free' | 'pro' | 'team' | null
                    stripe_customer_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            projects: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    target_url: string
                    requires_auth: boolean | null
                    auth_credentials: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    target_url: string
                    requires_auth?: boolean | null
                    auth_credentials?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    target_url?: string
                    requires_auth?: boolean | null
                    auth_credentials?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            persona_configs: {
                Row: {
                    id: string
                    project_id: string
                    name: string
                    age_range: string | null
                    geolocation: string | null
                    tech_literacy: 'low' | 'medium' | 'high' | null
                    goal_prompt: string
                    ai_system_prompt: string | null
                    domain_familiarity: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    name: string
                    age_range?: string | null
                    geolocation?: string | null
                    tech_literacy?: 'low' | 'medium' | 'high' | null
                    goal_prompt: string
                    ai_system_prompt?: string | null
                    domain_familiarity?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    name?: string
                    age_range?: string | null
                    geolocation?: string | null
                    tech_literacy?: 'low' | 'medium' | 'high' | null
                    goal_prompt?: string
                    ai_system_prompt?: string | null
                    domain_familiarity?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            test_runs: {
                Row: {
                    id: string
                    project_id: string
                    status: 'pending' | 'running' | 'completed' | 'failed' | null
                    started_at: string | null
                    completed_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    status?: 'pending' | 'running' | 'completed' | 'failed' | null
                    started_at?: string | null
                    completed_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    status?: 'pending' | 'running' | 'completed' | 'failed' | null
                    started_at?: string | null
                    completed_at?: string | null
                    created_at?: string
                }
            }
            persona_sessions: {
                Row: {
                    id: string
                    test_run_id: string
                    persona_config_id: string
                    status: 'queued' | 'running' | 'completed' | 'abandoned' | 'error' | null
                    exit_reason: string | null
                    started_at: string | null
                    completed_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    test_run_id: string
                    persona_config_id: string
                    status?: 'queued' | 'running' | 'completed' | 'abandoned' | 'error' | null
                    exit_reason?: string | null
                    started_at?: string | null
                    completed_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    test_run_id?: string
                    persona_config_id?: string
                    status?: 'queued' | 'running' | 'completed' | 'abandoned' | 'error' | null
                    exit_reason?: string | null
                    started_at?: string | null
                    completed_at?: string | null
                    created_at?: string
                }
            }
            session_logs: {
                Row: {
                    id: string
                    session_id: string
                    step_number: number
                    current_url: string
                    screenshot_url: string | null
                    emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight' | null
                    emotion_score: number | null
                    inner_monologue: string | null
                    action_taken: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    step_number: number
                    current_url: string
                    screenshot_url?: string | null
                    emotion_tag?: 'neutral' | 'confusion' | 'frustration' | 'delight' | null
                    emotion_score?: number | null
                    inner_monologue?: string | null
                    action_taken?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    step_number?: number
                    current_url?: string
                    screenshot_url?: string | null
                    emotion_tag?: 'neutral' | 'confusion' | 'frustration' | 'delight' | null
                    emotion_score?: number | null
                    inner_monologue?: string | null
                    action_taken?: Json | null
                    created_at?: string
                }
            }
        }
    }
}
