import { createAdminClient } from '../supabase/admin';
import { BrowserService } from './browser';
import { LLMService } from './llm';
import { PersonaProfile, Action, Observation } from './types';
import { generateAndStoreReport, checkAndFinalizeTestRun } from './reporter';
import * as fs from 'fs';
import * as path from 'path';
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
        let testRunId: string | undefined;

        try {
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

            this.updateLiveStatus(sessionId, 'Initializing engine & preparing browser container...');
            await (this.supabase.from('persona_sessions') as any).update({
                status: 'running',
                started_at: new Date().toISOString(),
                is_paused: executionMode === 'manual'
            }).eq('id', sessionId);

            let stepNumber = 1;

            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: stepNumber++,
                current_url: url,
                emotion_tag: 'neutral',
                inner_monologue: 'Initializing browser engine...',
                action_taken: { type: 'system', info: 'browser_init' } as any
            });

            this.updateLiveStatus(sessionId, 'Starting Chromium instance...');
            await this.browser.init();

            this.updateLiveStatus(sessionId, `Navigating to ${url}...`);
            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: stepNumber++,
                current_url: url,
                emotion_tag: 'neutral',
                inner_monologue: `Navigating to target URL: ${url}`,
                action_taken: { type: 'system', info: 'navigate' } as any
            });
            await this.browser.navigate(url);

            // V10: Deep Discovery Phase (Scan and Store)
            console.log('🔍 Starting Deep Discovery Triple-Scan...');
            await this.discoverPageContent(sessionId, stepNumber);
            stepNumber += 3; // Triple scan takes 3 steps

            const history: Action[] = [];
            const maxSteps = 20; // Increased max steps to allow for discovery
            let consecutiveSameActions = 0;
            let lastActionKey = '';
            const selectorAttempts = new Map<string, number>();
            const blacklist = new Set<string>();

            while (stepNumber <= maxSteps) {
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
                        current_url: url,
                        emotion_tag: 'neutral',
                        inner_monologue: 'Session stop signal received. Generating report...',
                        action_taken: { type: 'system', info: 'manual_stop' } as any
                    });

                    if (testRunId) {
                        await generateAndStoreReport(testRunId).catch(e => console.error('Final report failed:', e));
                    }
                    break;
                }

                if (executionMode === 'manual') {
                    this.updateLiveStatus(sessionId, 'Waiting for command (Manual Mode)...');
                    await this.waitForStepSignal(sessionId);
                }

                this.updateLiveStatus(sessionId, `Step ${stepNumber}: Observing Visual State...`);
                const observation = await this.browser.observe(Array.from(blacklist));
                const localScreenshotPath = await this.saveScreenshotLocally(sessionId, stepNumber, observation.screenshot);

                this.updateLiveStatus(sessionId, `Step ${stepNumber}: Deciding next move...`);

                let filteredDomContext = observation.domContext || '[]';
                if (blacklist.size > 0 && observation.domContext) {
                    try {
                        const elements = JSON.parse(observation.domContext);
                        const filtered = elements.filter((el: any) => !blacklist.has(`[${el.index}]`));
                        filteredDomContext = JSON.stringify(filtered);
                    } catch (e) { }
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

                const actionHistory = history.map(h => h.type === 'wait' || h.type === 'scroll' ? h.type : `${h.type}-${h.selector || ''}`);
                const isCycle = actionHistory.length >= 4 &&
                    actionHistory[actionHistory.length - 1] === actionHistory[actionHistory.length - 3] &&
                    actionHistory[actionHistory.length - 2] === currentActionKey;

                if (consecutiveSameActions >= (action.type === 'wait' ? 2 : 3) || isCycle) {
                    this.updateLiveStatus(sessionId, `Engine detected loop! Forcing recovery...`);
                    action = {
                        type: 'scroll',
                        reasoning: `I've detected a loop. I'll scroll to break the pattern.`,
                        emotional_state: 'frustrated'
                    };
                    consecutiveSameActions = 0;
                    await (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: stepNumber,
                        current_url: observation.url,
                        emotion_tag: 'frustration',
                        inner_monologue: 'Loop detected. Forcing a scroll.',
                        action_taken: { type: 'system', info: 'loop_breaker_scroll' } as any
                    });
                    stepNumber++;
                }

                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber,
                    current_url: observation.url,
                    screenshot_url: `data:image/jpeg;base64,${observation.screenshot}`,
                    emotion_tag: this.mapEmotion(action.emotional_state),
                    inner_monologue: action.reasoning,
                    action_taken: { ...action, local_screenshot_path: localScreenshotPath } as any
                });

                if (action.type === 'complete' || action.type === 'fail') {
                    await (this.supabase.from('persona_sessions') as any).update({
                        status: action.type === 'complete' ? 'completed' : 'abandoned',
                        completed_at: new Date().toISOString(),
                        exit_reason: action.reasoning
                    }).eq('id', sessionId);
                    break;
                }

                this.updateLiveStatus(sessionId, `Performing: ${action.type} ${action.selector || ''}`);
                await this.browser.perform(action);

                if (action.type === 'click' && action.selector) {
                    const attemptKey = `${observation.url}:${action.selector}`;
                    const attempts = (selectorAttempts.get(attemptKey) || 0) + 1;
                    selectorAttempts.set(attemptKey, attempts);
                    if (attempts >= 3) blacklist.add(action.selector);
                }

                action.current_url = observation.url;
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
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    exit_reason: 'Max steps reached — session concluded'
                }).eq('id', sessionId);
            }

        } catch (err: any) {
            console.error(`❌ Session ${sessionId} failed:`, err.message);
            await (this.supabase.from('persona_sessions') as any).update({ status: 'error', error_message: err.message }).eq('id', sessionId);
        } finally {
            await this.browser.close();
            if (testRunId) await checkAndFinalizeTestRun(testRunId).catch(() => { });
        }
    }

    private async discoverPageContent(sessionId: string, startStep: number) {
        if (!this.browser) return;
        this.updateLiveStatus(sessionId, '🔍 Phase: Deep Discovery Scan...');

        // Segment 1: Capture Top
        const obs1 = await this.browser.observe();
        const lp1 = await this.saveScreenshotLocally(sessionId, startStep, obs1.screenshot);
        await (this.supabase.from('session_logs') as any).insert({
            session_id: sessionId,
            step_number: startStep,
            current_url: obs1.url,
            screenshot_url: `data:image/jpeg;base64,${obs1.screenshot}`,
            emotion_tag: 'neutral',
            inner_monologue: 'Deep Discovery: Segment 1 (Top)',
            action_taken: { type: 'system', info: 'discovery_top', local_screenshot_path: lp1 } as any
        });

        // Smart Discovery: Check if we actually need to scroll
        const heights = await (this.browser as any).page.evaluate(() => {
            return {
                vh: window.innerHeight,
                dh: document.documentElement.scrollHeight
            };
        });

        if (heights.dh > heights.vh) {
            // Segment 2: Scroll and Capture (Mid)
            await this.browser.perform({ type: 'scroll', reasoning: 'Discovery scroll (mid)', emotional_state: 'curious' });
            const obs2 = await this.browser.observe();
            const lp2 = await this.saveScreenshotLocally(sessionId, startStep + 1, obs2.screenshot);
            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: startStep + 1,
                current_url: obs2.url,
                screenshot_url: `data:image/jpeg;base64,${obs2.screenshot}`,
                emotion_tag: 'neutral',
                inner_monologue: 'Deep Discovery: Segment 2 (Mid)',
                action_taken: { type: 'system', info: 'discovery_mid', local_screenshot_path: lp2 } as any
            });

            if (heights.dh > heights.vh * 1.5) {
                // Segment 3: Scroll and Capture (Bottom)
                // Fast Mode: No need for another networkidle after a scroll
                await (this.browser as any).page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                await this.browser.waitForTimeout(500);

                const obs3 = await this.browser.observe();
                const lp3 = await this.saveScreenshotLocally(sessionId, startStep + 2, obs3.screenshot);
                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: startStep + 2,
                    current_url: obs3.url,
                    screenshot_url: `data:image/jpeg;base64,${obs3.screenshot}`,
                    emotion_tag: 'neutral',
                    inner_monologue: 'Deep Discovery: Segment 3 (Bottom)',
                    action_taken: { type: 'system', info: 'discovery_bottom', local_screenshot_path: lp3 } as any
                });
            }
        } else {
            console.log('📄 Page is short, skipping Deep Discovery scrolls.');
        }
    }

    private async updateLiveStatus(sessionId: string, status: string) {
        // Non-blocking status update
        (this.supabase.from('persona_sessions') as any).update({ live_status: status }).eq('id', sessionId).then(() => { });
    }

    private async waitForStepSignal(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { clearInterval(interval); reject(new Error('Manual step timeout')); }, 600000);
            const interval = setInterval(async () => {
                const { data: session } = await (this.supabase.from('persona_sessions') as any).select('step_requested').eq('id', sessionId).single();
                if (session?.step_requested) { clearInterval(interval); clearTimeout(timeout); resolve(); }
            }, 2000);
        });
    }

    private async saveScreenshotLocally(sessionId: string, step: number, base64Data: string): Promise<string> {
        try {
            const dir = path.join(process.cwd(), 'public', 'screenshots', sessionId);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fileName = `step_${step}.jpg`;
            const filePath = path.join(dir, fileName);
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            return `/screenshots/${sessionId}/${fileName}`;
        } catch (error) {
            console.error('❌ Failed to save screenshot:', error);
            return '';
        }
    }

    private mapEmotion(state: string): 'neutral' | 'confusion' | 'frustration' | 'delight' {
        const s = (state || 'neutral').toLowerCase();
        if (s.includes('happy') || s.includes('delight')) return 'delight';
        if (s.includes('frustrat') || s.includes('angry')) return 'frustration';
        if (s.includes('confus') || s.includes('lost')) return 'confusion';
        return 'neutral';
    }
}
