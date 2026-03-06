import { createAdminClient } from '../supabase/admin';
import { BrowserService } from './browser';
import { LLMService } from './llm';
import { Action, PersonaProfile } from './types';
import { decrypt } from '../utils/vault';

export class Orchestrator {
    private browser: BrowserService;
    private llm!: LLMService;
    private supabase = createAdminClient();

    constructor() {
        this.browser = new BrowserService();
    }

    async runSession(sessionId: string, url: string, persona: PersonaProfile) {
        console.log(`🚀 Starting session ${sessionId} for ${persona.name} on ${url}`);

        try {
            // 1. Fetch the actual session and project config
            const { data: sessionData, error: sessionError } = await (this.supabase
                .from('persona_sessions') as any)
                .select('*, persona_configs(*, projects(*))')
                .eq('id', sessionId)
                .single();

            if (sessionError || !sessionData) {
                throw new Error(`Failed to fetch session data: ${sessionError?.message}`);
            }

            const project = sessionData.persona_configs?.projects;
            const executionMode = sessionData?.execution_mode || 'autonomous';

            // 2. Initialize LLM Service with project preference
            const provider = project?.llm_provider || 'ollama';
            let apiKey: string | undefined;

            if (project?.encrypted_llm_key) {
                try {
                    apiKey = decrypt(project.encrypted_llm_key);
                } catch (e) {
                    console.error('Failed to decrypt LLM key:', e);
                }
            }

            this.llm = new LLMService({ provider, apiKey });

            await this.browser.init();
            await this.browser.navigate(url);

            const history: Action[] = [];
            let stepNumber = 1;
            const maxSteps = 15;

            // Update session status to running
            await (this.supabase.from('persona_sessions') as any).update({
                status: 'running',
                started_at: new Date().toISOString(),
                is_paused: executionMode === 'manual'
            }).eq('id', sessionId);

            while (stepNumber <= maxSteps) {
                // If in manual mode, wait for the user to click "Next Step"
                if (executionMode === 'manual') {
                    console.log(`⏸️ Session ${sessionId} paused. Waiting for step signal...`);
                    await this.waitForStepSignal(sessionId);
                }

                console.log(`📸 Observering step ${stepNumber}...`);
                const observation = await this.browser.observe();

                console.log(`🧠 Deciding next action...`);
                const action = await this.llm.decideNextAction(observation, persona, history);

                console.log(`🎭 Action: ${action.type} ${action.selector || ''} (${action.emotional_state})`);

                // Log step to Supabase
                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber,
                    current_url: observation.url,
                    screenshot_url: null,
                    emotion_tag: this.mapEmotion(action.emotional_state),
                    emotion_score: 5,
                    inner_monologue: action.reasoning,
                    action_taken: action as any
                });

                if (action.type === 'complete' || action.type === 'fail') {
                    await (this.supabase.from('persona_sessions') as any).update({
                        status: action.type === 'complete' ? 'completed' : 'abandoned',
                        completed_at: new Date().toISOString(),
                        exit_reason: action.reasoning,
                        is_paused: false
                    }).eq('id', sessionId);
                    break;
                }

                await this.browser.perform(action);
                history.push(action);
                stepNumber++;

                // Pause again for the next step if in manual mode
                if (executionMode === 'manual') {
                    await (this.supabase.from('persona_sessions') as any).update({
                        is_paused: true,
                        step_requested: false
                    }).eq('id', sessionId);
                }
            }

            if (stepNumber > maxSteps) {
                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'abandoned',
                    completed_at: new Date().toISOString(),
                    exit_reason: 'Maximum steps reached'
                }).eq('id', sessionId);
            }

        } catch (error: any) {
            console.error(`❌ Session ${sessionId} failed:`, error);
            await (this.supabase.from('persona_sessions') as any).update({
                status: 'error',
                exit_reason: error.message
            }).eq('id', sessionId);
        } finally {
            await this.browser.close();
        }
    }

    private async waitForStepSignal(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                clearInterval(interval);
                reject(new Error('Manual step timeout reached (10 minutes)'));
            }, 10 * 60 * 1000);

            const interval = setInterval(async () => {
                const { data: session, error } = await (this.supabase.from('persona_sessions') as any)
                    .select('step_requested')
                    .eq('id', sessionId)
                    .single();

                if (error) {
                    console.error('Error polling for step signal:', error);
                    return;
                }

                if (session?.step_requested) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    console.log(`🚀 Step signal received for session ${sessionId}`);
                    resolve();
                }
            }, 2000);
        });
    }

    private mapEmotion(state: string): 'neutral' | 'confusion' | 'frustration' | 'delight' {
        const s = state.toLowerCase();
        if (s.includes('happy') || s.includes('delight') || s.includes('excited')) return 'delight';
        if (s.includes('frustrat') || s.includes('angry') || s.includes('stuck')) return 'frustration';
        if (s.includes('confus') || s.includes('lost') || s.includes('where')) return 'confusion';
        return 'neutral';
    }
}
