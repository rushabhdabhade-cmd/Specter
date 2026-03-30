# Specter — AI-Powered UX Testing Engine

> **Version:** 1.0
> **Author:** Rushabh Dabhade
> **Last Updated:** March 2026
> **Status:** Live / Production

---

## What is Specter?

Specter deploys AI personas that autonomously browse your web product like real users — clicking, scrolling, navigating — and generates a full UX report with emotion scores, friction points, and ranked action items. No recruiting, no scheduling, results in minutes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.1.6 (Turbopack), TypeScript, Tailwind CSS |
| Animations | Framer Motion, Three.js + React Three Fiber |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + Realtime) |
| Screenshot Storage | Supabase Storage |
| Browser Automation | Stagehand (`@browserbasehq/stagehand`) — Playwright wrapper |
| Cloud Browser | BrowserBase (optional, set `BROWSERBASE_API_KEY`) |
| LLM — Default | Google Gemini 2.0 Flash |
| LLM — Alternatives | OpenAI GPT-4o, OpenRouter, Ollama (local) |
| Hosting | Railway |
| Package Manager | pnpm |

---

## How the Engine Works

### Crawl-Reason-Repeat Loop

For each session, the engine runs a queue-based crawl up to **15 pages**:

1. **Navigate** — Stagehand opens the URL in a headless Chromium browser
2. **Wait for content** — double `networkidle` round + content readiness check (handles React/Next.js hydration, lazy API calls, skeleton loaders)
3. **Capture** — dynamic N-slice full-page screenshots (up to 8 viewport-height slices), covering the entire page regardless of length
4. **DOM extraction** — pure Playwright `page.evaluate()` harvests all interactive elements (links, buttons, inputs) with coordinates (~100ms, no Stagehand overhead)
5. **Popup dismissal** — after Slice-1, attempts to dismiss cookie banners, modals, and overlays so subsequent slices show actual content
6. **Heuristic interactions** — up to 4 native Playwright clicks on visible CTAs/nav links for heatmap data (no LLM, ~300ms each)
7. **LLM reasoning** — all slices + DOM context sent to the LLM in a single call; returns per-section UX feedback, friction points, emotion scores, and suggested next URLs
8. **Header/footer dedup** — fingerprints the page's header and footer HTML; skips re-analyzing identical chrome on subsequent pages
9. **Enqueue** — LLM-suggested next links validated against DOM-harvested links (drops hallucinated URLs) and added to the queue

### Screenshot Strategy

- One JPEG screenshot per viewport height (quality 45)
- Capped at 8 slices to stay within LLM token limits
- DOM context (up to 60 interactive elements with selectors + coordinates) attached to Slice-1
- Stored in Supabase Storage or local `/public/screenshots/` in dev

### Content Readiness Check

Before any screenshot is taken, the engine polls (every 300ms, up to 8s) for:
1. `document.readyState === 'complete'`
2. Visible text length > 100 chars
3. No active loading indicators (spinners, skeletons, `[aria-busy]`)
4. No API-pending empty-state placeholders ("No videos found.", "Loading...", etc.)

### Popup Handling

1. `Escape` key — closes most modal dialogs natively
2. Clicks first visible close/accept button matching a broad selector list (cookie banners, GDPR notices, Intercom, generic modals)
3. Force-hides any remaining `position:fixed` overlay matching popup keyword patterns via JS

### Dialog Handling

Native browser dialogs (alerts, confirms, notification prompts) are auto-dismissed via Playwright's `dialog` event on the raw underlying page (bypasses Stagehand's wrapper which doesn't proxy this event).

---

## UX Scoring

Each session log step gets a weighted contribution:

| Emotion | Weight |
|---|---|
| delight | +15 |
| surprise | +8 |
| satisfaction | +6 |
| curiosity | +4 |
| neutral | 0 |
| boredom | −6 |
| confusion | −10 |
| disappointment | −12 |
| frustration | −20 |

```
contribution = weight × emotional_intensity (0.0–1.0)
avgWeight    = Σ(contributions) / totalSteps

score = 60 + (avgWeight / 15) × 40   if avgWeight ≥ 0   → maps [0, +15] to [60, 100]
score = 60 + (avgWeight / 20) × 60   if avgWeight < 0   → maps [0, −20] to [60, 0]
```

**Baseline is 60** — a fully neutral site is mediocre, not good. Report score = average across all persona sessions.

---

## LLM Providers

| Provider | Model | Notes |
|---|---|---|
| Gemini (default) | `gemini-2.0-flash` | Used for both browser init (Stagehand) and page analysis |
| OpenAI | `gpt-4o` | Vision via base64 inline images, structured output via Zod |
| OpenRouter | Any vision model | Passed as `image_url` with `detail: 'low'` |
| Ollama | `llama3.2-vision` (configurable) | Local inference, sends only primary screenshot |

Provider and API key are configured per-project in the dashboard and stored encrypted in Supabase.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SCREENSHOTS_BUCKET=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# LLM keys (used server-side by the engine)
GEMINI_API_KEY=
OPENAI_API_KEY=

