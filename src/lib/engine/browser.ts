import { Stagehand } from '@browserbasehq/stagehand';
import { Observation, ObservationSection, HeuristicMetrics, Action } from './types';


export class BrowserService {
    private stagehand: Stagehand | null = null;
    private page: any = null;
    private metrics: HeuristicMetrics = {
        broken_links: [],
        navigation_latency: [],
        request_failures: 0,
        action_latency: [],
        last_load_time: 0
    };
    // Snapshot taken at the start of each navigate() call so we can report
    // per-page deltas (broken links, request failures) rather than session totals.
    private _pageNavSnapshot = { brokenLinksCount: 0, requestFailures: 0 };

    // ─── Init ───────────────────────────────────────────────────────────────────

    async init(modelName: string = 'google/gemini-2.0-flash', apiKey?: string) {
        try {
            const isGemini = modelName.includes('gemini');
            const resolvedApiKey = isGemini
                ? (apiKey || process.env.GEMINI_API_KEY)
                : (apiKey || process.env.OPENAI_API_KEY);

            const useBrowserbase = !!process.env.BROWSERBASE_API_KEY;

            const stagehandConfig: any = useBrowserbase
                // ── Browserbase (Railway / production) ──────────────────────────────
                // Browser runs in Browserbase cloud — no local Chromium needed.
                // BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID must be set.
                ? {
                    env: 'BROWSERBASE',
                    apiKey: process.env.BROWSERBASE_API_KEY,
                    projectId: process.env.BROWSERBASE_PROJECT_ID,
                    verbose: 0,
                    disableAPI: true,
                    model: { modelName, apiKey: resolvedApiKey },
                }
                // ── Local Chromium (dev / no Browserbase configured) ─────────────────
                : {
                    env: 'LOCAL',
                    verbose: 0,
                    disableAPI: true,
                    model: { modelName, apiKey: resolvedApiKey },
                    localBrowserLaunchOptions: {
                        headless: true,
                        viewport: { width: 1280, height: 800 },
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--disable-extensions',
                            '--disable-plugins',
                            '--disable-background-networking',
                            '--disable-background-timer-throttling',
                            '--disable-sync',
                            '--disable-translate',
                            '--disable-default-apps',
                            '--disable-notifications',
                            '--disable-hang-monitor',
                            '--no-first-run',
                            '--mute-audio',
                            '--disable-component-update',
                        ]
                    }
                };

            console.log(`Initializing Stagehand (${useBrowserbase ? 'Browserbase' : 'local Chromium'})...`);
            this.stagehand = new Stagehand(stagehandConfig);
            await this.stagehand.init();
            await this.setupPage();
            console.log('Stagehand ready.');
        } catch (err: any) {
            console.error('Stagehand init failed:', err.message);
            throw err;
        }
    }

    // ─── Page setup ─────────────────────────────────────────────────────────────

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
        // Snapshot metrics before this page load so getLastPageMetrics() can return deltas
        this._pageNavSnapshot = {
            brokenLinksCount: this.metrics.broken_links.length,
            requestFailures: this.metrics.request_failures,
        };
        const start = Date.now();
        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            // 2 s cap — analytics/tracking scripts that never go idle shouldn't block capture
            await this.page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => { });
            const duration = Date.now() - start;
            this.metrics.navigation_latency.push(duration);
            this.metrics.last_load_time = duration;
        } catch (err: any) {
            console.error(`Navigation to ${url} failed:`, err.message);
        }
    }

    /**
     * Returns technical metrics for the most-recently navigated page:
     *   latency_ms          – time to DOMContentLoaded for this page
     *   broken_links_count  – 4xx/5xx responses captured during this page load
     *   request_failures    – network-level failures during this page load
     * Uses deltas from the snapshot taken at the start of navigate() so values
     * are per-page, not cumulative across the whole session.
     */
    getLastPageMetrics(): { latency_ms: number; broken_links_count: number; request_failures: number } {
        return {
            latency_ms: this.metrics.last_load_time,
            broken_links_count: this.metrics.broken_links.length - this._pageNavSnapshot.brokenLinksCount,
            request_failures: this.metrics.request_failures - this._pageNavSnapshot.requestFailures,
        };
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

                if (!text || seen.has(key)) continue;
                if (text.length < 2) continue;
                seen.add(key);

                let coords: any = null;
                try {
                    coords = await this.page.evaluate((sel: string) => {
                        const el = sel.startsWith('xpath=')
                            ? (document.evaluate(sel.slice(6), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement)
                            : document.querySelector(sel) as HTMLElement;
                        if (!el) return null;
                        const r = el.getBoundingClientRect();
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

    private async captureSlice(label: string, highQuality = false): Promise<ObservationSection> {
        if (!this.page) throw new Error('Browser not initialized');

        // Page is already loaded (navigate() waited for domcontentloaded).
        // Only a short paint-settle delay is needed here — waiting again for
        // domcontentloaded costs up to 2 s per slice (4 slices = up to 8 s wasted).
        await this.page.waitForTimeout(80);

        const scrollY = await this.page.evaluate(() => window.scrollY).catch(() => 0);
        const screenshot = await this.page.screenshot({
            type: 'jpeg',
            quality: highQuality ? 60 : 40
        });

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

    async observeFullPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this._observeFullPage().catch(() => this.emptyObservation());
    }

    private async _observeFullPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();

        const sections: ObservationSection[] = [];

        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(300);
        sections.push(await this.captureSlice('Top'));

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

        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(300);
        const primary = await this.captureSlice('Primary', true);

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
        try {
            const slice = await this.captureSlice('Current', true);
            return {
                screenshot: slice.screenshot,
                domContext: slice.domContext,
                url: this.page.url(),
                title: await this.page.title(),
                dimensions: { width: 1280, height: 800 },
                sections: [slice]
            };
        } catch {
            return this.emptyObservation();
        }
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
        return this._perform(action);
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
            console.warn(`Stagehand action "${action.type}" failed:`, err);
            if (action.type === 'click' && action.selector) {
                await this.page.click(action.selector, { timeout: 5000 }).catch(() => { });
            }
        }

        const newUrl = this.page.url();
        const newPageCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;
        if (newUrl !== oldUrl || newPageCount > oldPageCount) {
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
        }
        await this.page.waitForTimeout(300);
    }

    // ─── Link harvesting ────────────────────────────────────────────────────────

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

            const seenPaths = new Set<string>();
            const filtered: string[] = [];

            for (const link of links) {
                if (SKIP_PATTERNS.some(p => p.test(link))) continue;
                try {
                    const u = new URL(link);
                    const path = u.pathname.replace(/\/$/, '').toLowerCase();
                    if (seenPaths.has(path)) continue;
                    seenPaths.add(path);
                    filtered.push(`${u.origin}${u.pathname}`);
                    if (filtered.length >= maxLinks) break;
                } catch (_) { }
            }

            return filtered;
        } catch (_) {
            return [];
        }
    }

    // ─── Fast page scan (no stagehand.observe — saves ~3-5s per page) ───────────
    //
    // Used by the Crawl-Reason-Repeat engine.  The LLM receives screenshots only;
    // it does not need DOM context (domContext) during the reasoning phase, so we
    // skip the expensive stagehand.observe() call that captureSlice('Primary', true)
    // would trigger.

    async observeFastPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this._observeFastPage().catch(() => this.emptyObservation());
    }

    private async _observeFastPage(): Promise<Observation> {
        if (!this.page) return this.emptyObservation();

        const sections: ObservationSection[] = [];

        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(50);
        sections.push(await this.captureSlice('Top'));

        const { vh, dh } = await this.page.evaluate(() => ({
            vh: window.innerHeight,
            dh: document.documentElement.scrollHeight
        }));

        if (dh > vh * 1.5) {
            await this.page.evaluate((y: number) => window.scrollTo(0, y), Math.round(vh * 0.85));
            await this.page.waitForTimeout(50);
            sections.push(await this.captureSlice('Mid'));
        }

        if (dh > vh * 2.2) {
            await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await this.page.waitForTimeout(50);
            sections.push(await this.captureSlice('Bottom'));
        }

        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(50);
        // Low-quality primary — no stagehand.observe, just a screenshot
        const primary = await this.captureSlice('Primary');

        if (sections.length > 0) {
            sections[0] = { ...primary, label: 'Top' };
        } else {
            sections.push(primary);
        }

        return {
            screenshot: primary.screenshot,
            domContext: '[]',
            url: this.page.url(),
            title: await this.page.title(),
            dimensions: { width: 1280, height: 800 },
            sections
        };
    }

    // ─── Heuristic interactions (no LLM — pure Playwright JS) ────────────────
    //
    // Returns visible CTAs, nav links, and buttons ranked by priority so the
    // orchestrator can perform a small set of meaningful clicks for heatmap data
    // without any LLM calls during the browser phase.

    async getHeuristicClicks(max = 4): Promise<Array<{
        text: string;
        x: number; y: number;    // ABSOLUTE document coords (not viewport-relative)
        w: number; h: number;
        isNavLink: boolean;
    }>> {
        if (!this.page) return [];

        // Scroll to top so elements are in a deterministic position
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(400);

        const CTA_RE = /sign.?up|get.?start|start free|try.?free|try.?now|buy|purchase|pricing|plans?|checkout|demo|learn more|features|contact|subscribe|explore|watch|view|get.?demo|book.?a/i;

        try {
            // Use Playwright's native element handles + boundingBox() instead of a monolithic
            // page.evaluate(). boundingBox() uses Playwright's own layout engine and correctly
            // handles content-visibility:auto, CSS animations, and other edge cases that cause
            // getBoundingClientRect() inside page.evaluate() to return 0 or stale values.
            const handles = await this.page.$$('a[href], button, [role="button"]');
            const scrollY = await this.page.evaluate(() => window.scrollY).catch(() => 0);

            const found: Array<{ text: string; x: number; y: number; w: number; h: number; isNavLink: boolean; priority: number }> = [];
            const seen = new Set<string>();

            for (const handle of handles) {
                if (found.length >= 50) break;

                // boundingBox returns null if element is not rendered / has 0 size / is hidden
                const box = await handle.boundingBox().catch(() => null);
                if (!box || box.width < 5 || box.height < 5) continue;

                const text = ((await handle.textContent().catch(() => '')) || '')
                    .replace(/\s+/g, ' ').trim().slice(0, 60);
                if (!text || text.length < 2 || seen.has(text.toLowerCase())) continue;
                seen.add(text.toLowerCase());

                const href: string = await handle.evaluate((el: any) => el.href || '').catch(() => '');
                if (href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('javascript:')) continue;

                const isNav: boolean = await handle.evaluate((el: Element) =>
                    !!el.closest('nav, header, [role="navigation"], [class*="nav"], [class*="header"], [class*="menu"]')
                ).catch(() => false);

                const isBtn: boolean = await handle.evaluate((el: Element) =>
                    el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
                ).catch(() => false);

                const priority = CTA_RE.test(text) ? 10 : isBtn ? 8 : isNav ? 7 : 4;

                // box.x/box.y are viewport-relative; add scrollY for absolute document coords
                found.push({
                    text,
                    x: Math.round(box.x + box.width / 2),
                    y: Math.round(box.y + scrollY + box.height / 2),
                    w: Math.round(box.width),
                    h: Math.round(box.height),
                    isNavLink: isNav,
                    priority,
                });
            }

            const results = found.sort((a, b) => b.priority - a.priority).slice(0, max);
            console.log(`getHeuristicClicks: ${handles.length} handles → ${found.length} valid → taking ${results.length}: [${results.map(r => `"${r.text}"`).join(', ')}]`);

            return results.map(({ priority: _p, ...rest }) => rest);
        } catch (err: any) {
            console.warn(`getHeuristicClicks failed: ${err.message}`);
            return [];
        }
    }

    // ─── Single native click at viewport coords + post-click screenshot ───────

    // x, y are ABSOLUTE document coordinates (as returned by getHeuristicClicks)
    async clickAtCoords(x: number, y: number): Promise<{ newUrl: string; screenshot: string }> {
        if (!this.page) throw new Error('Browser not initialized');
        const oldUrl = this.page.url();

        // Scroll so the target is vertically centred in the viewport, then compute
        // the viewport-relative Y coordinate to pass to mouse.click().
        const vh = await this.page.evaluate(() => window.innerHeight || 800);
        const targetScrollY = Math.max(0, y - Math.round(vh / 2));
        await this.page.evaluate((sy: number) => window.scrollTo(0, sy), targetScrollY);
        await this.page.waitForTimeout(120);

        // After scroll: viewport coord = absolute - scrollY
        const actualScrollY = await this.page.evaluate(() => window.scrollY);
        const viewportY = y - actualScrollY;
        const viewportX = x; // horizontal scroll is almost never an issue

        await this.page.mouse.click(viewportX, viewportY);
        await this.page.waitForTimeout(600);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 4000 }).catch(() => { });

        const newUrl = this.page.url();
        const screenshot = (await this.page.screenshot({ type: 'jpeg', quality: 45 })).toString('base64');

        if (newUrl !== oldUrl) {
            this.metrics.navigation_latency.push(0);
        }

        return { newUrl, screenshot };
    }

    getCurrentUrl(): string {
        return this.page?.url() ?? '';
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
        if (this.stagehand) await this.stagehand.close().catch(() => { });
        this.page = null;
        this.stagehand = null;
    }

    // ─── Cookie portability (persist auth across per-page browser instances) ──

    async exportCookies(): Promise<any[]> {
        if (!this.stagehand) return [];
        try {
            const context = (this.stagehand as any).context;
            return await context?.cookies?.() ?? [];
        } catch {
            return [];
        }
    }

    async restoreCookies(cookies: any[]): Promise<void> {
        if (!this.stagehand || !cookies.length) return;
        try {
            const context = (this.stagehand as any).context;
            if (context?.addCookies) await context.addCookies(cookies);
        } catch { }
    }

    getMetrics(): HeuristicMetrics {
        return { ...this.metrics };
    }

    static async shutdown() { }
}
