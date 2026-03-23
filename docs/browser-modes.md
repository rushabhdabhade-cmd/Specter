# Browser Modes

`BrowserService` supports three browser backends, selected by env vars at startup (priority top to bottom):

| Mode | Trigger env var | Use case |
|---|---|---|
| **Browserless** | `BROWSERLESS_WS_URL` | Self-hosted cloud browser (recommended) |
| **Browserbase** | `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | Managed cloud browser (legacy) |
| **LOCAL** | neither set | Playwright Chromium on the same machine |

---

## Browserless (Self-Hosted) Mode

Browserless runs as a separate Docker container exposing a CDP WebSocket.
`BrowserService.init()` connects to it via `chromium.connectOverCDP(wsUrl)` and injects the resulting page into Stagehand's `act()` / `observe()` calls.

### Railway setup

1. Add a new Railway service from Docker image: `ghcr.io/browserless/chromium:latest`
2. Set env vars on the **browserless** service:
   ```
   TOKEN=<your-secret-token>
   CONCURRENT=5
   TIMEOUT=1800000
   ```
3. Railway assigns it a public domain, e.g. `browserless-xyz.railway.app`
4. Set on the **app** service:
   ```
   BROWSERLESS_WS_URL=wss://browserless-xyz.railway.app?token=<your-secret-token>
   ```

### Local dev

Do **not** set `BROWSERLESS_WS_URL` in `.env.local`. The engine falls through to LOCAL mode automatically, launching a headless Playwright Chromium on your machine.

Run once after cloning to download the browser binary:
```bash
pnpm exec playwright install chromium
```

---

## How it works internally

```
BrowserService.init()
  ├── Stagehand(LOCAL).init()     — sets up AI model + minimal internal browser
  └── chromium.connectOverCDP()   — connects to Browserless
       └── cdpContext.newPage()   — this.page (used for all navigation & screenshots)

stagehand.act(instruction, { page: this.page })   — uses CDP page
stagehand.observe({ page: this.page })             — uses CDP page
```

The Stagehand-internal browser (from LOCAL init) is idle and never navigated.
All actual browsing happens through the CDP-connected Browserless page.
