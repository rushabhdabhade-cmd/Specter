import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Observation, Action } from './types';

export class BrowserService {
    private static browserPromise: Promise<Browser> | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    private static async getBrowser(): Promise<Browser> {
        // If there's no promise, or the resolved browser is unhealthy, start a new one
        if (this.browserPromise) {
            try {
                const b = await this.browserPromise;
                // Active heart-beat: b.version() requires a round-trip to the process.
                // isConnected() can return true for zombie processes.
                await b.version();
            } catch (err) {
                console.warn('⚠️ Pooled browser heart-beat failed. Resetting...');
                this.browserPromise = null;
            }
        }

        if (!this.browserPromise) {
            this.browserPromise = (async () => {
                try {
                    const b = await chromium.launch({
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            // Removed: --disable-dev-shm-usage (can cause crashes if /dev/shm is small or restricted)
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--disable-gpu'
                        ]
                    });

                    b.on('disconnected', () => {
                        console.error('🛑 Pooled browser crashed/disconnected.');
                        this.browserPromise = null;
                    });

                    return b;
                } catch (err) {
                    this.browserPromise = null;
                    throw err;
                }
            })();
        }
        return this.browserPromise;
    }

    async init(retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const browser = await BrowserService.getBrowser();
                this.context = await browser.newContext({
                    viewport: { width: 1280, height: 800 },
                    deviceScaleFactor: 1,
                    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                });

                // --- NEW: New Tab Handler ---
                // Automatically switch focus when a click opens a new tab/page
                this.context.on('page', async (newPage) => {
                    console.log('✨ New tab detected. Switching engine focus...');
                    this.page = newPage;
                    await newPage.bringToFront().catch(() => { });
                });

                this.page = await this.context.newPage();
                return; // Success
            } catch (err: any) {
                console.error(`❌ Browser init attempt ${i + 1}/${retries} failed:`, err.message);

                // Cleanup local state
                if (this.page) await this.page.close().catch(() => { });
                if (this.context) await this.context.close().catch(() => { });
                this.page = null;
                this.context = null;

                // If error suggests the browser itself is dead, reset the global promise
                if (err.message.includes('Target closed') || err.message.includes('browser has been closed')) {
                    BrowserService.browserPromise = null;
                }

                if (i === retries - 1) throw err;
                await new Promise(res => setTimeout(res, 1000 * (i + 1))); // Simple backoff
            }
        }
    }

    async navigate(url: string) {
        if (!this.page) throw new Error('Browser not initialized');
        try {
            // Wait for main 'load' state
            await this.page.goto(url, { waitUntil: 'load', timeout: 60000 });

            // Smart wait: check for network idle but don't hang if it's chatty
            await Promise.race([
                this.page.waitForLoadState('networkidle', { timeout: 3000 }),
                this.page.waitForTimeout(1000)
            ]).catch(() => { });
        } catch (err: any) {
            console.error(`Navigation to ${url} timed out or failed:`, err.message);
            if (this.page.url() === 'about:blank') throw err;
        }
    }

    async observe(blacklist: string[] = []): Promise<Observation> {
        if (!this.page) throw new Error('Browser not initialized');

        // Before observing, ensure the page is "settled" (no rapid DOM or network activity)
        await this.waitForSettle(2000).catch(() => { });

        // Inject labeling script with expanded discovery logic
        const elementsInfo = await this.page.evaluate((blacklist: string[]) => {
            document.querySelectorAll('.specter-label').forEach(el => el.remove());

            // Expanded query: find anything that looks like a control
            const interactables = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [onclick]'))
                .concat(Array.from(document.querySelectorAll('div, span, li, section')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.cursor === 'pointer';
                }));

            const info: any[] = [];
            const processed = new Set();

            interactables.forEach((el, index) => {
                if (info.length > 60) return;
                if (processed.has(el)) return;
                processed.add(el);

                const selector = `[${index}]`;
                if (blacklist.includes(selector)) return;

                const htmlEl = el as HTMLElement;
                const rect = htmlEl.getBoundingClientRect();

                // Visibility check
                if (rect.width > 2 && rect.height > 2) {
                    const label = document.createElement('div');
                    label.className = 'specter-label';
                    label.innerText = selector;
                    label.style.position = 'absolute';
                    label.style.top = `${rect.top + window.scrollY}px`;
                    label.style.left = `${rect.left + window.scrollX}px`;
                    label.style.backgroundColor = 'rgba(99, 102, 241, 0.9)'; // Indigo-500 semi-transparent
                    label.style.color = '#ffffff';
                    label.style.fontSize = '9px';
                    label.style.fontWeight = 'black';
                    label.style.padding = '1px 3px';
                    label.style.zIndex = '2147483647';
                    label.style.pointerEvents = 'none';
                    label.style.borderRadius = '3px';
                    label.style.border = '1px solid rgba(255,255,255,0.3)';
                    label.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
                    label.setAttribute('data-index', index.toString());
                    document.body.appendChild(label);

                    info.push({
                        index,
                        type: el.tagName.toLowerCase(),
                        text: (htmlEl.innerText?.trim() || (el as HTMLInputElement).value || el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 50),
                        role: el.getAttribute('role') || el.tagName.toLowerCase(),
                        href: el.getAttribute('href') || '',
                        id: el.id || '',
                        testId: el.getAttribute('data-testid') || '',
                        classes: htmlEl.className?.split(' ').slice(0, 2).join(' ') || ''
                    });
                }
            });
            return info;
        }, blacklist).catch(err => {
            console.warn('DOM labeling failed:', err);
            return [];
        });

        const screenshot = await this.page.screenshot({
            type: 'jpeg',
            quality: 50,
            timeout: 30000
        });

        return {
            screenshot: screenshot.toString('base64'),
            url: this.page.url(),
            title: await this.page.title(),
            domContext: JSON.stringify(elementsInfo),
            dimensions: { width: 1280, height: 800 }
        };
    }

    async perform(action: Action) {
        if (!this.page) throw new Error('Browser not initialized');

        const oldUrl = this.page.url();

        try {
            switch (action.type) {
                case 'click':
                    if (action.selector) {
                        const indexMatch = action.selector.match(/\[(\d+)\]/);
                        if (indexMatch) {
                            const index = parseInt(indexMatch[1]);
                            // Re-fetch interactables using the same logic as observe
                            const handle = await this.page.evaluateHandle((idx) => {
                                const interactables = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [onclick]'))
                                    .concat(Array.from(document.querySelectorAll('div, span, li, section')).filter(el => {
                                        const style = window.getComputedStyle(el);
                                        return style.cursor === 'pointer';
                                    }));
                                return interactables[idx];
                            }, index);
                            const element = handle.asElement();

                            if (element) {
                                await element.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { });

                                // Attempt 1: Standard click
                                try {
                                    await element.click({ timeout: 5000 });
                                } catch (err) {
                                    console.log('⚠️ Primary click failed, trying parent/force...');

                                    // Attempt 2: Try parent if it's a link or button
                                    const parentHandle = await this.page.evaluateHandle((el) => {
                                        return el.parentElement?.closest('a, button, [role="button"]') || el.parentElement;
                                    }, element);
                                    const parentElement = parentHandle.asElement();

                                    if (parentElement) {
                                        await parentElement.click({ timeout: 5000, force: true }).catch(() => { });
                                    } else {
                                        await element.click({ timeout: 5000, force: true }).catch(() => { });
                                    }
                                }
                            }
                        } else {
                            console.warn(`⚠️ Action ${action.type} used non-index selector: ${action.selector}. Attempting fallback...`);
                            await this.page.click(action.selector, { timeout: 10000 });
                        }
                    }
                    break;
                case 'type':
                    if (action.selector && action.text) {
                        const indexMatch = action.selector.match(/\[(\d+)\]/);
                        if (indexMatch) {
                            const index = parseInt(indexMatch[1]);
                            const handle = await this.page.evaluateHandle((idx) => {
                                const interactables = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [onclick]'))
                                    .concat(Array.from(document.querySelectorAll('div, span, li, section')).filter(el => {
                                        const style = window.getComputedStyle(el);
                                        return style.cursor === 'pointer';
                                    }));
                                return interactables[idx];
                            }, index);
                            const element = handle.asElement();

                            if (element) {
                                await element.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { });
                                await element.fill(action.text, { timeout: 10000 });
                            }
                        } else {
                            console.warn(`⚠️ Action ${action.type} used non-index selector: ${action.selector}. Attempting fallback...`);
                            await this.page.fill(action.selector, action.text, { timeout: 10000 });
                        }
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
                    await this.page.waitForTimeout(1000);
                    break;
            }
        } catch (err) {
            console.warn(`Action ${action.type} failed, continuing...`, err);
        }

        // Post-action settle phase
        const newUrl = this.page.url();
        if (newUrl !== oldUrl && action.type === 'click') {
            console.log(`📍 URL change detected (${newUrl}). Waiting for load...`);
            await this.page.waitForLoadState('load', { timeout: 10000 }).catch(() => { });
            await this.waitForSettle(2000).catch(() => { });
        } else if (action.type === 'click' || action.type === 'type') {
            // Even if URL didn't change, it might be an SPA transition
            await this.waitForSettle(1000).catch(() => { });
        } else {
            // Fast mode wait for other actions
            await this.page.waitForTimeout(500);
        }
    }

    private async waitForSettle(timeoutMs: number = 3000) {
        if (!this.page) return;
        try {
            // We wait for either network idle OR a timeout
            // networkidle is brittle in chatty apps, so we cap it
            await Promise.race([
                this.page.waitForLoadState('networkidle', { timeout: timeoutMs }),
                this.page.waitForTimeout(timeoutMs / 2)
            ]);
        } catch (e) { }
    }

    async evaluate<T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T> {
        if (!this.page) throw new Error('Browser not initialized');
        return await this.page.evaluate(fn, ...args);
    }

    async waitForTimeout(ms: number) {
        if (this.page) await this.page.waitForTimeout(ms);
    }

    async close() {
        if (this.page) await this.page.close().catch(() => { });
        if (this.context) await this.context.close().catch(() => { });
        // Note: Browser is static/pooled, so we don't close it here.
    }

    // Static cleanup if needed for the whole process
    static async shutdown() {
        if (this.browserPromise) {
            const browser = await this.browserPromise;
            await browser.close();
        }
    }
}
