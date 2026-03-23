import { Stagehand } from '@browserbasehq/stagehand';
import { Observation, ObservationSection, HeuristicMetrics, Action } from './types';
import { chromium } from 'playwright-core';

// Interactive roles worth sending to the LLM — everything else is structural noise
const INTERACTIVE_ROLES = new Set([
    'link', 'button', 'textbox', 'searchbox', 'combobox', 'listbox',
    'menuitem', 'tab', 'checkbox', 'radio', 'switch', 'spinbutton',
    'slider', 'option', 'treeitem', 'menuitemcheckbox', 'menuitemradio'
]);

export class BrowserService {
    private stagehand: Stagehand | null = null;
    private page: any = null;
    private savedConfig: any = null;       // saved for reconnect
    private lastKnownUrl: string = '';     // last navigated URL, restored after reconnect
    private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    private reconnecting = false;  // prevents concurrent reconnect attempts
    private metrics: HeuristicMetrics = {
        broken_links: [],
        navigation_latency: [],
        request_failures: 0,
        action_latency: [],
        last_load_time: 0
    };

    // ─── CDP error detection ────────────────────────────────────────────────────

    private static isCdpError(err: any): boolean {
        const msg: string = (err?.message || err?.toString() || '').toLowerCase();
        return (
            msg.includes('cdp transport closed') ||
            msg.includes('websocket') ||
            msg.includes('fin must be set') ||
            msg.includes('socket-error') ||
            msg.includes('econnreset') ||
            msg.includes('econnrefused') ||
            msg.includes('target closed') ||
            msg.includes('session closed')
        );
    }

    // ─── Reconnect ──────────────────────────────────────────────────────────────

    private async reconnect(): Promise<void> {
        if (this.reconnecting) return;
        this.reconnecting = true;
        console.warn('CDP dropped — reconnecting to Browserless...');
        this.stopKeepalive();
        try {
            try { await this.stagehand?.close(); } catch { /* already dead */ }
            this.stagehand = null;
            this.page = null;

            if (!this.savedConfig) throw new Error('No saved config — cannot reconnect.');

            this.stagehand = new Stagehand(this.savedConfig);
            console.log('Re-initializing Stagehand...');
            await this.stagehand.init();
            await this.setupPage();

            if (this.lastKnownUrl) {
                console.log(`Restoring to: ${this.lastKnownUrl}`);
                await this.navigate(this.lastKnownUrl);
            }
            console.log('Reconnected.');
        } finally {
            this.reconnecting = false;
        }
    }

    // ─── Wrap any browser call with auto-reconnect (one retry) ─────────────────

    private async withReconnect<T>(fn: () => Promise<T>): Promise<T> {
        // If keepalive already triggered a reconnect, wait for it to finish first
        if (this.reconnecting) {
            await new Promise<void>(resolve => {
                const check = setInterval(() => {
                    if (!this.reconnecting) { clearInterval(check); resolve(); }
                }, 200);
            });
        }
        try {
            return await fn();
        } catch (err: any) {
            if (BrowserService.isCdpError(err)) {
                console.warn(`CDP error: "${err.message}" — attempting reconnect...`);
                await this.reconnect();
                return await fn();  // retry once on fresh connection
            }
            throw err;
        }
    }

    // ─── Init ───────────────────────────────────────────────────────────────────

