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
    private trackedScans = new Set<string>();

    constructor() {
        this.browser = new BrowserService();
    }

    async runSession(sessionId: string, url: string, persona: PersonaProfile) {
        console.log(`🚀 Starting session ${sessionId} for ${persona.name} on ${url}`);
        let testRunId: string | undefined;
        const maxRetries = 2;

        let stepNumber = 1;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Log initial session start
                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: 0,
                    current_url: url,
                    emotion_tag: 'neutral',
                    inner_monologue: `Mission started for ${persona.name}. Initializing browser and navigating to ${url}...`,
                    action_taken: { type: 'system', info: 'session_started' } as any
                }).then(({ error }: any) => {
                    if (error) console.error('❌ Failed to insert initial log:', error.message);
                });

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

                const provider = project?.llm_provider || 'openai';
                let apiKey: string | undefined;

                if (project?.encrypted_llm_key) {
                    try {
                        apiKey = decrypt(project.encrypted_llm_key);
                    } catch (e) {
                        console.error('Failed to decrypt LLM key:', e);
                    }
                }

                this.llm = new LLMService({ provider, apiKey });

                if (attempt > 1) {
                    console.log(`🔄 Retrying session ${sessionId} (Attempt ${attempt}/${maxRetries})...`);
                    await (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: 0,
                        current_url: url,
                        emotion_tag: 'neutral',
                        inner_monologue: 'Session crashed mid-way. Restarting engine for recovery...',
                        action_taken: { type: 'system', info: 'session_retry_restart' } as any
                    });
                }

                this.updateLiveStatus(sessionId, 'Initializing engine & preparing browser container...');
                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'running',
                    started_at: new Date().toISOString(),
                    is_paused: executionMode === 'manual'
                }).eq('id', sessionId);

                stepNumber = 1;

                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber++,
                    current_url: url,
                    emotion_tag: 'neutral',
                    inner_monologue: 'Initializing browser engine...',
                    action_taken: { type: 'system', info: 'browser_init' } as any
                });

                this.updateLiveStatus(sessionId, 'Starting Stagehand instance...');
                // Map common providers to Stagehand-compatible models
                const stagehandModel = provider === 'openai' ? 'gpt-4o' :
                    provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' :
                        provider === 'gemini' ? 'google/gemini-2.0-flash' : 'gpt-4o';

                await this.browser.init(stagehandModel, apiKey);

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
                const actualUrl = await this.browser.evaluate(() => window.location.href).catch(() => url);
                this.trackedScans.add(this.normalizeUrl(actualUrl));

                // Phase 1: Sequential Analysis (First Page)
                console.log('🔍 Starting Sequential Analysis...');
                const discovery = await this.discoverPageContent(sessionId, stepNumber, persona);
                stepNumber = discovery.nextStep;
                // No need to set the initial observation here as the loop will handle currentUrl

                // Phase 2: Journey Execution
                const history: Action[] = [];
                const maxSteps = 30;
                let consecutiveSameActions = 0;
                let lastActionKey = '';
                const blacklistedActions = new Set<string>();
                const triedElementsOnUrl = new Map<string, Set<string>>(); // Track clicks per URL

                while (stepNumber <= maxSteps) {
                    const { data: latestSession } = await (this.supabase.from('persona_sessions') as any)
                        .select('status')
                        .eq('id', sessionId)
                        .single();

                    if (latestSession?.status === 'abandoned' || latestSession?.status === 'completed') {
                        console.log(`🛑 Stop signal detected for session ${sessionId}.`);
                        return;
                    }

                    if (executionMode === 'manual') {
                        this.updateLiveStatus(sessionId, 'Waiting for command (Manual Mode)...');
                        await this.waitForStepSignal(sessionId);
                    }

                    // ─── Sequential Analysis Requirement ───
                    const currentUrl = await this.browser.evaluate(() => window.location.href);
                    const normalizedUrl = this.normalizeUrl(currentUrl);

                    let observation: Observation;
                    if (!this.trackedScans.has(normalizedUrl)) {
                        this.updateLiveStatus(sessionId, `First time on ${normalizedUrl}. Starting Sequential Analysis...`);
                        this.trackedScans.add(normalizedUrl);
                        const discovery = await this.discoverPageContent(sessionId, stepNumber, persona);
                        stepNumber = discovery.nextStep;
                        observation = discovery.observation;
                    } else {
                        // Already scanned this URL, just do a normal observation to see if anything changed
                        this.updateLiveStatus(sessionId, `Step ${stepNumber}: Observing current state...`);
                        observation = await this.browser.observe();
                    }

                    const localScreenshotPath = await this.saveScreenshotLocally(sessionId, stepNumber, observation.screenshot);

                    const tried = Array.from(triedElementsOnUrl.get(normalizedUrl) || []);
                    const action = await this.llm.decideNextAction(observation, persona, history, Array.from(blacklistedActions), tried);

                    // Stall detection
                    const currentActionKey = `${action.type}-${action.text || ''}`;
                    if (currentActionKey === lastActionKey) {
                        consecutiveSameActions++;
                    } else {
                        consecutiveSameActions = 0;
                        lastActionKey = currentActionKey;
                    }

                    if (consecutiveSameActions >= 3) {
                        const scrollDirection = stepNumber % 2 === 0 ? 'bottom' : 'top';
                        this.updateLiveStatus(sessionId, `Loop detected. Recovery scroll ${scrollDirection}...`);

                        const recoveryAction: Action = {
                            type: 'scroll',
                            text: scrollDirection,
                            reasoning: `Loop detected (repeated the same action 3 times). Performing a ${scrollDirection} scroll to find new content.`,
                            emotional_state: 'neutral',
                            emotional_intensity: 0.5
                        };

                        await this.browser.perform(recoveryAction);

                        // Log the recovery attempt
                        const recoveryObservation = await this.browser.observe().catch(() => ({ url: currentUrl, screenshot: '' }));
                        await (this.supabase.from('session_logs') as any).insert({
                            session_id: sessionId,
                            step_number: stepNumber,
                            current_url: recoveryObservation.url,
                            screenshot_url: recoveryObservation.screenshot ? `data:image/jpeg;base64,${recoveryObservation.screenshot}` : null,
                            emotion_tag: 'neutral',
                            inner_monologue: recoveryAction.reasoning,
                            action_taken: recoveryAction as any
                        });

                        consecutiveSameActions = 0;
                        stepNumber++;
                        continue;
                    }

                    this.updateLiveStatus(sessionId, `Acting: ${action.type} ${action.text || ''}`);
                    await this.browser.perform(action);

                    // Fetch post-action state
                    const postActionUrl = await this.browser.evaluate(() => window.location.href).catch(() => observation.url);
                    const postActionObservation = await this.browser.observe().catch(() => observation);

                    // Log the action 
                    await (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: stepNumber,
                        current_url: postActionUrl,
                        screenshot_url: `data:image/jpeg;base64,${postActionObservation.screenshot}`,
                        emotion_tag: this.mapEmotion(action.emotional_state),
                        inner_monologue: action.reasoning,
                        action_taken: { ...action, local_screenshot_path: localScreenshotPath } as any
                    });

                    action.current_url = postActionUrl;
                    history.push(action);
                    stepNumber++;

                    // Blacklist/Tried logic: if we clicked something and URL didn't change
                    const normalizedPostUrl = this.normalizeUrl(postActionUrl);
                    const normalizedPreUrl = this.normalizeUrl(observation.url);

                    if (action.type === 'click' && normalizedPostUrl === normalizedPreUrl) {
                        if (!triedElementsOnUrl.has(normalizedPostUrl)) {
                            triedElementsOnUrl.set(normalizedPostUrl, new Set());
                        }

                        const currentTried = triedElementsOnUrl.get(normalizedPostUrl)!;
                        if (action.text) currentTried.add(action.text);
                        if (action.selector) currentTried.add(action.selector);

                        // If we've tried many things on this page and still haven't moved, force a recovery
                        if (currentTried.size >= 5) {
                            console.log(`🧨 Excessive failed clicks on ${normalizedPostUrl}. Forcing recovery scroll.`);
                            const recoveryAction: Action = {
                                type: 'scroll',
                                text: 'bottom',
                                reasoning: `Stuck in a click loop with ${currentTried.size} failed attempts. Scrolling to find new areas.`,
                                emotional_state: 'frustration',
                                emotional_intensity: 0.8
                            };
                            await this.browser.perform(recoveryAction);
                        }

                        if (consecutiveSameActions >= 2) {
                            if (action.text) blacklistedActions.add(action.text);
                            if (action.selector) blacklistedActions.add(action.selector);
                            console.log(`🚫 Blacklisting stuck element: ${action.text || action.selector}`);
                        }
                    }

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
                        exit_reason: 'Max steps reached'
                    }).eq('id', sessionId);
                }

                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber++,
                    current_url: url,
                    emotion_tag: 'delight',
                    inner_monologue: 'Session completed successfully. All goals met or max steps reached.',
                    action_taken: { type: 'system', info: 'session_completed' } as any
                });
                return;

            } catch (err: any) {
                console.error(`❌ Session ${sessionId} failed (Attempt ${attempt}):`, err.message);
                if (attempt < maxRetries) {
                    await this.browser.close().catch(() => { });
                    continue;
                }
                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'error',
                    error_message: err.message,
                    completed_at: new Date().toISOString()
                }).eq('id', sessionId);

                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber++,
                    current_url: url,
                    emotion_tag: 'frustration',
                    inner_monologue: `Session failed permanently: ${err.message}`,
                    action_taken: { type: 'system', info: 'session_error', error: err.message } as any
                });
            } finally {
                await this.browser.close().catch(() => { });
                if (testRunId) {
                    try {
                        await checkAndFinalizeTestRun(testRunId);
                    } catch (finalError) {
                        console.error(`❌ Finalization failed for run ${testRunId}:`, finalError);
                    }
                }
            }
        }
    }

    private async discoverPageContent(sessionId: string, startStep: number, persona: PersonaProfile): Promise<{ nextStep: number, observation: Observation }> {
        if (!this.browser) return { nextStep: startStep, observation: { url: '', screenshot: '', domContext: '[]', title: '', dimensions: { width: 1280, height: 800 } } };
        let currentStep = startStep;

        const labels = ['Top', 'Mid', 'Bottom'] as const;
        const currentUrl = await this.browser.evaluate(() => window.location.href);
        const sections: any[] = [];

        for (const label of labels) {
            this.updateLiveStatus(sessionId, `Analyzing Page Section: ${label}...`);

            // Scroll to the appropriate section
            if (label === 'Top') {
                await this.browser.evaluate(() => window.scrollTo(0, 0));
            } else if (label === 'Mid') {
                await this.browser.evaluate(() => window.scrollTo(0, window.innerHeight));
            } else if (label === 'Bottom') {
                await this.browser.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            }

            await this.browser.waitForTimeout(1500);

            // Capture and Analyze
            const section = await this.browser.captureSection(label);
            sections.push(section);

            const { ux_feedback, emotional_state, emotional_intensity, proposed_solution } = await this.llm.analyzeSection({
                screenshot: section.screenshot,
                url: currentUrl,
                title: '',
                domContext: section.domContext,
                dimensions: { width: 1280, height: 800 }
            }, persona, label);

            const feedbackString = String(ux_feedback || 'No feedback');

            const localPath = await this.saveScreenshotLocally(sessionId, currentStep, section.screenshot);

            // Log Methodical Feedback
            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: currentStep,
                current_url: currentUrl,
                screenshot_url: `data:image/jpeg;base64,${section.screenshot}`,
                emotion_tag: this.mapEmotion(emotional_state),
                inner_monologue: feedbackString,
                action_taken: {
                    type: 'system',
                    info: `sequential_analysis_${label.toLowerCase()}`,
                    local_screenshot_path: localPath,
                    ux_feedback: feedbackString,
                    emotional_state: emotional_state,
                    emotional_intensity: emotional_intensity,
                    proposed_solution: proposed_solution,
                    specific_emotion: emotional_state // Label for UI
                } as any
            });

            currentStep++;
        }

        // Return to top before finishing discovery
        await this.browser.evaluate(() => window.scrollTo(0, 0));
        await this.browser.waitForTimeout(300);

        // Aggregate elements for the final observation
        let fullDom: any[] = [];
        try {
            sections.forEach(s => {
                const elements = JSON.parse(s.domContext || '[]');
                fullDom = fullDom.concat(elements);
            });
        } catch (e) {
            console.error('Failed to aggregate DOM context:', e);
        }

        return {
            nextStep: currentStep,
            observation: {
                url: currentUrl,
                screenshot: sections[0].screenshot, // Use Top as main
                domContext: JSON.stringify(fullDom),
                title: '',
                dimensions: { width: 1280, height: 720 },
                sections
            }
        };
    }

    private async updateLiveStatus(sessionId: string, status: string) {
        console.log(`📡 [Session ${sessionId.slice(0, 8)}] Status: ${status}`);
        const { error } = await (this.supabase.from('persona_sessions') as any)
            .update({ live_status: status })
            .eq('id', sessionId);

        if (error) {
            console.error(`❌ Failed to update persona_sessions.live_status for session ${sessionId}:`, error.message);
        }
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

    private mapEmotion(state: string): string {
        const s = (state || 'neutral').toLowerCase();

        // High priority friction
        if (s.includes('frustrat') || s.includes('angry') || s.includes('annoy') || s.includes('stuck') || s.includes('broken') || s.includes('loop')) return 'frustration';
        if (s.includes('disappoint') || s.includes('fail') || s.includes('sad')) return 'disappointment';
        if (s.includes('confus') || s.includes('lost') || s.includes('unsure') || s.includes('how') || s.includes('where') || s.includes('skeptic') || s.includes('suspicio')) return 'confusion';
        if (s.includes('bore') || s.includes('slow') || s.includes('repetitive')) return 'boredom';

        // Positive
        if (s.includes('happy') || s.includes('delight') || s.includes('wow') || s.includes('great')) return 'delight';
        if (s.includes('satisf') || s.includes('good') || s.includes('work') || s.includes('clear')) return 'satisfaction';
        if (s.includes('curio') || s.includes('interest') || s.includes('want')) return 'curiosity';
        if (s.includes('surpris') || s.includes('reveal') || s.includes('unexpect')) return 'surprise';

        return 'neutral';
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            let normalized = u.origin + u.pathname;
            if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
            return normalized.toLowerCase();
        } catch {
            return url.toLowerCase().split('#')[0].replace(/\/$/, '');
        }
    }
}
