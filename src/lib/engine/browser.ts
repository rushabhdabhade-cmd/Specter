import { Stagehand } from '@browserbasehq/stagehand';
import { Observation, Action, ObservationSection, HeuristicMetrics } from './types';

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

    async init(modelName: string = "google/gemini-2.0-flash", apiKey?: string) {
        try {
            this.stagehand = new Stagehand({
                env: "LOCAL",
                apiKey: process.env.BROWSERBASE_API_KEY,
                verbose: 2,
                disableAPI: true,
                model: {
                    modelName: modelName,
                    apiKey: (modelName.includes('google') || modelName.includes('gemini'))
                        ? (apiKey || process.env.GEMINI_API_KEY)
                        : (apiKey || process.env.OPENAI_API_KEY),
                },
                localBrowserLaunchOptions: {
                    headless: true,
                    viewport: { width: 1280, height: 800 }
                }
            });

            console.log('🎬 Initializing Stagehand...');
            await this.stagehand.init();

            const context = (this.stagehand as any).context;
            if (!context) {
                throw new Error('Stagehand failure: Context not found after init.');
            }

            const allPages = context.pages ? context.pages() : [];
            this.page = (context.activePage ? context.activePage() : null) || allPages[0];

            if (!this.page) {
                console.log('🚀 Forcing newPage()...');
                this.page = await context.newPage();
            }

            // Listen for new pages globally in this context
            const pwContext = this.page?.context ? this.page.context() : context;
            if (pwContext && typeof pwContext.on === 'function') {
                this.attachNetworkListeners(pwContext); // Attach to context for all pages

                pwContext.on('page', async (newPage: any) => {
                    console.log(`✨ New tab detected: ${newPage.url()}. Switching...`);
                    this.page = newPage;
                    await newPage.bringToFront().catch(() => { });
                    if (typeof newPage.setViewportSize === 'function') {
                        await newPage.setViewportSize({ width: 1280, height: 800 }).catch(() => { });
                    }
                });
            }

            if (this.page) {
                console.log('✅ Stagehand page ready.');
                if (typeof this.page.setViewportSize === 'function') {
                    await this.page.setViewportSize({ width: 1280, height: 800 }).catch(() => { });
                }
            } else {
                throw new Error('Stagehand failure: Page object not found.');
            }
        } catch (err: any) {
            console.error(`❌ Stagehand init failed:`, err.message);
            throw err;
        }
    }

    private attachNetworkListeners(target: any) {
        if (!target || typeof target.on !== 'function') return;

        try {
            target.on('response', (response: any) => {
                try {
                    const status = typeof response.status === 'function' ? response.status() : 0;
                    if (status >= 400) {
                        const url = typeof response.url === 'function' ? response.url() : 'unknown';
                        if (!this.metrics.broken_links.includes(url)) {
                            console.warn(`🚦 Broken link/error detected: ${status} - ${url}`);
                            this.metrics.broken_links.push(`${status}: ${url}`);
                        }
                    }
                } catch (e) {
                    // Ignore transient response errors
                }
            });

            target.on('requestfailed', (request: any) => {
                this.metrics.request_failures++;
                try {
                    const url = typeof request.url === 'function' ? request.url() : 'unknown';
                    const error = typeof request.failure === 'function' ? request.failure()?.errorText : 'unknown';
                    console.warn(`🚦 Request failed: ${url} - ${error}`);
                } catch (e) {
                    // Ignore transient request errors
                }
            });
        } catch (err: any) {
            console.warn(`⚠️ Could not attach network listeners: ${err.message}`);
        }
    }

    async navigate(url: string) {
        if (!this.page) {
            console.error('❌ Cannot navigate: Browser page not initialized.');
            return;
        }
        const start = Date.now();
        try {
            await this.page.goto(url, { waitUntil: 'load', timeoutMs: 60000 });
            await this.page.waitForLoadState('networkidle', 5000).catch(() => { });
            const duration = Date.now() - start;
            this.metrics.navigation_latency.push(duration);
            this.metrics.last_load_time = duration;
        } catch (err: any) {
            console.error(`Navigation to ${url} failed:`, err.message);
            if (this.page.url() === 'about:blank') throw err;
        }
    }

    async captureSection(label: string): Promise<ObservationSection> {
        if (!this.page || !this.stagehand) throw new Error('Browser not initialized');
        console.log(`📸 Capturing section: ${label}...`);

        // Aggressive settling before capture to prevent black screenshots
        await this.page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => { });
        await this.page.waitForTimeout(1000);

        // Use Stagehand observation for semantic parity
        const observations = await this.stagehand.observe({ page: this.page }).catch(() => []);
        const mappedElements = observations.map((ob: any, i: number) => ({
            index: i,
            type: ob.selector ? 'element' : 'unknown',
            text: ob.description || ob.label || '',
            selector: ob.selector,
            role: ob.method || 'element',
            href: (ob.attributes?.href) || '',
            id: (ob.attributes?.id) || '',
            classes: (ob.attributes?.class) || ''
        }));

        const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 40 });
        return {
            screenshot: screenshot.toString('base64'),
            domContext: JSON.stringify(mappedElements.slice(0, 50))
        };
    }

    async observe(blacklist: string[] = [], fullPageScan: boolean = false): Promise<Observation> {
        if (!this.page || !this.stagehand) {
            console.error('❌ Cannot observe: Page or Stagehand not initialized.');
            return {
                screenshot: '',
                url: '',
                title: '',
                domContext: '[]',
                dimensions: { width: 1280, height: 800 }
            };
        }

        const sections: ObservationSection[] = [];
        let mainObservation: ObservationSection;

        if (fullPageScan) {
            console.log('📸 Performing full page multi-section scan...');
            // Section 1: Top
            await this.page.evaluate(() => window.scrollTo(0, 0));
            await this.page.waitForTimeout(500);
            mainObservation = await this.captureSection('Top');
            sections.push(mainObservation);

            const heights = await this.page.evaluate(() => ({
                vh: window.innerHeight,
                dh: document.documentElement.scrollHeight
            }));

            if (heights.dh > heights.vh) {
                // Section 2: Mid
                await this.page.evaluate((vh: number) => window.scrollTo(0, vh), heights.vh);
                await this.page.waitForTimeout(500);
                sections.push(await this.captureSection('Mid'));

                if (heights.dh > heights.vh * 1.5) {
                    // Section 3: Bottom
                    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                    await this.page.waitForTimeout(500);
                    sections.push(await this.captureSection('Bottom'));
                }
            }
            // Return to top
            await this.page.evaluate(() => window.scrollTo(0, 0));
            await this.page.waitForTimeout(200);
        } else {
            mainObservation = await this.captureSection('Current View');
            sections.push(mainObservation);
        }

        return {
            screenshot: mainObservation.screenshot,
            url: this.page.url(),
            title: await this.page.title(),
            domContext: mainObservation.domContext,
            dimensions: { width: 1280, height: 800 },
            sections
        };
    }

    async perform(action: Action) {
        if (!this.page || !this.stagehand) throw new Error('Browser not initialized');

        const oldUrl = this.page.url();
        const oldPageCount = (this.stagehand as any).context?.pages ? (this.stagehand as any).context.pages().length : 1;

        try {
            switch (action.type) {
                case 'click':
                case 'type':
                    const instruction = action.type === 'click'
                        ? `Click on the ${action.text || action.reasoning}`
                        : `Type "${action.text}" into the appropriate field for ${action.reasoning}`;

                    console.log(`🤖 Stagehand acting: ${instruction}`);
                    await this.stagehand.act(instruction, { page: this.page });

                    // Robust verification loop
                    let settled = false;
                    for (let i = 0; i < 5; i++) {
                        await this.page.waitForTimeout(1000);
                        const newPageCount = (this.stagehand as any).context?.pages ? (this.stagehand as any).context.pages().length : 1;
                        if (newPageCount > oldPageCount) {
                            console.log('📈 New tab detected after click. Switching target...');
                            const pages = (this.stagehand as any).context.pages();
                            this.page = pages[pages.length - 1]; // Pick the newest one
                            await this.page.bringToFront().catch(() => { });
                            settled = true;
                            break;
                        }
                        if (this.page.url() !== oldUrl) {
                            settled = true;
                            break;
                        }
                    }
                    if (settled) {
                        await this.page.waitForLoadState('load', { timeout: 10000 }).catch(() => { });
                        await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
                    }
                    break;

                case 'scroll':
                    if (action.text === 'top') {
                        await this.page.evaluate(() => window.scrollTo(0, 0));
                    } else if (action.text === 'bottom') {
                        await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                    } else {
                        await this.page.evaluate(() => window.scrollBy(0, 800));
                    }
                    break;
                case 'wait':
                    await this.page.waitForTimeout(2000);
                    break;
            }
        } catch (err) {
            console.warn(`Stagehand action ${action.type} failed:`, err);
            if (action.selector) {
                console.log(`🔄 Fallback: Trying selector-based click for ${action.selector}`);
                await this.page.click(action.selector, { timeoutMs: 5000 }).catch(() => { });
            }
        }

        const newUrl = this.page.url();
        const newPageCount = (this.stagehand as any).context?.pages().length || 1;

        if (newUrl !== oldUrl || newPageCount > oldPageCount) {
            console.log(`✅ Navigation detected (${oldUrl} -> ${newUrl}) or New Tab.`);
            await this.page.waitForLoadState('load', { timeout: 10000 }).catch(() => { });
        }
        await this.page.waitForTimeout(1000);
    }

    async evaluate<T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T> {
        if (!this.page) throw new Error('Browser not initialized');
        return await this.page.evaluate(fn, ...args);
    }

    async waitForTimeout(ms: number) {
        if (this.page) await this.page.waitForTimeout(ms);
    }

    async close() {
        if (this.stagehand) await this.stagehand.close().catch(() => { });
        this.page = null;
        this.stagehand = null;
    }

    getMetrics(): HeuristicMetrics {
        return { ...this.metrics };
    }

    static async shutdown() {
        // Since we moved to instance-based stagehand, we don't have a static one to shutdown easily
        // but we can leave this as a placeholder if we re-introduce pooling.
    }
}
