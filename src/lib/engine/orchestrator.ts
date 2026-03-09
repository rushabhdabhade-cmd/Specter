import { createAdminClient } from '../supabase/admin';
import { BrowserService } from './browser';
import { LLMService } from './llm';
import { Action, PersonaProfile } from './types';
import { decrypt } from '../utils/vault';
import { checkAndFinalizeTestRun } from './reporter';

export class Orchestrator {
    private browser: BrowserService;
    private llm!: LLMService;
    private supabase = createAdminClient();

    constructor() {
        this.browser = new BrowserService();
    }

    async runSession(sessionId: string, url: string, persona: PersonaProfile) {
        console.log(`🚀 Starting session ${sessionId} for ${persona.name} on ${url}`);
        let testRunId: string | undefined;

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

            testRunId = sessionData.test_run_id;
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

            // Speed up: Update session status to running
            this.updateLiveStatus(sessionId, 'Initializing engine & preparing browser container...');
            await (this.supabase.from('persona_sessions') as any).update({
                status: 'running',
                started_at: new Date().toISOString(),
                is_paused: executionMode === 'manual'
            }).eq('id', sessionId);

            let stepNumber = 1;

            // Log: Browser Initialization
            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: stepNumber++,
                current_url: url,
                emotion_tag: 'neutral',
                inner_monologue: 'Initializing browser engine and preparing clean session container...',
                action_taken: { type: 'system', info: 'browser_init' } as any
            });

            this.updateLiveStatus(sessionId, 'Starting Chromium instance...');
            await this.browser.init();

            // Log: Navigation
            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: stepNumber++,
                current_url: url,
                emotion_tag: 'neutral',
                inner_monologue: `Navigating to target URL: ${url}`,
                action_taken: { type: 'system', info: 'navigate' } as any
            });

            this.updateLiveStatus(sessionId, `Navigating to ${url}...`);
            await this.browser.navigate(url);

            const history: Action[] = [];
            const maxSteps = 15;
            let consecutiveSameActions = 0;
            let lastActionKey = '';
            const selectorAttempts = new Map<string, number>();
            const blacklist = new Set<string>();

            while (stepNumber <= maxSteps) {
                // Check if session has been stopped externally
                const { data: latestSession } = await (this.supabase.from('persona_sessions') as any)
                    .select('status')
                    .eq('id', sessionId)
                    .single();

                if (latestSession?.status === 'abandoned' || latestSession?.status === 'completed') {
                    console.log(`🛑 Stop signal detected for session ${sessionId}. Exiting...`);
                    this.updateLiveStatus(sessionId, 'Test run manually stopped by user.');
                    await (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: stepNumber,
                        current_url: url, // Use the initial url here
                        emotion_tag: 'neutral',
                        inner_monologue: 'Session stop signal received. Gracefully shutting down...',
                        action_taken: { type: 'system', info: 'manual_stop' } as any
                    });
                    break;
                }

                // If in manual mode, write/wait for step signal...
                if (executionMode === 'manual') {
                    this.updateLiveStatus(sessionId, 'Waiting for your command (Manual Mode)...');
                    console.log(`⏸️ Session ${sessionId} paused. Waiting for step signal...`);
                    await this.waitForStepSignal(sessionId);
                }

                // Perception Phase
                this.updateLiveStatus(sessionId, `Step ${stepNumber}: Step 1 - Capturing Visual State...`);
                console.log(`📸 Observing step ${stepNumber}...`);
                const observation = await this.browser.observe(Array.from(blacklist));
                // Cognition Phase
                this.updateLiveStatus(sessionId, `Step ${stepNumber}: Step 2 - Multi-Model Consensus Analysis...`);
                console.log(`🧠 Deciding next action (Multi-Model)...`);

                // Filter DOM Context to remove blacklisted items
                let filteredDomContext = observation.domContext || '[]';
                if (blacklist.size > 0 && observation.domContext) {
                    try {
                        const elements = JSON.parse(observation.domContext);
                        const filtered = elements.filter((el: any) => {
                            const selector = `[${el.index}]`;
                            return !blacklist.has(selector);
                        });
                        filteredDomContext = JSON.stringify(filtered);
                        console.log(`🛡️ Blacklist active: Hiding ${elements.length - filtered.length} elements from AI.`);
                    } catch (e) {
                        console.error('Failed to filter blacklisted elements:', e);
                    }
                }

                const filteredObservation = { ...observation, domContext: filteredDomContext };
                let action = await this.llm.decideNextAction(filteredObservation, persona, history);

                const currentActionKey = action.type === 'wait' || action.type === 'scroll'
                    ? action.type
                    : `${action.type}-${action.selector || ''}`;

                if (currentActionKey === lastActionKey && (['click', 'type', 'wait', 'scroll'].includes(action.type))) {
                    consecutiveSameActions++;
                } else {
                    consecutiveSameActions = 0;
                    lastActionKey = currentActionKey;
                }

                // Cycle Detection (V8 Enhancement)
                const actionHistory = history.map(h => h.type === 'wait' || h.type === 'scroll' ? h.type : `${h.type}-${h.selector || ''}`);
                const isCycle = actionHistory.length >= 4 &&
                    actionHistory[actionHistory.length - 1] === actionHistory[actionHistory.length - 3] &&
                    actionHistory[actionHistory.length - 2] === currentActionKey;

                const loopThreshold = action.type === 'wait' ? 2 : 3;
                if (consecutiveSameActions >= loopThreshold || isCycle) {
                    const reason = isCycle ? 'Cycle detected (A-B-A-B)' : 'Repetitive action detected';
                    this.updateLiveStatus(sessionId, `Engine detected loop (${reason})! Forcing recovery scroll...`);
                    console.log(`🔄 Loop detected (${reason}) for session ${sessionId}! Forcing manual recovery action...`);
                    action = {
                        type: 'scroll',
                        reasoning: `I've detected a ${isCycle ? 'repetitive cycle' : 'loop'}. I'll scroll to see if new context appears and break the pattern.`,
                        emotional_state: 'frustrated'
                    };
                    consecutiveSameActions = 0; // reset
                    (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: stepNumber,
                        current_url: observation.url,
                        emotion_tag: 'frustration',
                        inner_monologue: 'Loop detected. Forcing a scroll to break cycle.',
                        action_taken: { type: 'system', info: 'loop_breaker_scroll' } as any
                    }).then(() => { });
                }

                console.log(`🎭 Action: ${action.type} ${action.selector || ''} (${action.emotional_state})`);
                this.updateLiveStatus(sessionId, `Intent: ${action.reasoning.slice(0, 80)}...`);

                // Log step to Supabase (Non-blocking)
                (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber,
                    current_url: observation.url,
                    screenshot_url: `data:image/jpeg;base64,${observation.screenshot}`,
                    emotion_tag: this.mapEmotion(action.emotional_state),
                    emotion_score: 5,
                    inner_monologue: action.reasoning,
                    action_taken: action as any
                }).then(({ error: logError }: { error: any }) => {
                    if (logError) console.error(`❌ Failed to log step ${stepNumber}:`, logError);
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

                // Execution Phase
                this.updateLiveStatus(sessionId, `Performing: ${action.type} ${action.selector || ''}`);
                await this.browser.perform(action);

                // Track selector attempts for blacklisting (V5 Hardening)
                if (action.type === 'click' && action.selector) {
                    const attemptKey = `${observation.url}:${action.selector}`;
                    const attempts = (selectorAttempts.get(attemptKey) || 0) + 1;
                    selectorAttempts.set(attemptKey, attempts);

                    if (attempts >= 3) {
                        console.warn(`🚫 Selector ${action.selector} blacklisted on ${observation.url} after 3 attempts.`);
                        blacklist.add(action.selector);
                    }
                }

                action.current_url = observation.url; // Save context for next step
                history.push(action);
                stepNumber++;

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

        } catch (err: any) {
            console.error(`❌ Session ${sessionId} failed:`, err.message);

            // Log specific error to session logs
            (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: 999,
                action_type: 'error',
                inner_monologue: `Critical engine failure: ${err.message}`,
                emotion_tag: 'frustration',
                metadata: { error_stack: err.stack }
            }).then(() => { });

            this.updateLiveStatus(sessionId, `Critical Failure: ${err.message.slice(0, 50)}...`);
            await (this.supabase.from('persona_sessions') as any).update({
                status: 'error',
                error_message: err.message
            }).eq('id', sessionId);
        } finally {
            await this.browser.close();
            if (testRunId) {
                await checkAndFinalizeTestRun(testRunId).catch(err => {
                    console.error('Finalization check failed:', err);
                });
            }
        }
    }

    private async updateLiveStatus(sessionId: string, status: string) {
        (this.supabase.from('persona_sessions') as any)
            .update({ live_status: status })
            .eq('id', sessionId)
            .then(() => { });
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
