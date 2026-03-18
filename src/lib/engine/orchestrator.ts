import { createAdminClient } from '../supabase/admin';
import { BrowserService } from './browser';
import { LLMService } from './llm';
import { PersonaProfile, Action, Observation, HeuristicMetrics } from './types';
import { generateAndStoreReport, checkAndFinalizeTestRun } from './reporter';
import * as fs from 'fs';
import * as path from 'path';
import { decrypt } from '../utils/vault';

export class Orchestrator {
    private browser: BrowserService;
    private llm!: LLMService;
    private supabase = createAdminClient();
    private trackedScans = new Set<string>();
    private heuristicState: HeuristicMetrics = {
        broken_links: [],
        navigation_latency: [],
        request_failures: 0,
        action_latency: [],
        last_load_time: 0
    };

    constructor() {
        this.browser = new BrowserService();
        this.registerGlobalCleanup();
    }

    private registerGlobalCleanup() {
        const cleanup = async () => {
            console.log('🧹 Performing global browser cleanup...');
            await this.browser.close().catch(() => { });
        };
        process.on('exit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }

    async runSession(sessionId: string, url: string, persona: PersonaProfile) {
        console.log(`🚀 Starting session ${sessionId} for ${persona.name} on ${url}`);
        let testRunId: string | undefined;
        const maxRetries = 2;

        let stepNumber = 1;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Step 0: Session Start
                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: 0,
                    current_url: url,
                    emotion_tag: 'neutral',
                    inner_monologue: `Mission started for ${persona.name}. Initializing browser and navigating to ${url}...`,
                    action_taken: { type: 'system', info: 'session_started' } as any
                });

                const { data: sessionData, error: sessionError } = await (this.supabase
                    .from('persona_sessions') as any)
                    .select('*, persona_configs(*, projects(*))')
                    .eq('id', sessionId)
                    .single();

                if (sessionError || !sessionData) throw new Error(`Failed to fetch session data: ${sessionError?.message}`);

                testRunId = sessionData.test_run_id;
                const project = sessionData.persona_configs?.projects;
                const executionMode = sessionData?.execution_mode || 'autonomous';
                const provider = project?.llm_provider || 'openai';

                let apiKey: string | undefined;
                if (project?.encrypted_llm_key) {
                    try { apiKey = decrypt(project.encrypted_llm_key); } catch (e) { }
                }

                this.llm = new LLMService({ provider, apiKey });

                if (attempt > 1) {
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

                // Step 1: Browser Init
                stepNumber = 1;
                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber++,
                    current_url: url,
                    emotion_tag: 'neutral',
                    inner_monologue: 'Initializing browser engine...',
                    action_taken: { type: 'system', info: 'browser_init' } as any
                });

                const stagehandModel = provider === 'openai' ? 'gpt-4o' :
                    provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' :
                        provider === 'gemini' ? 'google/gemini-2.0-flash' : 'gpt-4o';

                await this.browser.init(stagehandModel, apiKey);

                // Step 2: Main Navigation
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

                const history: Action[] = [];
                const maxSteps = 30;
                const triedElementsOnUrl = new Map<string, Set<string>>();
                const actionFrequency = new Map<string, number>();
                const blacklistedActions = new Set<string>();
                let lastActionKey = '';
                let consecutiveSameActions = 0;
                let actionCount = 0;

