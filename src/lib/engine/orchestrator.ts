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
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                stepNumber = await this.discoverPageContent(sessionId, stepNumber);

                const history: Action[] = [];
                const maxSteps = 20; // Increased max steps to allow for discovery
                let consecutiveSameActions = 0;
                let lastActionKey = '';
                const selectorAttempts = new Map<string, number>();
                const blacklist = new Set<string>(); // Legacy/Temporary index-based blacklist
                const semanticBlacklist = new Set<string>(); // Stable keys: "tag:text:href"
                let prevVisualHash = ''; // Track visual state for loop detection

                let lastObservationsElements: any[] = [];

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
                        return; // Break out of function
                    }

                    if (executionMode === 'manual') {
                        this.updateLiveStatus(sessionId, 'Waiting for command (Manual Mode)...');
                        await this.waitForStepSignal(sessionId);
                    }

                    this.updateLiveStatus(sessionId, `Step ${stepNumber}: Observing Visual State...`);

                    const currentIndicesToBlock: string[] = [];
                    if (semanticBlacklist.size > 0 && lastObservationsElements.length > 0) {
                        lastObservationsElements.forEach((el: any) => {
                            const normalizedText = (el.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            const normalizedHref = (el.href || '').toLowerCase().trim().replace(/\/$/, '');
                            const key = `${el.tagName}:${normalizedText}:${normalizedHref}`;
                            if (semanticBlacklist.has(key)) {
                                currentIndicesToBlock.push(`[${el.index}]`);
                            }
                        });
                    }

                    const observation = await this.browser.observe(currentIndicesToBlock);
                    lastObservationsElements = JSON.parse(observation.domContext || '[]');
                    const localScreenshotPath = await this.saveScreenshotLocally(sessionId, stepNumber, observation.screenshot);

                    // --- Visual State Check ---
                    const currentVisualHash = `${observation.screenshot?.length || 0}:${observation.screenshot?.slice(100, 200)}`;
                    const isVisualStatic = currentVisualHash === prevVisualHash;
                    prevVisualHash = currentVisualHash;

                    this.updateLiveStatus(sessionId, `Step ${stepNumber}: Deciding next move...`);

                    const elements = lastObservationsElements;

                    // Filter out semantically blacklisted items for the LLM context
                    const filtered = elements.filter((el: any) => {
                        const normalizedText = (el.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        const normalizedHref = (el.href || '').toLowerCase().trim().replace(/\/$/, '');
                        const key = `${el.tagName}:${normalizedText}:${normalizedHref}`;
                        return !semanticBlacklist.has(key);
                    });
                    const filteredDomContext = JSON.stringify(filtered);
                    const filteredObservation = { ...observation, domContext: filteredDomContext };

                    const blockedHints = Array.from(semanticBlacklist).slice(-8);
                    let action = await this.llm.decideNextAction(filteredObservation, persona, history, blockedHints);

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

                    const isUrlStatic = observation.url === (history[history.length - 1]?.current_url || url);
                    const isStuck = isUrlStatic && isVisualStatic;
                    if (consecutiveSameActions >= (action.type === 'wait' ? 2 : 3) || isCycle || (isStuck && history.length > 3)) {
                        this.updateLiveStatus(sessionId, `Engine detected loop! Forcing recovery...`);

                        // Blacklist the failing element semantically
                        if (action.selector) {
                            const indexMatch = action.selector.match(/\[(\d+)\]/);
                            if (indexMatch) {
                                const idx = parseInt(indexMatch[1]);
                                const el = elements.find((e: any) => e.index === idx);
                                if (el) {
                                    const normalizedText = (el.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                    const normalizedHref = (el.href || '').toLowerCase().trim().replace(/\/$/, '');
                                    const key = `${el.tagName}:${normalizedText}:${normalizedHref}`;
                                    console.log(`🚫 Semantically blacklisting: ${key}`);
                                    semanticBlacklist.add(key);
                                }
                            }
                        }

                        // --- NEW: Explicitly blacklist the failing element ---
                        if (action.selector) blacklist.add(action.selector);

                        const scrollDirection = stepNumber % 2 === 0 ? 'bottom' : 'top';
                        const recoveryAction: Action = {
                            type: 'scroll',
                            text: scrollDirection,
                            reasoning: `I've detected a loop. I'll scroll to the ${scrollDirection} to break the pattern and reset my perspective.`,
                            emotional_state: 'frustrated',
                            current_url: observation.url
                        };

                        // Add to history so the LLM sees the recovery step
                        history.push(recoveryAction);

                        await (this.supabase.from('session_logs') as any).insert({
                            session_id: sessionId,
                            step_number: stepNumber,
                            current_url: observation.url,
                            emotion_tag: 'frustration',
                            inner_monologue: `Loop detected on ${action.selector || 'action'}. Forcing a ${scrollDirection} scroll.`,
                            action_taken: { type: 'system', info: `loop_breaker_${scrollDirection}` } as any
                        });

                        consecutiveSameActions = 0;
                        stepNumber++;

                        // Perform the recovery scroll immediately
                        await this.browser.perform(recoveryAction);

                        // Skip the normal action execution for this heartbeat
                        continue;
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
                        return; // Success
                    }

                    this.updateLiveStatus(sessionId, `Performing: ${action.type} ${action.selector || ''}`);
                    await this.browser.perform(action);

                    if (action.type === 'click' && action.selector) {
                        const indexMatch = action.selector.match(/\[(\d+)\]/);
                        if (indexMatch) {
                            const idx = parseInt(indexMatch[1]);
                            const el = elements.find((e: any) => e.index === idx);
                            if (el) {
                                const normalizedText = (el.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                const normalizedHref = (el.href || '').toLowerCase().trim().replace(/\/$/, '');
                                const attemptKey = `${el.tagName}:${normalizedText}:${normalizedHref}`;

                                const attempts = (selectorAttempts.get(attemptKey) || 0) + 1;
                                selectorAttempts.set(attemptKey, attempts);
                                if (attempts >= 3) {
                                    console.log(`🚫 Max attempts reached for semantic key: ${attemptKey}`);
                                    semanticBlacklist.add(attemptKey);
                                }
                            }
                        }
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
                return; // Success, exit retry loop

            } catch (err: any) {
                console.error(`❌ Session ${sessionId} failed (Attempt ${attempt}):`, err.message);

                if (attempt < maxRetries) {
                    await this.browser.close().catch(() => { });
                    continue; // Rerun loop
                }

                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'error',
                    error_message: err.message
                }).eq('id', sessionId);
            } finally {
                await this.browser.close();
                if (testRunId) await checkAndFinalizeTestRun(testRunId).catch(() => { });
            }
        }
    }

    private async discoverPageContent(sessionId: string, startStep: number): Promise<number> {
        if (!this.browser) return startStep;
        let currentStep = startStep;
        this.updateLiveStatus(sessionId, '🔍 Phase: Deep Discovery Scan...');

        // Segment 1: Capture Top
        const obs1 = await this.browser.observe();
        const lp1 = await this.saveScreenshotLocally(sessionId, currentStep, obs1.screenshot);
        await (this.supabase.from('session_logs') as any).insert({
            session_id: sessionId,
            step_number: currentStep,
            current_url: obs1.url,
            screenshot_url: `data:image/jpeg;base64,${obs1.screenshot}`,
            emotion_tag: 'neutral',
            inner_monologue: 'Deep Discovery: Segment 1 (Top)',
            action_taken: { type: 'system', info: 'discovery_top', local_screenshot_path: lp1 } as any
        });
        currentStep++;

        // Smart Discovery: Check if we actually need to scroll
        const heights = await this.browser.evaluate(() => {
            return {
                vh: window.innerHeight,
                dh: document.documentElement.scrollHeight
            };
        });

        if (heights.dh > heights.vh) {
            // Segment 2: Scroll and Capture (Mid)
            await this.browser.perform({ type: 'scroll', reasoning: 'Discovery scroll (mid)', emotional_state: 'curious' });
            const obs2 = await this.browser.observe();
            const lp2 = await this.saveScreenshotLocally(sessionId, currentStep, obs2.screenshot);
            await (this.supabase.from('session_logs') as any).insert({
                session_id: sessionId,
                step_number: currentStep,
                current_url: obs2.url,
                screenshot_url: `data:image/jpeg;base64,${obs2.screenshot}`,
                emotion_tag: 'neutral',
                inner_monologue: 'Deep Discovery: Segment 2 (Mid)',
                action_taken: { type: 'system', info: 'discovery_mid', local_screenshot_path: lp2 } as any
            });
            currentStep++;

            if (heights.dh > heights.vh * 1.5) {
                // Segment 3: Scroll and Capture (Bottom)
                await this.browser.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                await this.browser.waitForTimeout(500);

                const obs3 = await this.browser.observe();
                const lp3 = await this.saveScreenshotLocally(sessionId, currentStep, obs3.screenshot);
                await (this.supabase.from('session_logs') as any).insert({
                    session_id: sessionId,
                    step_number: currentStep,
                    current_url: obs3.url,
                    screenshot_url: `data:image/jpeg;base64,${obs3.screenshot}`,
                    emotion_tag: 'neutral',
                    inner_monologue: 'Deep Discovery: Segment 3 (Bottom)',
                    action_taken: { type: 'system', info: 'discovery_bottom', local_screenshot_path: lp3 } as any
                });
                currentStep++;
            }
        }

        // --- NEW: Navigational Scout Phase ---
        try {
            const elements = JSON.parse(obs1.domContext || '[]');
            const navKeywords = ['pricing', 'feature', 'about', 'login', 'signup', 'product', 'contact', 'faq'];

            // Find links that look like primary navigation
            const discoveryLinks = elements.filter((el: any) => {
                if (el.tagName !== 'A' || !el.text) return false;
                const text = el.text.toLowerCase();
                const isNav = el.role === 'menuitem' || el.classes?.toLowerCase().includes('nav') || el.classes?.toLowerCase().includes('header');
                const hasKeyword = navKeywords.some(k => text.includes(k));
                return isNav || (hasKeyword && text.length < 30);
            }).slice(0, 6); // Expanded scout limit

            if (discoveryLinks.length > 0) {
                console.log(`🧭 Found ${discoveryLinks.length} discovery links. Scouting...`);

                for (const link of discoveryLinks) {
                    this.updateLiveStatus(sessionId, `🔍 Scouting: ${link.text}...`);

                    // Navigate to the sub-page
                    try {
                        await this.browser.perform({
                            type: 'click',
                            selector: `[index="${link.index}"]`,
                            reasoning: `Scouting sub-page: ${link.text}`,
                            emotional_state: 'curious'
                        });
                    } catch (navError) {
                        console.warn(`⚠️ Failed to scout ${link.text}:`, navError);
                        await this.browser.navigate(obs1.url);
                        continue;
                    }

                    const subObs = await this.browser.observe();
                    const subLp = await this.saveScreenshotLocally(sessionId, currentStep, subObs.screenshot);

                    // Add a scroll discovery for sub-pages too
                    await this.browser.evaluate(() => window.scrollTo(0, 800));
                    await this.browser.waitForTimeout(500);
                    const subObsMid = await this.browser.observe(); // Capture mid-scroll state

                    await (this.supabase.from('session_logs') as any).insert({
                        session_id: sessionId,
                        step_number: currentStep,
                        current_url: subObs.url,
                        screenshot_url: `data:image/jpeg;base64,${subObs.screenshot}`,
                        emotion_tag: 'neutral',
                        inner_monologue: `Navigational Discovery: Scouted ${link.text} page.`,
                        action_taken: {
                            type: 'system',
                            info: `scout_${link.text.toLowerCase().replace(/\s+/g, '_')}`,
                            local_screenshot_path: subLp
                        } as any
                    });

                    currentStep++;
                    // Go back to home to resume scouting
                    await this.browser.navigate(obs1.url);
                }
            }
        } catch (e) {
            console.error('❌ Navigational Discovery failed:', e);
        }

        return currentStep;
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

        // Delight: High satisfaction/smoothness
        if (s.includes('happy') || s.includes('delight') || s.includes('smooth') ||
            s.includes('easy') || s.includes('love') || s.includes('great') ||
            s.includes('amazing') || s.includes('satisfying') || s.includes('impressive') ||
            s.includes('clear') || s.includes('straightforward') || s.includes('simple') ||
            s.includes('logical') || s.includes('quick') || s.includes('fast') || s.includes('direct')) {
            return 'delight';
        }

        // Frustration: Stuck or errors
        if (s.includes('frustrat') || s.includes('angry') || s.includes('annoy') ||
            s.includes('stuck') || s.includes('broken') || s.includes('slow') ||
            s.includes('difficult') || s.includes('ugh') || s.includes('loop')) {
            return 'frustration';
        }

        // Confusion: UX ambiguity
        if (s.includes('confus') || s.includes('lost') || s.includes('unsure') ||
            s.includes('where') || s.includes('find') || s.includes('how') ||
            s.includes('complex') || s.includes('unclear') || s.includes('mystery') ||
            s.includes('puzzl') || s.includes('ambiguous')) {
            return 'confusion';
        }

        return 'neutral';
    }
}