# BrowserBase (optional — uses local Chromium if not set)
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=

# Encryption (for storing user LLM keys)
ENCRYPTION_KEY=

# Ollama (optional)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODELS=llama3.2-vision
```

---

## Running Locally

```bash
pnpm install
pnpm dev
```

The engine runs as a Next.js API route (`/api/sessions/[id]/run`). Browser sessions use local Chromium by default when `BROWSERBASE_API_KEY` is not set.

---

## Deployment

Deployed on **Railway** via Dockerfile. The build runs `pnpm build` (Next.js production build) and serves via `pnpm start`.

For cloud browser sessions, set `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` in Railway environment variables.

---

## Key Constraints & Limits

| Constraint | Value |
|---|---|
| Max pages per session | 15 |
| Max screenshot slices per page | 8 |
| Max DOM elements extracted | 60 |
| Max heuristic clicks per page | 4 |
| Max links harvested per page | 20 |
| networkidle timeout (round 1) | 5s |
| networkidle timeout (round 2) | 6s |
| Content readiness timeout | 8s |
| Browser concurrency | 1 (semaphore, configurable) |

---

## Project Structure

```
src/
├── app/
│   ├── (marketing)/        # Public pages: home, about, pricing, docs
│   └── (dashboard)/        # Auth-protected: projects, test runs, reports, live session
├── components/
│   ├── marketing/          # Landing page sections (ScrollyHero, LegoModelSection, etc.)
│   ├── reports/            # Report view components (FeedbackSummary, Heatmap, etc.)
│   └── ui/                 # Shared UI primitives
└── lib/
    └── engine/
        ├── browser.ts      # BrowserService — Stagehand wrapper, capture, DOM, interactions
        ├── orchestrator.ts # Session runner — crawl loop, LLM calls, DB logging
        ├── llm.ts          # LLM providers (Gemini, OpenAI, OpenRouter, Ollama)
        ├── reporter.ts     # Report generation and aggregation
        ├── sitemap.ts      # URL queue, dedup, visited tracking
        ├── semaphore.ts    # Browser concurrency control
        └── types.ts        # Shared interfaces
```


# Engine Types

All types defined in [`src/lib/engine/types.ts`](../src/lib/engine/types.ts).
Zod schemas (for LLM structured output validation) live in [`src/lib/engine/llm.ts`](../src/lib/engine/llm.ts).

---

## ActionType

Represents the type of action the AI agent took during a session step.
Stored as `action_taken.type` in the `session_logs` table.

```ts
type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail' | 'skip_node';
```

| Value | Description |
|---|---|
| `click` | Agent clicked an element on the page |
| `type` | Agent typed text into an input field |
| `scroll` | Agent scrolled the page |
| `wait` | Agent waited before proceeding |
| `complete` | Agent determined the task is successfully completed |
| `fail` | Agent declared it cannot complete the task |
| `skip_node` | Agent skipped to the next navigation node |

**UI-only fallback: `'system'`** — not a real `ActionType`. Used in `StepFeedbackCard.tsx` when `action_taken` is `null` (e.g. a log entry generated by the orchestrator outside the agent loop, such as session start/end markers, heuristic interaction logs, or page summary entries).

---

## UXEmotion

```ts
type UXEmotion =
  | 'delight'
  | 'satisfaction'
  | 'curiosity'
  | 'surprise'
  | 'neutral'
  | 'confusion'
  | 'boredom'
  | 'frustration'
  | 'disappointment';