    async init(modelName: string = 'google/gemini-2.0-flash', apiKey?: string) {
        try {
            const useBrowserless = !!process.env.BROWSERLESS_WS_URL;
            // Browserbase requires explicit opt-in via USE_BROWSERBASE=true.
            // Having API keys alone is not enough — prevents accidental usage in local dev.
            const useBrowserBase = !useBrowserless && process.env.USE_BROWSERBASE === 'true' && !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);

            const isGemini = modelName.includes('gemini');
            const resolvedApiKey = isGemini
                ? (apiKey || process.env.GEMINI_API_KEY)
                : (apiKey || process.env.OPENAI_API_KEY);

            const stagehandConfig: any = {
                env: useBrowserBase ? 'BROWSERBASE' : 'LOCAL',
                verbose: 0,
                disableAPI: true,
                model: {
                    modelName,
                    apiKey: resolvedApiKey,
                },
            };

            if (useBrowserBase) {
                stagehandConfig.apiKey = process.env.BROWSERBASE_API_KEY;
                stagehandConfig.projectId = process.env.BROWSERBASE_PROJECT_ID;
                // 30 min timeout — enough for 15-page traversal with LLM inference
                stagehandConfig.browserbaseSessionCreateParams = { timeout: 1800 };
            } else if (useBrowserless) {
                // Pass cdpUrl directly — Stagehand connects to Browserless natively.
                // No local Chromium binary needed on the app server.
                const raw = process.env.BROWSERLESS_WS_URL!;
                // Normalize: add wss:// if the user omitted the protocol
                const wsUrl = /^wss?:\/\//i.test(raw) ? raw : `wss://${raw}`;
                console.log(`Browserless mode: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
                stagehandConfig.localBrowserLaunchOptions = {
                    cdpUrl: wsUrl,
                    viewport: { width: 1280, height: 800 },
                    ignoreHTTPSErrors: true,
                };
            } else {
                // LOCAL: launch Playwright's bundled Chromium directly on this machine
                let executablePath: string | undefined;
                try {
                    executablePath = chromium.executablePath();
                } catch {
                    // Falls back to chrome-launcher's auto-discovery (local dev)
                }
                stagehandConfig.localBrowserLaunchOptions = {
                    headless: true,
                    executablePath,
                    viewport: { width: 1280, height: 800 }
                };
            }

            this.savedConfig = stagehandConfig; // save for reconnect
            this.stagehand = new Stagehand(stagehandConfig);

            console.log('Initializing Stagehand...');
            await this.stagehand.init();
            await this.setupPage();
            console.log('Stagehand ready.');
        } catch (err: any) {
            console.error('Stagehand init failed:', err.message);
            throw err;
        }
    }

    // ─── Page setup (shared by init and reconnect) ──────────────────────────────

    private async setupPage(): Promise<void> {
        const context = (this.stagehand as any).context;
        if (!context) throw new Error('Stagehand failure: Context not found after init.');

        const allPages = context.pages ? context.pages() : [];
        this.page = (context.activePage ? context.activePage() : null) || allPages[0];

        if (!this.page) {
            console.log('Forcing newPage()...');
            this.page = await context.newPage();
        }

        const pwContext = this.page?.context ? this.page.context() : context;
        if (pwContext && typeof pwContext.on === 'function') {
            this.attachNetworkListeners(pwContext);
            pwContext.on('page', async (newPage: any) => {
                console.log(`New tab: ${newPage.url()}. Switching...`);
                this.page = newPage;
                await newPage.bringToFront().catch(() => { });
                await newPage.setViewportSize?.({ width: 1280, height: 800 }).catch(() => { });
            });
        }

        if (!this.page) throw new Error('Stagehand failure: Page object not found.');
        await this.page.setViewportSize?.({ width: 1280, height: 800 }).catch(() => { });

        this.startKeepalive();
    }

    // ─── Keepalive — prevents Railway proxy from dropping idle WebSocket ─────────

    private startKeepalive() {
        this.stopKeepalive();
        // Only needed when using a remote browser over WebSocket (Browserless/Browserbase)
        if (!this.savedConfig?.localBrowserLaunchOptions?.cdpUrl && this.savedConfig?.env !== 'BROWSERBASE') return;

        this.keepaliveTimer = setInterval(async () => {
            try {
                if (this.page) await this.page.evaluate(() => 1);
            } catch (err: any) {
                if (BrowserService.isCdpError(err) && !this.reconnecting) {
                    // Proactively reconnect while LLM is thinking — so the browser
                    // is ready when the next browser operation comes in.
                    console.warn('Keepalive detected CDP drop — triggering proactive reconnect...');
                    this.reconnect().catch(e => console.error('Proactive reconnect failed:', e.message));
                }
            }
        }, 25_000); // 25s — well under Railway's ~60s idle timeout
    }

    private stopKeepalive() {
        if (this.keepaliveTimer) {
            clearInterval(this.keepaliveTimer);
            this.keepaliveTimer = null;
        }
    }

    // ─── Network ────────────────────────────────────────────────────────────────

    private attachNetworkListeners(target: any) {
        if (!target || typeof target.on !== 'function') return;
        try {
            target.on('response', (response: any) => {
                try {
                    const status = typeof response.status === 'function' ? response.status() : 0;
                    if (status >= 400) {
                        const url = typeof response.url === 'function' ? response.url() : 'unknown';
                        if (!this.metrics.broken_links.includes(url)) {
                            this.metrics.broken_links.push(`${status}: ${url}`);
                        }
                    }
                } catch (_) { }
            });
            target.on('requestfailed', (request: any) => {
                this.metrics.request_failures++;
                try {
                    const url = typeof request.url === 'function' ? request.url() : 'unknown';
                    const err = typeof request.failure === 'function' ? request.failure()?.errorText : 'unknown';
                    console.warn(`Request failed: ${url} — ${err}`);
                } catch (_) { }
            });
        } catch (_) { }
    }

    // ─── Navigation ─────────────────────────────────────────────────────────────

    async navigate(url: string) {
        if (!this.page) return;
        const start = Date.now();
        try {
            await this.withReconnect(() =>
                this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
            );
            await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
            const duration = Date.now() - start;
            this.metrics.navigation_latency.push(duration);
            this.metrics.last_load_time = duration;
            this.lastKnownUrl = url;
        } catch (err: any) {
            console.error(`Navigation to ${url} failed:`, err.message);
        }
    }

    // ─── DOM extraction ─────────────────────────────────────────────────────────

    /**
     * Returns only interactive elements visible in the current viewport.
     * Deduplicates by text+role so the LLM sees a clean, compact list.
     * Max 30 elements — enough for decision-making, not so many it blows the context.
     */
    private async extractInteractiveElements(): Promise<any[]> {
        if (!this.page || !this.stagehand) return [];
        try {
            const observations: any[] = await this.stagehand.observe({ page: this.page }).catch(() => []);

            const seen = new Set<string>();
            const elements: any[] = [];

            for (const ob of observations) {
                if (!ob.selector) continue;

                const text = (ob.description || ob.label || '').trim().slice(0, 80);
                const role = (ob.method || 'element').toLowerCase();
                const key = `${role}::${text}`;

                // Skip structural noise and duplicates
                if (!text || seen.has(key)) continue;
                if (text.length < 2) continue;
                seen.add(key);

                // Resolve coordinates
                let coords: any = null;
                try {
                    coords = await this.page.evaluate((sel: string) => {
                        const el = sel.startsWith('xpath=')
                            ? (document.evaluate(sel.slice(6), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement)
                            : document.querySelector(sel) as HTMLElement;
                        if (!el) return null;
                        const r = el.getBoundingClientRect();
                        // Exclude off-screen elements
                        if (r.width === 0 || r.height === 0) return null;
                        if (r.bottom < 0 || r.top > window.innerHeight) return null;
                        return {
                            x: Math.round(r.left + window.scrollX),
                            y: Math.round(r.top + window.scrollY),
                            w: Math.round(r.width),
                            h: Math.round(r.height)
                        };
                    }, ob.selector).catch(() => null);
                } catch (_) { }

                elements.push({
                    index: elements.length,
                    role,
                    text,
                    selector: ob.selector,
                    coordinates: coords
                });

                if (elements.length >= 30) break;
            }

            return elements;
        } catch (_) {
            return [];
        }
    }

    // ─── Capture a single viewport slice ────────────────────────────────────────

    /**
     * Captures screenshot + interactive elements at the current scroll position.
     * Uses quality=40 for section scans (good enough for vision analysis)
     * and quality=60 for the primary decision-making screenshot.
     */
    private async captureSlice(label: string, highQuality = false): Promise<ObservationSection> {
        if (!this.page) throw new Error('Browser not initialized');

        await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => { });
        await this.page.waitForTimeout(highQuality ? 400 : 200);

        const scrollY = await this.page.evaluate(() => window.scrollY).catch(() => 0);
        const screenshot = await this.page.screenshot({
            type: 'jpeg',
            quality: highQuality ? 60 : 40  // 40% is plenty for multi-section visual analysis
        });

        // Only extract DOM on the primary (high-quality) slice to avoid redundant Stagehand calls
        const domContext = highQuality
            ? JSON.stringify(await this.extractInteractiveElements())
            : '[]';

        return {
            screenshot: screenshot.toString('base64'),
            domContext,
            label,
            scrollY
        };
    }

    // ─── Full-page scan: Top / Mid / Bottom + primary view ──────────────────────

    /**
     * Captures up to 3 viewport slices across the full page height,
     * then returns to the top for a primary high-quality capture.
     *
     * Returns an Observation where:
     *  - screenshot / domContext = primary top-view (for LLM decision)
     *  - sections = [Top, Mid?, Bottom?] — all passed to analyzePageSections() in ONE call
     */
    async observeFullPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this.withReconnect(() => this._observeFullPage()).catch(() => this.emptyObservation());
    }

    private async _observeFullPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) {
            return this.emptyObservation();
        }

        const sections: ObservationSection[] = [];

        // Top
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(300);
        sections.push(await this.captureSlice('Top'));

        // Mid and Bottom (only if page is tall enough to warrant it)
        const { vh, dh } = await this.page.evaluate(() => ({
            vh: window.innerHeight,
            dh: document.documentElement.scrollHeight
        }));

        if (dh > vh * 1.5) {
            await this.page.evaluate((y: number) => window.scrollTo(0, y), Math.round(vh * 0.85));
            await this.page.waitForTimeout(300);
            sections.push(await this.captureSlice('Mid'));
        }

        if (dh > vh * 2.2) {
            await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await this.page.waitForTimeout(300);
            sections.push(await this.captureSlice('Bottom'));
        }

        // Return to top and do the primary rich capture (with DOM)
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(300);
        const primary = await this.captureSlice('Primary', true);

        // Replace the low-quality Top screenshot with the high-quality primary
        if (sections.length > 0) sections[0] = { ...primary, label: 'Top' };

        return {
            screenshot: primary.screenshot,
            domContext: primary.domContext,
            url: this.page.url(),
            title: await this.page.title(),
            dimensions: { width: 1280, height: 800 },
            sections
        };
    }

    // ─── Light observe: current viewport only (post-action checks) ──────────────

    async observe(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this.withReconnect(async () => {
            const slice = await this.captureSlice('Current', true);
            return {
                screenshot: slice.screenshot,
                domContext: slice.domContext,
                url: this.page.url(),
                title: await this.page.title(),
                dimensions: { width: 1280, height: 800 },
                sections: [slice]
            };
        }).catch(() => this.emptyObservation());
    }

    private emptyObservation(): Observation {
        return {
            screenshot: '',
            url: '',
            title: '',
            domContext: '[]',
            dimensions: { width: 1280, height: 800 }
        };
    }

    // ─── Actions ────────────────────────────────────────────────────────────────

    async perform(action: Action) {
        if (!this.page || !this.stagehand) throw new Error('Browser not initialized');
        return this.withReconnect(() => this._perform(action));
    }

    private async _perform(action: Action) {
        if (!this.page || !this.stagehand) throw new Error('Browser not initialized');

        const oldUrl = this.page.url();
        const oldPageCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;

        try {
            switch (action.type) {
                case 'click':
                case 'type': {
                    const instruction = action.type === 'click'
                        ? `Click on: ${action.text || action.reasoning}`
                        : `Type "${action.text}" into the field for: ${action.reasoning}`;

                    console.log(`Stagehand: ${instruction}`);
                    const t0 = Date.now();
                    await this.stagehand.act(instruction, { page: this.page });
                    this.metrics.action_latency.push(Date.now() - t0);

                    // Wait for navigation or new tab
                    for (let i = 0; i < 5; i++) {
                        await this.page.waitForTimeout(800);
                        const newCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;
                        if (newCount > oldPageCount) {
                            const pages = (this.stagehand as any).context.pages();
                            this.page = pages[pages.length - 1];
                            await this.page.bringToFront?.().catch(() => { });
                            break;
                        }
                        if (this.page.url() !== oldUrl) break;
                    }
                    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
                    break;
                }

                case 'scroll':
                    if (action.text === 'top') {
                        await this.page.evaluate(() => window.scrollTo(0, 0));
                    } else if (action.text === 'bottom') {
                        await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                    } else {
                        await this.page.evaluate(() => window.scrollBy(0, 700));
                    }
                    break;

                case 'wait':
                    await this.page.waitForTimeout(2000);
                    break;
            }
        } catch (err) {
            // Re-throw CDP errors so withReconnect can catch and handle them
            if (BrowserService.isCdpError(err)) throw err;
            console.warn(`Stagehand action "${action.type}" failed:`, err);
            // Fallback: direct selector click
            if (action.type === 'click' && action.selector) {
                await this.page.click(action.selector, { timeout: 5000 }).catch(() => { });
            }
        }

        const newUrl = this.page.url();
        const newPageCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;
        if (newUrl !== oldUrl || newPageCount > oldPageCount) {
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
            this.lastKnownUrl = this.page.url();
        }
        await this.page.waitForTimeout(300);
    }

    // ─── Link harvesting ────────────────────────────────────────────────────────

    /**
     * Returns same-origin links that look like meaningful page content.
     * Filters out: assets, auth paths, pagination query params, hash links,
     * and known utility paths that add no UX value.
     */
    async getContentLinks(maxLinks = 20): Promise<string[]> {
        if (!this.page) return [];
        const origin = new URL(this.page.url()).origin;

        const SKIP_PATTERNS = [
            /\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|css|js|woff|ttf)(\?|$)/i,
            /\/(login|logout|signup|register|auth|oauth|callback|admin|api)\//i,
            /\?.*page=\d+/i,
            /\?.*sort=/i,
            /\?.*filter=/i,
            /#/
        ];

        try {
            const links: string[] = await this.page.evaluate((originStr: string) => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map((a: any) => a.href)
                    .filter((href: string) => {
                        try {
                            const u = new URL(href);
                            return u.origin === originStr && u.pathname !== '/';
                        } catch (_) { return false; }
                    });
            }, origin);

            // Apply server-side filters and deduplicate by pathname (strip query params)
            const seenPaths = new Set<string>();
            const filtered: string[] = [];

            for (const link of links) {
                if (SKIP_PATTERNS.some(p => p.test(link))) continue;
                try {
                    const u = new URL(link);
                    const path = u.pathname.replace(/\/$/, '').toLowerCase();
                    if (seenPaths.has(path)) continue;
                    seenPaths.add(path);
                    filtered.push(`${u.origin}${u.pathname}`); // strip query params for dedup
                    if (filtered.length >= maxLinks) break;
                } catch (_) { }
            }

            return filtered;
        } catch (_) {
            return [];
        }
    }

    // ─── Utilities ──────────────────────────────────────────────────────────────

    async evaluate<T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T> {
        if (!this.page) throw new Error('Browser not initialized');
        return this.page.evaluate(fn, ...args);
    }

    async waitForTimeout(ms: number) {
        if (this.page) await this.page.waitForTimeout(ms);
    }

    async close() {
        this.stopKeepalive();
        if (this.stagehand) await this.stagehand.close().catch(() => { });
        this.page = null;
        this.stagehand = null;
    }

    getMetrics(): HeuristicMetrics {
        return { ...this.metrics };
    }

    static async shutdown() { }
}