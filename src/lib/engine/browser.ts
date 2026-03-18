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
        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    }

    async observe(): Promise<Observation> {
        if (!this.page) throw new Error('Browser not initialized');

        // Inject labeling script and return elements info
        const elementsInfo = await this.page.evaluate(() => {
            // Remove old labels
            document.querySelectorAll('.specter-label').forEach(el => el.remove());

            const interactables = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
            const info: { index: number; type: string; text: string; role: string; }[] = [];

            interactables.forEach((el, index) => {
                const htmlEl = el as HTMLElement;
                const rect = htmlEl.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const label = document.createElement('div');
                    label.className = 'specter-label';
                    label.innerText = `[${index}]`;
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
                        text: htmlEl.innerText?.trim() || (el as HTMLInputElement).value || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '',
                        role: el.getAttribute('role') || ''
                    });
                }
            });
            return info;
        });

        const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 60 });
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

        switch (action.type) {
            case 'click':
                if (action.selector) {
                    // LLM will provide index in selector field usually like "[15]"
                    const indexMatch = action.selector.match(/\[(\d+)\]/);
                    if (indexMatch) {
                        const index = indexMatch[1];
                        const interactables = await this.page.$$('button, a, input, select, textarea, [role="button"]');
                        if (interactables[parseInt(index)]) {
                            await interactables[parseInt(index)].click();
                        }
                    } else {
                        await this.page.click(action.selector);
                    }
                }
                break;
            case 'type':
                if (action.selector && action.text) {
                    const indexMatch = action.selector.match(/\[(\d+)\]/);
                    if (indexMatch) {
                        const index = indexMatch[1];
                        const interactables = await this.page.$$('button, a, input, select, textarea, [role="button"]');
                        if (interactables[parseInt(index)]) {
                            await interactables[parseInt(index)].fill(action.text);
                        }
                    } else {
                        await this.page.fill(action.selector, action.text);
                    }
                }
                break;
            case 'scroll':
                await this.page.evaluate(() => window.scrollBy(0, 500));
                break;
            case 'wait':
                await this.page.waitForTimeout(2000);
                break;
        }

        await this.page.waitForLoadState('networkidle');
    }

    async close() {
        if (this.browser) await this.browser.close();
    }
}