```

Used in `Action.emotional_state`, `PageScanAnalysis.overall_emotion`, and `SectionResult.emotional_state`. Maps directly to the scoring weights in [`src/lib/utils/scoring.ts`](../src/lib/utils/scoring.ts).

---

## Action

The full record of one agent decision step, stored in `session_logs.action_taken`.

```ts
interface Action {
  type: ActionType;
  selector?: string;          // CSS/XPath selector of the target element
  text?: string;              // Text typed or button label clicked
  reasoning: string;          // LLM's explanation for this action
  emotional_state: UXEmotion | string;
  emotional_intensity: number; // 0.0 – 1.0
  current_url?: string;
  ux_feedback?: string;       // UX observation at this step
  proposed_solution?: string; // Suggested fix for any friction found
  specific_emotion?: string;  // More granular emotion label (free text)
  possible_paths?: string[];  // Alternative navigation paths considered
}
```

---

## ObservationSection

A single viewport-height screenshot slice captured during a full-page scan.
Up to 8 slices are captured per page (one per viewport height, capped to avoid LLM token overload).

```ts
interface ObservationSection {
  screenshot: string;   // base64 JPEG (quality 45)
  domContext: string;   // JSON array of interactive elements (attached to Slice-1 only)
  label?: string;       // 'Slice-1' | 'Slice-2' | ... | 'Slice-8'
  scrollY?: number;     // scroll offset (px) when the screenshot was taken
}
```

`domContext` is a JSON-serialised array of up to 60 interactive elements extracted via `extractDOMFast()` in `browser.ts`. It is only populated on the first slice (Slice-1) — all other slices have `'[]'`.

Each DOM element has the shape:
```ts
{
  index: number;
  role: string;       // HTML tag or ARIA role
  text: string;       // visible label / placeholder / aria-label
  selector: string;   // CSS selector for Playwright to target
  coordinates: { x: number; y: number; w: number; h: number }; // absolute document coords
}
```

---

## Observation

The full capture result for one page, returned by `observeFastPage()` / `observeFullPage()`.

```ts
interface Observation {
  screenshot: string;              // base64 JPEG of Slice-1 (primary viewport)
  url: string;
  title: string;
  domContext?: string;             // Same as sections[0].domContext
  dimensions: { width: number; height: number }; // always 1280×800
  sections?: ObservationSection[]; // All slices captured (1–8)
}
```

---

## PersonaProfile

Configuration for one AI persona, generated by the LLM from user-supplied archetypes and constraints.

```ts
interface PersonaProfile {
  name: string;               // Role name, e.g. "Budget Traveler" (not a human name)
  age_range: string;          // e.g. "28–35"
  geolocation: string;        // e.g. "India"
  tech_literacy: 'low' | 'medium' | 'high';
  domain_familiarity: string; // e.g. "Familiar with SaaS tools"
  goal_prompt: string;        // Free-text behavioural prompt driving the session
}
```

---

## HeuristicMetrics

Technical performance metrics collected per page during a session.
Returned by `browser.getLastPageMetrics()` and stored in `action_taken.technical_metrics` on page summary log entries.

```ts
interface HeuristicMetrics {
  broken_links: string[];        // URLs that returned 4xx/5xx responses
  navigation_latency: number[];  // ms per page navigation
  request_failures: number;      // Total network-level request failures
  action_latency: number[];      // ms per Stagehand act() call
  last_load_time: number;        // ms for most recent page navigation
}
```

`getLastPageMetrics()` returns **per-page deltas** (not cumulative session totals) by snapshotting counts at the start of each `navigate()` call.

---

## PageScanAnalysis

Returned by `analyzePageSections()` — used for auth pages where navigation intent is not needed.

```ts
interface PageScanAnalysis {
  sections: Array<{
    label: string;                        // matches ObservationSection.label
    ux_feedback: string;
    emotional_state: UXEmotion | string;
    emotional_intensity: number;          // 0.0 – 1.0
    proposed_solution?: string;
  }>;
  overall_emotion: UXEmotion | string;
  overall_intensity: number;             // 0.0 – 1.0
  page_summary: string;
}
```

---

## PageAnalysisResult

Returned by `analysePage()` — the full analysis for regular (non-auth) pages. Extends `PageScanAnalysis`.

```ts
interface PageAnalysisResult extends PageScanAnalysis {
  friction_points: string[];          // Concrete UX problems found on this page
  positives: string[];                // Well-executed UX elements worth noting
  next_links: string[];               // 3–5 URLs the LLM recommends visiting next
                                      // validated against DOM-harvested links before use
  journey_narrative_update: string;   // One-sentence update to the running journey narrative
}
```

---

## LLMProvider

Interface all LLM provider classes implement (`GeminiProvider`, `OpenAIProvider`, `OpenRouterProvider`, `OllamaProvider`).

```ts
interface LLMProvider {
  // Used in the original interactive agent loop (not the current Crawl-Reason-Repeat engine)
  decideNextAction(
    observation: Observation,
    persona: PersonaProfile,
    history: Action[],
    blacklist?: string[],
    triedElements?: string[]
  ): Promise<Action>;

  // Single LLM call for all page slices — used for auth pages
  analyzePageSections(
    sections: ObservationSection[],
    pageUrl: string,
    pageTitle: string,
    persona: PersonaProfile
  ): Promise<PageScanAnalysis>;

  // Full page analysis with navigation intent — used for regular pages
  analysePage(
    sections: ObservationSection[],
    pageUrl: string,
    pageTitle: string,
    persona: PersonaProfile,
    isAuthPage: boolean,
    availableLinks: string[],
    journeyNarrative: string
  ): Promise<PageAnalysisResult>;

  generateSummary(prompt: string): Promise<string>;
  generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]>;
  suggestArchetypes(siteContext: string): Promise<Archetype[]>;
}
```

---

## Archetype

A user archetype option shown in the test setup UI. Used to seed persona generation.

```ts
interface Archetype {
  id: string;
  icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
  desc: string;
}
```

---

## Notes on LLM Provider Reliability

When using **OpenRouter**, free open-source models (Llama, Qwen, Mistral) are unreliable for structured JSON output and vision tasks. The cheapest model that consistently follows the JSON schema and has vision support is `openai/gpt-4o-mini` (~$0.15/1M tokens).

**Gemini 2.0 Flash** is the default and recommended provider — fastest, cheapest, and most reliable for this schema at scale.