                while (actionCount < maxSteps) {
                    const { data: latestSession } = await (this.supabase.from('persona_sessions') as any)
                        .select('status').eq('id', sessionId).single();

                    if (latestSession?.status === 'abandoned' || latestSession?.status === 'completed') return;

                    if (executionMode === 'manual') {
                        this.updateLiveStatus(sessionId, 'Waiting for command (Manual Mode)...');
                        await this.waitForStepSignal(sessionId);
                    }

                    const currentUrl = await this.browser.evaluate(() => window.location.href);
                    const normalizedUrl = this.normalizeUrl(currentUrl);

                    let observation: Observation;
                    // Unified Observation with JIT methodical discovery
                    if (!this.trackedScans.has(normalizedUrl)) {
                        console.log(`🔍 First time on ${normalizedUrl}. Starting unified methodical scan...`);
                        this.updateLiveStatus(sessionId, `Initial scan of ${normalizedUrl}...`);
                        this.trackedScans.add(normalizedUrl);

                        // Captures fragments & rich top-view in one sweep
                        observation = await this.browser.observe([], true);

                        // Log discovery fragments (using current stepNumber)
                        if (observation.sections && observation.sections.length > 1) {
                            for (const [idx, section] of observation.sections.entries()) {
                                const label = idx === 0 ? 'Top' : idx === 1 ? 'Mid' : 'Bottom';
                                await this.saveAndLogDiscovery(sessionId, stepNumber++, section, label, persona, observation.url);
                            }
                        }
                    } else {
                        this.updateLiveStatus(sessionId, `Step ${stepNumber}: Analyzing view...`);
                        observation = await this.browser.observe();
                    }

                    // --- Cognition: Decide next action ---
                    const tried = Array.from(triedElementsOnUrl.get(normalizedUrl) || []);
                    const action = await this.llm.decideNextAction(observation, persona, history, Array.from(blacklistedActions), tried);
                    actionCount++;

                    // --- Recovery & Loop Detection ---
                    const currentActionKey = `${action.type}-${action.text || action.selector || ''}`;
                    if (currentActionKey === lastActionKey) {
                        consecutiveSameActions++;
                        actionFrequency.set(currentActionKey, (actionFrequency.get(currentActionKey) || 0) + 1);
                    } else {
                        consecutiveSameActions = 0;
                        lastActionKey = currentActionKey;
                    }

                    if (consecutiveSameActions >= 3) {
                        const scrollDirection = stepNumber % 2 === 0 ? 'bottom' : 'top';
                        const recoveryAction: Action = {
                            type: 'scroll',
                            text: scrollDirection,
                            reasoning: `Loop detected. Performing recovery scroll to ${scrollDirection}.`,
                            emotional_state: 'neutral',
                            emotional_intensity: 0.1
                        };
                        this.updateLiveStatus(sessionId, `Acting: Recovery ${scrollDirection}...`);
                        await this.browser.perform(recoveryAction);

                        await (this.supabase.from('session_logs') as any).insert({
                            session_id: sessionId,
                            step_number: stepNumber++,
                            current_url: currentUrl,
                            emotion_tag: 'neutral',
                            inner_monologue: recoveryAction.reasoning,
                            action_taken: recoveryAction as any
                        });
                        consecutiveSameActions = 0;
                        continue;
                    }

                    // --- Execution: Perform action ---
                    let clickCoords = null;
                    if (action.type === 'click' && action.selector) {
                        clickCoords = await this.browser.evaluate((sel: string) => {
                            const el = sel.startsWith('xpath=')
                                ? document.evaluate(sel.slice(6), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement
                                : document.querySelector(sel) as HTMLElement;
                            if (el) {
                                const rect = el.getBoundingClientRect();
                                return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2), w: Math.round(rect.width), h: Math.round(rect.height) };
                            }
                            return null;
                        }, action.selector).catch(() => null);
                    }

                    // Fallback to domContext coords if selector is missing or resolver failed
                    if (action.type === 'click' && !clickCoords && (action.text || action.reasoning)) {
                        try {
                            const dom = JSON.parse(observation.domContext || '[]');
                            const targetText = (action.text || action.reasoning || '').toLowerCase();
                            const match = dom.find((el: any) =>
                                el.text && el.text.toLowerCase().includes(targetText) && el.coordinates
                            );
                            if (match && match.coordinates) {
                                clickCoords = {
                                    x: Math.round(match.coordinates.x + match.coordinates.w / 2),
                                    y: Math.round(match.coordinates.y + match.coordinates.h / 2),
                                    w: match.coordinates.w,
                                    h: match.coordinates.h
                                };
                                console.log(`🎯 Fallback resolved coords for "${targetText}":`, clickCoords);
                            }
                        } catch (e) { }
                    }

                    this.updateLiveStatus(sessionId, `Acting: ${action.type} ${action.text || ''}`);
                    await this.browser.perform(action);

                    // --- Post-Action Discovery ---
                    const postActionUrl = await this.browser.evaluate(() => window.location.href).catch(() => observation.url);
                    const postActionObservation = await this.browser.observe().catch(() => observation);
                    const technicalMetrics = this.browser.getMetrics();

                    // --- Logging: Finalize step ---
                    const localScreenshotPath = await this.saveScreenshotLocally(sessionId, stepNumber, postActionObservation.screenshot);
                    const isRageClick = (actionFrequency.get(currentActionKey) || 0) >= 3 && action.type === 'click';

                    // Parse potential clicks from domContext
                    let potentialClicks = [];
                    try {
                        potentialClicks = JSON.parse(observation.domContext || '[]')
                            .filter((el: any) => el.coordinates)
                            .map((el: any) => ({
                                x: Math.round(el.coordinates.x + el.coordinates.w / 2),
                                y: Math.round(el.coordinates.y + el.coordinates.h / 2),
                                text: el.text,
                                selector: el.selector
                            }));
                    } catch (e) { }

