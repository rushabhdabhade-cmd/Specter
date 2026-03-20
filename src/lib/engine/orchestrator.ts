import { createAdminClient } from '../supabase/admin';
import { BrowserService } from './browser';
import { LLMService } from './llm';
import { PersonaProfile, Action, HeuristicMetrics } from './types';
import { generateAndStoreReport, checkAndFinalizeTestRun } from './reporter';
import * as fs from 'fs';
import * as path from 'path';
import { decrypt } from '../utils/vault';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PAGES = 15;    // Hard cap on unique pages to visit
const MAX_ACTIONS_PAGE = 5;     // Max interactions per page
const MAX_SAME_ACTIONS = 2;     // Consecutive identical actions before blacklisting
const DB_FLUSH_INTERVAL = 3;     // Flush buffered logs every N steps
const LINK_HARVEST_MAX = 20;    // Max links collected from any single page

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class Orchestrator {
    private browser: BrowserService;
    private llm!: LLMService;
    private supabase = createAdminClient();
    private channel: any;

    // Step log buffer — flushed in batches to reduce DB round-trips
    private logBuffer: any[] = [];
    private stepNumber = 1;

    constructor() {
        this.browser = new BrowserService();
        this.registerCleanup();
    }

    private registerCleanup() {
        const cleanup = async () => { await this.browser.close().catch(() => { }); };
        process.on('exit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }

    // ─── Main entry ───────────────────────────────────────────────────────────

    async runSession(
        sessionId: string,
        url: string,
        persona: PersonaProfile,
        llmConfig?: { provider: 'gemini' | 'openrouter' | 'ollama' | 'openai'; apiKey?: string; modelName?: string }
    ) {
        console.log(`🚀 Session ${sessionId} | ${persona.name} | ${url}`);
        this.channel = this.supabase.channel(`terminal_${sessionId}`).subscribe();

        let testRunId: string | undefined;
        const MAX_RETRIES = 2;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // ── 0. Fetch session config ──────────────────────────────────
                await this.log(sessionId, url, 'neutral', `Mission started for ${persona.name}.`, { type: 'system', info: 'session_started' });

                const { data: sessionData, error: sessionError } = await (this.supabase
                    .from('persona_sessions') as any)
                    .select('*, persona_configs(*, projects(*))')
                    .eq('id', sessionId)
                    .single();

                if (sessionError || !sessionData) throw new Error(`Failed to fetch session: ${sessionError?.message}`);

                testRunId = sessionData.test_run_id;
                const executionMode = sessionData.execution_mode || 'autonomous';

                // Prefer the config passed directly (avoids stale/overwritten project data
                // when multiple concurrent test runs share the same project row).
                let provider: 'gemini' | 'openrouter' | 'ollama' | 'openai';
                let apiKey: string | undefined;
                let modelName: string | undefined;

                if (llmConfig) {
                    provider = llmConfig.provider;
                    apiKey = llmConfig.apiKey;
                    modelName = llmConfig.modelName;
                } else {
                    // Fallback: read from project (legacy path)
                    const project = sessionData.persona_configs?.projects;
                    provider = project?.llm_provider || 'gemini';
                    modelName = project?.llm_model_name || undefined;
                    if (project?.encrypted_llm_key) {
                        try { apiKey = decrypt(project.encrypted_llm_key); } catch (_) { }
                    }
                }

                this.llm = new LLMService({ provider, apiKey, modelName });

                if (attempt > 1) {
                    await this.log(sessionId, url, 'neutral', 'Recovery restart after crash.', { type: 'system', info: 'session_retry' });
                }

                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'running',
                    started_at: new Date().toISOString(),
                    is_paused: executionMode === 'manual'
                }).eq('id', sessionId);

                // ── 1. Browser init ──────────────────────────────────────────
                this.updateLiveStatus(sessionId, 'Initializing browser...');
                await this.log(sessionId, url, 'neutral', 'Initializing browser engine.', { type: 'system', info: 'browser_init' });

                // Stagehand model for browser automation — separate from the LLM reasoning model.
                // OpenRouter users: Stagehand still uses Gemini via env key (OpenRouter key is for reasoning only).
                const stagehandModel =
                    provider === 'openai' ? 'gpt-4o' :
                        provider === 'openrouter' ? 'google/gemini-2.0-flash' :
                            provider === 'gemini' ? 'google/gemini-2.0-flash' : 'gpt-4o';

                const stagehandApiKey = provider === 'openrouter'
                    ? (process.env.GEMINI_API_KEY || apiKey)
                    : apiKey;

                await this.browser.init(stagehandModel, stagehandApiKey);

                // ── 2. Serial page traversal ─────────────────────────────────
                // On retries after a BrowserBase timeout, restore already-visited
                // pages from logs so we skip them and resume from the last page.
                const resumeState = attempt > 1 ? await this.buildResumeState(sessionId) : null;
                await this.runTraversal(sessionId, url, persona, executionMode, resumeState);

                // ── 3. Complete ──────────────────────────────────────────────
                await this.flushLogs(); // flush any remaining buffered logs

                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    exit_reason: 'Goals met or page budget exhausted'
                }).eq('id', sessionId);

                await this.log(sessionId, url, 'delight', 'Session completed.', { type: 'system', info: 'session_completed' });
                await this.flushLogs();
                break; // success — exit retry loop

            } catch (err: any) {
                console.error(`❌ Session ${sessionId} attempt ${attempt} failed:`, err.message);
                this.updateLiveStatus(sessionId, `❌ Error: ${err.message}`);

                const isTimeout = this.isBrowserbaseTimeout(err);

                if (attempt < MAX_RETRIES) {
                    await this.browser.close().catch(() => { });
                    await this.flushLogs();
                    if (isTimeout) {
                        await this.log(sessionId, url, 'neutral',
                            'BrowserBase session timed out — opening a new browser session and resuming from last page.',
                            { type: 'system', info: 'session_retry' });
                    }
                    continue;
                }
                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'error',
                    error_message: err.message,
                    completed_at: new Date().toISOString()
                }).eq('id', sessionId);
            } finally {
                await this.browser.close().catch(() => { });
                await this.flushLogs();
                if (testRunId) await checkAndFinalizeTestRun(testRunId).catch(() => { });
            }
        }
    }

    // ─── BrowserBase timeout detection ────────────────────────────────────────

    private isBrowserbaseTimeout(err: any): boolean {
        const msg: string = (err?.message ?? '').toLowerCase();
        return msg.includes('timed out') || msg.includes('socket-close') || msg.includes('cdp transport closed');
    }

    // ─── Resume state reconstruction ──────────────────────────────────────────

    private async buildResumeState(sessionId: string): Promise<{ visited: Set<string>; resumeUrl: string | null }> {
        const { data: logs } = await (this.supabase
            .from('session_logs') as any)
            .select('current_url, step_number')
            .eq('session_id', sessionId)
            .not('current_url', 'is', null)
            .order('step_number', { ascending: true });

        const visited = new Set<string>(
            (logs || []).map((l: any) => this.normalizeUrl(l.current_url)).filter(Boolean)
        );

        const lastLog = (logs || []).at(-1);
        const resumeUrl = lastLog?.current_url ?? null;

        console.log(`♻️  Resume: ${visited.size} pages already done, re-entering at: ${resumeUrl}`);
        return { visited, resumeUrl };
    }

    // ─── Serial traversal ─────────────────────────────────────────────────────

    private async runTraversal(
        sessionId: string,
        startUrl: string,
        persona: PersonaProfile,
        executionMode: string,
        resume?: { visited: Set<string>; resumeUrl: string | null } | null
    ) {
        // On resume: restore visited set and re-enter at the last page so its
        // links get harvested and unvisited pages continue to be explored.
        const visited = resume?.visited ?? new Set<string>();
        const queue: string[] = resume?.resumeUrl && resume.resumeUrl !== startUrl
            ? [resume.resumeUrl, startUrl]  // re-harvest last page first, then fall back
            : [startUrl];
        const history: Action[] = [];
        const triedElementsOnUrl = new Map<string, Set<string>>();
        const blacklistedActions = new Set<string>();

        // Confine traversal to the target origin — never follow external links
        let targetOrigin: string;
        try { targetOrigin = new URL(startUrl).origin; } catch { targetOrigin = ''; }

        let totalActions = 0;

        while (queue.length > 0 && visited.size < MAX_PAGES) {
            const pageUrl = queue.shift()!;
            const normalizedPageUrl = this.normalizeUrl(pageUrl);

            if (visited.has(normalizedPageUrl)) continue;
            visited.add(normalizedPageUrl);

            console.log(`\n📄 [${visited.size}/${MAX_PAGES}] Navigating to: ${pageUrl}`);
            this.updateLiveStatus(sessionId, `Page ${visited.size}/${MAX_PAGES}: ${pageUrl}`);

            // Check session hasn't been abandoned
            const { data: latestSession } = await (this.supabase.from('persona_sessions') as any)
                .select('status').eq('id', sessionId).single();
            if (latestSession?.status === 'abandoned' || latestSession?.status === 'completed') return;

            await this.browser.navigate(pageUrl);

            // ── Auth page heuristic — skip before any LLM call ──────────────
            // Detect auth/login/signup pages by URL pattern and skip immediately.
            // The LLM prompt also enforces this, but this guard saves token calls entirely.
            const AUTH_URL_PATTERN = /\/(login|signin|sign-in|signup|sign-up|register|auth|account\/create|join|onboarding)(\/|\?|$)/i;
            if (AUTH_URL_PATTERN.test(pageUrl)) {
                console.log(`  🔒 Auth page detected, skipping: ${pageUrl}`);
                this.log(sessionId, pageUrl, 'neutral',
                    'Auth/login page detected. Skipping interaction — the engine does not fill credentials. ' +
                    'UX note: the presence of this gate is itself a friction point for new users.',
                    { type: 'system', info: 'auth_page_skipped' });
                this.stepNumber++;
                await this.flushLogs();
                continue;
            }

            // ── Full-page scan (one LLM call for all sections) ──────────────
            const observation = await this.browser.observeFullPage();

            if (observation.sections && observation.sections.length > 0) {
                this.updateLiveStatus(sessionId, `Scanning ${observation.sections.length} sections of ${pageUrl}...`);

                // Single multi-image LLM call — replaces N separate analyzeSection() calls
                const scanResult = await this.llm.analyzePageSections(
                    observation.sections,
                    observation.url,
                    observation.title,
                    persona
                ).catch(() => null);

                if (scanResult) {
                    // Log one entry per section with the rich per-section feedback
                    for (const sectionResult of scanResult.sections) {
                        const matchedSection = observation.sections.find(s => s.label === sectionResult.label)
                            || observation.sections[0];

                        const localPath = await this.saveScreenshot(sessionId, this.stepNumber, matchedSection.screenshot);
                        this.log(sessionId, observation.url, this.mapEmotion(sectionResult.emotional_state),
                            sectionResult.ux_feedback,
                            {
                                type: 'system',
                                info: `scan_${(sectionResult.label || 'section').toLowerCase()}`,
                                proposed_solution: sectionResult.proposed_solution,
                                specific_emotion: sectionResult.emotional_state,
                                local_screenshot_path: localPath
                            },
                            matchedSection.screenshot
                        );
                        this.stepNumber++;
                    }
                }

                // Harvest links from this page and add new unique paths to queue
                const links = await this.browser.getContentLinks(LINK_HARVEST_MAX);
                for (const link of links) {
                    const normalized = this.normalizeUrl(link);
                    if (!visited.has(normalized) && !queue.map(q => this.normalizeUrl(q)).includes(normalized)) {
                        queue.push(link);
                    }
                }

                console.log(`  ↪ Discovered ${links.length} links, queue depth: ${queue.length}`);
            }

            // ── Interactive exploration of this page ────────────────────────

            let pageActions = 0;
            let consecutiveSame = 0;
            let lastActionKey = '';

            while (pageActions < MAX_ACTIONS_PAGE) {

                if (executionMode === 'manual') {
                    this.updateLiveStatus(sessionId, 'Waiting for command (Manual Mode)...');
                    await this.waitForStepSignal(sessionId);
                }

                const currentUrl = await this.browser.evaluate(() => window.location.href).catch(() => pageUrl);
                const normalizedCurrentUrl = this.normalizeUrl(currentUrl);

                // Use a lightweight observe for action decision (no full page re-scan)
                const actionObservation = await this.browser.observe();
                const tried = Array.from(triedElementsOnUrl.get(normalizedCurrentUrl) || []);

                this.updateLiveStatus(sessionId, `Page ${visited.size} | Action ${pageActions + 1}/${MAX_ACTIONS_PAGE} | Thinking...`);

                const action = await this.llm.decideNextAction(
                    actionObservation, persona, history,
                    Array.from(blacklistedActions), tried
                );

                // AI wants to exit this node
                if (action.type === 'skip_node' || action.type === 'fail' || action.type === 'complete') {
                    console.log(`  🛑 AI exits page (${action.type}): ${action.reasoning}`);
                    this.log(sessionId, currentUrl, this.mapEmotion(action.emotional_state),
                        `Node skip: ${action.reasoning}`, action as any);
                    this.stepNumber++;
                    // 'complete' = satisfied with this page → continue to next page in queue
                    // 'fail' / 'skip_node' = give up on this page → continue to next page in queue
                    // Neither should end the whole traversal — that only happens when the queue is empty
                    break;
                }

                // Loop detection
                const actionKey = `${action.type}::${action.text || action.selector || ''}`;
                if (actionKey === lastActionKey) {
                    consecutiveSame++;
                } else {
                    consecutiveSame = 0;
                    lastActionKey = actionKey;
                }

                if (consecutiveSame >= MAX_SAME_ACTIONS) {
                    if (action.text) blacklistedActions.add(action.text);
                    if (action.selector) blacklistedActions.add(action.selector);
                    console.warn(`  ⚠️ Loop detected on "${actionKey}", blacklisting.`);
                    consecutiveSame = 0;
                    // Recovery scroll
                    await this.browser.perform({ type: 'scroll', text: 'bottom', reasoning: 'Loop recovery', emotional_state: 'neutral', emotional_intensity: 0.1 });
                    continue;
                }

                // Track tried elements for this URL
                if (action.type === 'click') {
                    if (!triedElementsOnUrl.has(normalizedCurrentUrl)) triedElementsOnUrl.set(normalizedCurrentUrl, new Set());
                    const tried = triedElementsOnUrl.get(normalizedCurrentUrl)!;
                    if (action.text) tried.add(action.text);
                    if (action.selector) tried.add(action.selector);
                }

                // Resolve click coordinates for heatmap data
                let clickCoords: any = null;
                if (action.type === 'click') {
                    clickCoords = await this.resolveCoords(action, actionObservation.domContext);
                }

                // Execute
                this.updateLiveStatus(sessionId, `Page ${visited.size} | ${action.type}: ${action.text || ''}`);
                await this.browser.perform(action);

                const postUrl = await this.browser.evaluate(() => window.location.href).catch(() => currentUrl);
                const metrics = this.browser.getMetrics();

                // Log step
                const postObservation = await this.browser.observe();
                const localPath = await this.saveScreenshot(sessionId, this.stepNumber, postObservation.screenshot);

                this.log(sessionId, postUrl, this.mapEmotion(action.emotional_state),
                    action.reasoning,
                    {
                        ...action,
                        coordinates: clickCoords,
                        local_screenshot_path: localPath,
                        technical_metrics: {
                            latency_ms: metrics.last_load_time,
                            broken_links_count: metrics.broken_links.length
                        }
                    } as any,
                    postObservation.screenshot
                );

                action.current_url = postUrl;
                history.push(action);
                this.stepNumber++;
                pageActions++;
                totalActions++;

                // If the action navigated away, check origin before enqueuing
                const normalizedPost = this.normalizeUrl(postUrl);
                if (normalizedPost !== normalizedCurrentUrl) {
                    // Detect external navigation (e.g. YouTube, social media links)
                    let postOrigin: string;
                    try { postOrigin = new URL(postUrl).origin; } catch { postOrigin = ''; }

                    if (targetOrigin && postOrigin && postOrigin !== targetOrigin) {
                        // Left the target site — go back immediately
                        console.log(`  🚫 External navigation blocked: ${postUrl} (origin: ${postOrigin}). Returning to ${currentUrl}`);
                        this.log(sessionId, currentUrl, 'neutral',
                            `External link skipped — navigated to ${new URL(postUrl).hostname} but returned to stay within the test scope.`,
                            { type: 'system', info: 'external_navigation_blocked', external_url: postUrl });
                        this.stepNumber++;
                        await this.browser.navigate(currentUrl);
                        break;
                    }

                    // Same-origin navigation — enqueue if not yet visited
                    if (!visited.has(normalizedPost)) {
                        queue.unshift(postUrl); // priority: visit where we landed next
                    }
                    break;
                }

                if (executionMode === 'manual') {
                    await (this.supabase.from('persona_sessions') as any)
                        .update({ is_paused: true, step_requested: false }).eq('id', sessionId);
                }

                // Flush buffered logs every N steps
                if (totalActions % DB_FLUSH_INTERVAL === 0) {
                    await this.flushLogs();
                }
            }
        }

        await this.flushLogs();
    }

    // ─── Log buffer ───────────────────────────────────────────────────────────

    private log(
        sessionId: string,
        url: string,
        emotion: string,
        monologue: string,
        action: any,
        screenshotBase64?: string
    ) {
        this.logBuffer.push({
            session_id: sessionId,
            step_number: this.stepNumber,
            current_url: url,
            screenshot_url: screenshotBase64 ? `data:image/jpeg;base64,${screenshotBase64}` : undefined,
            emotion_tag: emotion,
            inner_monologue: monologue,
            action_taken: action
        });
    }

    private async flushLogs() {
        if (this.logBuffer.length === 0) return;
        const batch = [...this.logBuffer];
        this.logBuffer = [];
        try {
            const { error } = await (this.supabase.from('session_logs') as any).insert(batch);
            if (error) console.error('❌ Log flush error:', error.message);
        } catch (err: any) {
            console.error('❌ Log flush exception:', err.message);
        }
    }

    // ─── Coordinate resolution ────────────────────────────────────────────────

    private async resolveCoords(action: Action, domContext: string | undefined): Promise<any> {
        // Try selector first
        if (action.selector) {
            const coords = await this.browser.evaluate((sel: string) => {
                const el = sel.startsWith('xpath=')
                    ? (document.evaluate(sel.slice(6), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement)
                    : document.querySelector(sel) as HTMLElement;
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
            }, action.selector).catch(() => null);
            if (coords) return coords;
        }

        // Fallback: match by text in DOM context
        if (action.text && domContext) {
            try {
                const dom = JSON.parse(domContext);
                const target = (action.text || '').toLowerCase();
                const match = dom.find((el: any) =>
                    el.text && el.text.toLowerCase().includes(target) && el.coordinates
                );
                if (match?.coordinates) {
                    const c = match.coordinates;
                    return { x: Math.round(c.x + c.w / 2), y: Math.round(c.y + c.h / 2), w: c.w, h: c.h };
                }
            } catch (_) { }
        }

        return null;
    }

    // ─── Screenshot persistence ───────────────────────────────────────────────

    private async saveScreenshot(sessionId: string, step: number, base64: string): Promise<string> {
        try {
            const dir = path.join(process.cwd(), 'public', 'screenshots', sessionId);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const file = `step_${step}.jpg`;
            fs.writeFileSync(path.join(dir, file), Buffer.from(base64, 'base64'));
            return `/screenshots/${sessionId}/${file}`;
        } catch (_) {
            return '';
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private updateLiveStatus(sessionId: string, status: string) {
        console.log(`📡 [${sessionId.slice(0, 8)}] ${status}`);
        
        // 1. Existing DB update
        void (this.supabase.from('persona_sessions') as any)
            .update({ live_status: status }).eq('id', sessionId);

        // 2. Broadcast live diagnostics (no DB load)
        if (this.channel) {
            void this.channel.send({
                type: 'broadcast',
                event: 'log',
                payload: { message: status, timestamp: new Date().toISOString() }
            });
        }
    }

    private async waitForStepSignal(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { clearInterval(interval); reject(new Error('Manual step timeout')); }, 600_000);
            const interval = setInterval(async () => {
                const { data } = await (this.supabase.from('persona_sessions') as any)
                    .select('step_requested').eq('id', sessionId).single();
                if (data?.step_requested) { clearInterval(interval); clearTimeout(timeout); resolve(); }
            }, 2000);
        });
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
            let p = u.pathname;
            if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
            return `${u.protocol}//${host}${p}`.toLowerCase();
        } catch {
            return url.toLowerCase().split('?')[0].split('#')[0].replace(/\/$/, '');
        }
    }
}