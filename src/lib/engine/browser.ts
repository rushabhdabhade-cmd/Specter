import { chromium, Browser, Page } from 'playwright';
import { Observation, Action } from './types';

export class BrowserService {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async init() {
        this.browser = await chromium.launch({ headless: true });
        const context = await this.browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        this.page = await context.newPage();
    }

    async navigate(url: string) {
        if (!this.page) throw new Error('Browser not initialized');
        try {
            // Wait for main 'load' state (fast and reliable)
            await this.page.goto(url, { waitUntil: 'load', timeout: 30000 });

            // Attempt to wait for network idle (reduced for Fast Mode)
            await this.page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
                console.log('Network idle not reached quickly, proceeding anyway.');
            });
        } catch (err: any) {
            console.error(`Navigation to ${url} timed out or failed:`, err.message);
            // If we actually reached the URL but just timed out, we can still proceed
            if (this.page.url() !== 'about:blank') {
                console.log('Page is not blank, proceeding despite navigation error...');
            } else {
                throw err;
            }
        }
    }

    async observe(blacklist: string[] = []): Promise<Observation> {
        if (!this.page) throw new Error('Browser not initialized');

        // Inject labeling script and return elements info
        const elementsInfo = await this.page.evaluate((blacklist: string[]) => {
            // Remove old labels
            document.querySelectorAll('.specter-label').forEach(el => el.remove());

            const interactables = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
            const info: any[] = [];

            // Limit to top 50 interactables to prevent payload bloat
            interactables.forEach((el, index) => {
                if (index > 50) return;

                const selector = `[${index}]`;
                if (blacklist.includes(selector)) {
                    return;
                }

                const htmlEl = el as HTMLElement;
                const rect = htmlEl.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const label = document.createElement('div');
                    label.className = 'specter-label';
                    label.innerText = selector;
                    label.style.position = 'absolute';
                    label.style.top = `${rect.top + window.scrollY}px`;
                    label.style.left = `${rect.left + window.scrollX}px`;
                    label.style.backgroundColor = '#ff0000';
                    label.style.color = '#ffffff';
                    label.style.fontSize = '10px';
                    label.style.fontWeight = 'bold';
                    label.style.padding = '1px 3px';
                    label.style.zIndex = '999999';
                    label.style.pointerEvents = 'none';
                    label.style.borderRadius = '2px';
                    label.setAttribute('data-index', index.toString());
                    document.body.appendChild(label);

                    info.push({
                        index,
                        type: el.tagName.toLowerCase(),
                        text: (htmlEl.innerText?.trim() || (el as HTMLInputElement).value || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').slice(0, 50),
                        role: el.getAttribute('role') || ''
                    });
                }
            });
            return info;
        }, blacklist).catch(err => {
            console.warn('DOM labeling failed or timed out:', err);
            return [];
        });

        const screenshot = await this.page.screenshot({
            type: 'jpeg',
            quality: 40, // Optimized for local LLM processing
            timeout: 15000
        });
        const url = this.page.url();
        const title = await this.page.title();

        return {
            screenshot: screenshot.toString('base64'),
            url,
            title,
            domContext: JSON.stringify(elementsInfo),
            dimensions: { width: 1280, height: 800 }
        };
    }

    async perform(action: Action) {
        if (!this.page) throw new Error('Browser not initialized');

        try {
            switch (action.type) {
                case 'click':
                    if (action.selector) {
                        const indexMatch = action.selector.match(/\[(\d+)\]/);
                        if (indexMatch) {
                            const index = parseInt(indexMatch[1]);
                            const interactables = await this.page.$$('button, a, input, select, textarea, [role="button"]');
                            const element = interactables[index];
                            if (element) {
                                await element.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { });
                                await element.click({ timeout: 10000, force: true });
                            }
                        } else {
                            await this.page.click(action.selector, { timeout: 10000, force: true });
                        }
                    }
                    break;
                case 'type':
                    if (action.selector && action.text) {
                        const indexMatch = action.selector.match(/\[(\d+)\]/);
                        if (indexMatch) {
                            const index = parseInt(indexMatch[1]);
                            const interactables = await this.page.$$('button, a, input, select, textarea, [role="button"]');
                            const element = interactables[index];
                            if (element) {
                                await element.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { });
                                await element.fill(action.text, { timeout: 10000 });
                            }
                        } else {
                            await this.page.fill(action.selector, action.text, { timeout: 10000 });
                        }
                    }
                    break;
                case 'scroll':
                    await this.page.evaluate(() => window.scrollBy(0, 800));
                    break;
                case 'wait':
                    await this.page.waitForTimeout(1000);
                    break;
            }
        } catch (err) {
            console.warn(`Action ${action.type} failed or timed out, continuing...`, err);
        }

        // V14 Fast Mode: Standard actions don't need a full networkidle wait.
        // We only wait a small amount to allow for immediate UI shifts.
        await this.page.waitForTimeout(500);
    }

    async waitForTimeout(ms: number) {
        if (this.page) await this.page.waitForTimeout(ms);
    }

    async close() {
        if (this.browser) await this.browser.close();
    }
}