                    const { error: logError } = await (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: stepNumber,
                        current_url: postActionUrl,
                        screenshot_url: `data:image/jpeg;base64,${postActionObservation.screenshot}`,
                        emotion_tag: isRageClick ? 'frustration' : this.mapEmotion(action.emotional_state),
                        inner_monologue: isRageClick
                            ? `Stuck loop on "${action.text || 'Element'}". ${action.reasoning}`
                            : action.reasoning,
                        action_taken: {
                            ...action,
                            coordinates: clickCoords,
                            potential_clicks: potentialClicks,
                            local_screenshot_path: localScreenshotPath,
                            technical_metrics: {
                                latency_ms: technicalMetrics.last_load_time,
                                broken_links_count: technicalMetrics.broken_links.length
                            }
                        } as any
                    });

                    if (logError) console.error(`❌ Failed to log step ${stepNumber}:`, logError.message);

                    action.current_url = postActionUrl;
                    history.push(action);
                    stepNumber++;

                    // URL tracking & Stuck tracking
                    const normalizedPostUrl = this.normalizeUrl(postActionUrl);
                    if (action.type === 'click' && normalizedPostUrl === normalizedUrl) {
                        if (!triedElementsOnUrl.has(normalizedUrl)) triedElementsOnUrl.set(normalizedUrl, new Set());
                        const currentTried = triedElementsOnUrl.get(normalizedUrl)!;
                        if (action.text) currentTried.add(action.text);
                        if (action.selector) currentTried.add(action.selector);
                        if (consecutiveSameActions >= 2) {
                            if (action.text) blacklistedActions.add(action.text);
                            if (action.selector) blacklistedActions.add(action.selector);
                        }
                    }

                    if (executionMode === 'manual') {
                        await (this.supabase.from('persona_sessions') as any).update({ is_paused: true, step_requested: false }).eq('id', sessionId);
                    }
                }

                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    exit_reason: actionCount >= maxSteps ? 'Max steps reached' : 'Goals met'
                }).eq('id', sessionId);

                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: stepNumber++,
                    current_url: url,
                    emotion_tag: 'delight',
                    inner_monologue: 'Session completed successfully.',
                    action_taken: { type: 'system', info: 'session_completed' } as any
                });

            } catch (err: any) {
                console.error(`❌ Session ${sessionId} failed:`, err.message);
                if (attempt < maxRetries) {
                    await this.browser.close().catch(() => { });
                    continue;
                }
                await (this.supabase.from('persona_sessions') as any).update({ status: 'error', error_message: err.message, completed_at: new Date().toISOString() }).eq('id', sessionId);
            } finally {
                await this.browser.close().catch(() => { });
                if (testRunId) await checkAndFinalizeTestRun(testRunId).catch(() => { });
            }
        }
    }

    private async saveAndLogDiscovery(sessionId: string, step: number, section: any, label: string, persona: PersonaProfile, url: string) {
        const localPath = await this.saveScreenshotLocally(sessionId, step, section.screenshot);

        // Analyze section in background (Parallel with Scan logging)
        const analysis = await this.llm.analyzeSection({
            screenshot: section.screenshot,
            url: url,
            title: '',
            domContext: section.domContext,
            dimensions: { width: 1280, height: 800 }
        }, persona, label).catch(() => ({ ux_feedback: `Scanning ${label} section...`, emotional_state: 'neutral', emotional_intensity: 0.3 }));

        await (this.supabase.from('session_logs') as any).insert({
            session_id: sessionId,
            step_number: step,
            current_url: url,
            screenshot_url: `data:image/jpeg;base64,${section.screenshot}`,
            emotion_tag: this.mapEmotion(analysis.emotional_state),
            inner_monologue: analysis.ux_feedback,
            action_taken: {
                type: 'system',
                info: `sequential_analysis_${label.toLowerCase()}`,
                local_screenshot_path: localPath,
                proposed_solution: analysis.proposed_solution,
                specific_emotion: analysis.emotional_state
            } as any
        });
    }

    private async updateLiveStatus(sessionId: string, status: string) {
        console.log(`📡 [Session ${sessionId.slice(0, 8)}] Status: ${status}`);
        try {
            await (this.supabase.from('persona_sessions') as any).update({ live_status: status }).eq('id', sessionId);
        } catch (e) {
            // silent catch
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
            return '';
        }
    }

    private mapEmotion(state: string): string {
        const s = (state || 'neutral').toLowerCase();
        if (s.includes('frustrat') || s.includes('angry')) return 'frustration';
        if (s.includes('disappoint') || s.includes('fail')) return 'disappointment';
        if (s.includes('confus') || s.includes('lost')) return 'confusion';
        if (s.includes('bore') || s.includes('slow')) return 'boredom';
        if (s.includes('happy') || s.includes('delight')) return 'delight';
        if (s.includes('satisf') || s.includes('good')) return 'satisfaction';
        if (s.includes('curio') || s.includes('interest')) return 'curiosity';
        return 'neutral';
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            const host = u.hostname.replace(/^www\./, '');
            let path = u.pathname;
            if (path === '/') path = '';
            else if (path.endsWith('/')) path = path.slice(0, -1);
            return `${u.protocol}//${host}${path}`.toLowerCase();
        } catch {
            return url.toLowerCase().split('#')[0].replace(/\/$/, '');
        }
    }
}
