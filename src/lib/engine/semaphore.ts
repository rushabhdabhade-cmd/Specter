/**
 * Global concurrency limiter for Chromium instances.
 * Caps simultaneous browser sessions so the container doesn't OOM.
 * Max 2 concurrent — each Chromium uses ~400–600 MB, keeping peak usage ~1.2 GB.
 */

const MAX_CONCURRENT_BROWSERS = 2;
let active = 0;
const queue: Array<() => void> = [];

export async function acquireBrowser(): Promise<void> {
    if (active < MAX_CONCURRENT_BROWSERS) {
        active++;
        return;
    }
    await new Promise<void>(resolve => queue.push(resolve));
    active++;
}

export function releaseBrowser(): void {
    active--;
    const next = queue.shift();
    if (next) next();
}
