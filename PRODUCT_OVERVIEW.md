# Specter — Product & Engineering Overview

> Autonomous Synthetic User Testing Platform

---

## What Is Specter?

Specter is a platform that replaces manual UX research with AI-driven synthetic users. Instead of recruiting real participants, running sessions, transcribing recordings, and waiting weeks — Specter simulates realistic human personas navigating your web application in minutes. Each persona has a behavioral profile, an emotional state, and a running inner monologue. Every step is captured, scored, and synthesized into an executive UX report.

**The core promise:** Find what's broken before your users do.

---

## Business Value

| Traditional UX Research | Specter |
|---|---|
| Recruit participants (weeks) | Launch in minutes |
| 5–10 real users | 5–50 synthetic personas, parallel |
| Transcription + analysis (days) | AI report auto-generated |
| Expensive ($5K–$50K per study) | Subscription or pay-per-run |
| Bias from moderated sessions | No observer effect |
| Snapshots in time | Re-run after every deploy |

**Primary buyers:** Product teams, UX agencies, SaaS startups, e-commerce companies — anyone who ships web products and cares about user experience.

**Key differentiators:**
- **Multi-LLM:** Works with Gemini (free), OpenRouter (100+ models), or local Ollama — not locked to one provider.
- **Vision-native:** Personas see screenshots, not just HTML. They evaluate layout, hierarchy, trust signals.
- **Emotional scoring:** Not just "clicks" — each step produces an emotional response used to calculate a UX Health Score.
- **Real-time:** Watch the persona navigate your site live, with inner monologue visible.

---

## How It Works: Full User Journey

### Step 1 — Setup (2 minutes)

The user enters their website URL and selects an AI engine:

- **Gemini** (Google Flash 2.0) — free, default
- **OpenRouter** — paste any model ID from openrouter.ai (e.g. `anthropic/claude-3-5-sonnet`), enter API key
- **Local / Ollama** — runs on device, no API key, private

The platform then automatically:
1. Launches a headless browser and scrapes the site
2. Asks the LLM to suggest 6 audience archetypes for this type of product
3. Generates 5 fully-formed user personas from those archetypes
4. Presents the cohort for review — names, geolocation, age range, tech literacy, behavior goal

The user can edit any persona, add custom ones (up to 5), or pull from a pre-built library (Skeptical Founder, Frustrated Senior, Busy Executive, etc.).

### Step 2 — Launch (autonomous)

Clicking "Confirm Cohort & Launch" creates a test run and fires off one orchestrator process per persona (fire-and-forget). The user is redirected to the live session view immediately.

### Step 3 — Live Session View

A real-time dashboard shows:
- **Browser mirror** — latest screenshot from the active persona
- **Monologue bubble** — the persona's internal thought process, step by step
- **Navigation history** — every action taken, timestamped, with emotion tag
- **Diagnostics terminal** — live log stream from the orchestrator process

### Step 4 — Report

Once all sessions complete, a report is auto-generated. It includes:
- **UX Health Score** (0–100)
- **Executive briefing** — 3–5 paragraph AI-written audit (Markdown)
- **Action items** — up to 5 prioritized fixes (High / Medium / Low)
- **Persona segmentation** — scores broken down by tech literacy
- **Per-persona journey** — every step with screenshot, monologue, UX feedback, and proposed solution
- **Technical audit** — broken links, load times, request failures

Reports can be shared via link or exported to PDF.

---

## Engine Architecture

The engine has three components that work together: **Orchestrator**, **Browser Service**, and **LLM Service**.

```
┌─────────────────────────────────────────────────┐
│                  ORCHESTRATOR                    │
│  - Manages session state machine                │
│  - Coordinates Browser ↔ LLM                    │
│  - Writes logs to Supabase                      │
│  - Broadcasts status via Realtime               │
└────────────┬────────────────┬───────────────────┘
             │                │
    ┌─────────▼──────┐  ┌─────▼──────────────┐
    │ BROWSER SERVICE│  │   LLM SERVICE       │
    │  (Stagehand +  │  │  (Gemini / OpenAI / │
    │   Playwright)  │  │   OpenRouter /      │
    │                │  │   Ollama)           │
    │ - Navigate     │  │                     │
    │ - Screenshot   │  │ - Decide next action│
    │ - DOM extract  │  │ - Analyze page UX   │
    │ - Perform act  │  │ - Generate report   │
    │ - Track network│  │ - Suggest archetypes│
    └────────────────┘  └─────────────────────┘
```

### Orchestrator

**File:** `src/lib/engine/orchestrator.ts`

The orchestrator runs the full session lifecycle. Key constants that govern behavior:

```
MAX_PAGES          = 15   — Hard cap on unique pages visited per session
MAX_ACTIONS_PAGE   = 5    — Max interactions per page before moving on
MAX_SAME_ACTIONS   = 2    — Identical consecutive actions before blacklisting
DB_FLUSH_INTERVAL  = 3    — Write buffered logs to DB every N steps
LINK_HARVEST_MAX   = 20   — Max links collected from any single page
```

**Session flow:**

1. Fetch project config from DB (LLM provider, encrypted API key, URL)
2. Decrypt API key, initialize LLMService and BrowserService
3. Navigate to start URL, set session status → `running`
4. Enter **traversal loop** — queue-based depth-first crawl:
   - Pop URL from queue
   - Check if already visited (skip if so)
   - Detect auth pages via regex — skip without LLM call
   - Run **full-page scan** (one LLM call covers all viewport sections)
   - Harvest same-origin links → add to queue
   - Run **action loop** (up to 5 actions per page):
     - Observe current viewport
     - Ask LLM for next action
     - Detect loops, blacklist stuck patterns
     - Execute action via browser
     - Log step with emotion, monologue, screenshot, UX feedback
5. After all pages visited or caps hit: flush logs, set status → `completed`
6. Trigger report generation if all sessions in the test run are complete

**Loop detection:** The orchestrator tracks consecutive identical actions. After 2 repeats, the element is blacklisted for the current page. The LLM is informed of the blacklist so it tries something different.

**Auth page guard:** If a URL matches patterns like `/login`, `/signup`, `/register`, `/auth` — the page is skipped entirely without an LLM call. The LLM prompt also instructs personas never to fill credentials, even if they encounter an auth form.

**Buffered logging:** Steps are held in memory and flushed to DB every 3 steps (and always at session end). This reduces database roundtrips by 60–70% on long sessions.

---

### Browser Service

**File:** `src/lib/engine/browser.ts`

Built on **Stagehand**, which wraps Playwright's Chromium with AI-assisted action interpretation. Instead of brittle CSS selectors, actions are natural language: `"Click on the Subscribe button"`.

**Viewport:** 1280×800 headless Chromium.

**Full-page scan strategy:**

The browser captures multiple viewport slices to represent the full page to the LLM:

```
Page height > 1.5× viewport:  capture Top + Mid + Bottom sections
Page height ≤ 1.5× viewport:  capture Top section only

Quality:
  Section screenshots (Top/Mid/Bottom): 40% JPEG  — fast, reduced tokens
  Primary screenshot (returned to top): 60% JPEG  — better quality + DOM context
```

All sections are passed to the LLM in a single multi-image request — one LLM call covers the whole page.

**DOM extraction:** Pulls interactive elements from the accessibility tree (links, buttons, inputs, combos). Deduplicates by `role::text` key. Max 30 elements per viewport. Coordinates resolved for heatmap data.

**Network monitoring:** Tracks HTTP 400+ responses as broken links, counts request failures, measures navigation latency. All stored in session metrics for the technical audit.

**Link harvesting:** After each page visit, extracts all `<a href>` same-origin links. Filters out assets, auth paths, pagination params, hash-only links. Deduplicates by normalized pathname. Adds up to 20 new URLs to the traversal queue.

---

### LLM Service

**File:** `src/lib/engine/llm.ts`

Provides a unified `LLMProvider` interface implemented by four classes:

| Provider | Model | Vision | Notes |
|---|---|---|---|
| `GeminiProvider` | gemini-2.0-flash | Yes | Free, default |
| `OpenAIProvider` | gpt-4o / gpt-4o-mini | Yes | Enterprise tier |
| `OpenRouterProvider` | User-selected | Yes | 100+ models, retry on 429 |
| `OllamaProvider` | User-configured | Required | Local, private, free |

**Key LLM calls:**

#### 1. `decideNextAction` — Per-step persona decision

Called every action. Receives: current screenshot + DOM + persona profile + action history + blacklist.

The LLM responds as the persona, producing:
```typescript
{
  type: 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail' | 'skip_node'
  text?: string               // element label or text to type
  reasoning: string           // first-person internal monologue
  emotional_state: string     // one of 9 emotions
  emotional_intensity: number // 0.0 – 1.0
  ux_feedback: string         // honest UX critique
  proposed_solution?: string  // specific fix recommendation
  possible_paths: string[]    // alternatives considered
}
```

Terminal actions (`complete`, `fail`, `skip_node`) end the current page loop. The prompt explicitly instructs the LLM to use `skip_node` on auth forms, 404s, or pages with no relevant content.

#### 2. `analyzePageSections` — Full-page UX audit

Called once per page (not per action). Receives all captured viewport sections as images in a single request.

Returns per-section breakdown:
```typescript
{
  sections: [{
    label: 'Top' | 'Mid' | 'Bottom'
    ux_feedback: string
    emotional_state: string
    emotional_intensity: number
    proposed_solution?: string
  }],
  overall_emotion: string
  overall_intensity: number
  page_summary: string
}
```

This is a significant optimization: instead of 3 separate LLM calls (one per section), one call processes all sections. ~50% token reduction.

#### 3. `generatePersonas` + `suggestArchetypes` — Setup wizard

Text-only calls (cheaper model). Used during setup to auto-generate the persona cohort from site context. Results cached in Supabase `ai_caches` table keyed by normalized URL — repeated visits for the same URL don't call the LLM again.

#### OpenRouter rate limiting

All OpenRouter API calls wrap a retry helper:
```
Attempt 1  → wait 1s → Attempt 2  → wait 2s → Attempt 3  → wait 4s → Throw
```
Handles 429 rate limit responses without crashing the session.

---

## Scoring System

**File:** `src/lib/utils/scoring.ts`

### Philosophy

**Neutral baseline = 60/100.** A site where users feel nothing is mediocre, not acceptable. The scoring is asymmetric because users are more sensitive to pain than pleasure — frustration has a larger penalty than delight has a reward.

### Emotion Weights

```
delight        → +15   (gold standard: user is happy, delighted, excited)
surprise       → +8    (positive discovery, unexpected delight)
satisfaction   → +6    (task completed as expected)
curiosity      → +4    (engagement, exploration)
neutral        →  0    (no signal)
boredom        → -6    (disengagement, passive dropout risk)
confusion      → -10   (active friction, something is unclear)
disappointment → -12   (expectation violated, trust damaged)
frustration    → -20   (strongest signal — churn risk, abandon likely)
```

### Algorithm

For each step in the session:
1. Get `emotion_tag` and `emotional_intensity` (0.0–1.0, normalized from 0–100 if needed)
2. `contribution = weight[emotion_tag] × intensity`
3. Average all contributions → `avgWeight`
4. Map linearly to 0–100:

```
avgWeight ≥ 0:  score = 60 + (avgWeight / 15) × 40     [60→100 range]
avgWeight < 0:  score = 60 + (avgWeight / 20) × 60     [0→60 range]
```

**Examples:**

| Scenario | Avg Weight | Score |
|---|---|---|
| All neutral | 0 | 60 |
| All delight (intensity 1.0) | +15 | 100 |
| All frustration (intensity 1.0) | -20 | 0 |
| 60% satisfaction, 40% confusion | -0.4 | 59 |
| 80% curiosity, 20% frustration | -0.8 | 58 |
| 50% delight, 50% confusion | +2.5 | 67 |

### Emotion Breakdown

Each session also returns the percentage of steps per emotion type — shown in the report as bar charts per persona.

### Cohort Average

Individual session scores averaged → **Overall UX Health Score** shown in the report header.

---

## Persona System

### Pre-built Library

Five templates are available for quick launch:

| Persona | Tech Literacy | Behavior |
|---|---|---|
| Skeptical Founder | High | ROI-focused, hates buzzwords, bounces if value unclear in 30s |
| Frustrated Senior | Low | Confused by hamburger menus, needs large labels, panics at popups |
| Busy Executive | High | Skims for keywords, wants CTA immediately, bounces at >3s load |
| Comparison Shopper | Medium | Price-sensitive, reads feature tables, checks footer for legitimacy |
| Power User | High | Tries CMD+K, expects dark mode, tests input edge cases |

### AI-Generated Cohort

When the user enters a URL, the platform:
1. Scrapes the site with a headless browser (always uses Gemini Flash for this, regardless of user's selected LLM)
2. Calls LLM → 6 audience archetypes (with icons: users, zap, user, globe, shopping-cart, etc.)
3. Calls LLM → 5 persona categories from those archetypes
4. Both results cached in `ai_caches` table — same URL never re-generates

### Persona Profile Schema

```typescript
{
  name: string           // Role label, not a human name ("Budget Traveler", not "John")
  geolocation: string    // "United States", "India", etc.
  ageRange: string       // "25-40"
  techLiteracy: 'low' | 'medium' | 'high'
  domainFamiliarity: string  // Context: e.g., "familiar with SaaS tools"
  prompt: string         // Mindset / behavioral goal
  personaCount: number   // 1–10 parallel instances
}
```

Tech literacy calibrates the LLM response:
- **Low** → More confusion, boredom, avoidance of complex UI
- **Medium** → Balanced emotional range
- **High** → More satisfaction from good patterns, more frustration from bad ones

---

## Multi-LLM Architecture

### Why OpenRouter

OpenRouter provides OpenAI-compatible API access to 100+ models (Claude, Llama, Mistral, Gemini, etc.) through a single endpoint. Specter uses the existing `openai` SDK with `baseURL: 'https://openrouter.ai/api/v1'` — no new dependencies.

### Two LLMs in Every Session

There are actually two AI roles in each session:

| Role | What It Does | Always Uses |
|---|---|---|
| **Browser automation** (Stagehand) | Interprets natural language actions into browser interactions | Gemini Flash (env key) |
| **Reasoning / persona** (LLMService) | Decides actions, evaluates UX, writes report | User's chosen provider |

This means even if a user selects OpenRouter with a Claude model, Stagehand still uses Gemini Flash for clicking and navigating — because Stagehand is tightly integrated with Google's vision API. The user's key only drives the "thinking" layer.

### Key Selection in UI

```
[ Gemini ]   [ OpenRouter ]   [ Local ]

If OpenRouter:
  Model ID:   [anthropic/claude-3-5-sonnet    ]  ↗ Browse vision models
  API Key:    [sk-or-v1-...                   ]
```

Keys are encrypted (AES-256-CBC) before storage in the database.

---

## Realtime System

**Technology:** Supabase Realtime — WebSocket-based pub/sub over PostgreSQL.

Two channel patterns are used:

### Postgres Changes (Durable)

Triggered automatically when DB records change:

```
channel: session_{sessionId}     → Session status updates (running → completed)
channel: logs_{sessionId}        → New step logs inserted (live navigation history)
```

### Broadcast (Ephemeral)

Sent directly from the orchestrator process, never persisted:

```
channel: terminal_{sessionId}    → Diagnostics: "Page 3/15: Scanning 4 sections..."
```

Broadcast is instant. Postgres Changes are slightly delayed (~100ms). Both are used on the session page simultaneously — broadcast for the terminal, postgres changes for the session state and log history.

---

## Database Schema

**Core tables:**

```
users                  — Clerk-synced user accounts (JIT sync on first action)
projects               — Target URL + LLM config per user (unique: user_id + target_url)
persona_configs        — Persona templates (reusable across test runs)
test_runs              — A batch of sessions for one project
persona_sessions       — One persona's journey (status, screenshots, live state)
session_logs           — Step-by-step actions, screenshots, emotions, feedback
reports                — Aggregated analysis, AI briefing, score, action items
ai_caches              — Cached archetype/persona suggestions per URL
```

**Key relationships:**

```
users → projects → test_runs → persona_sessions → session_logs
                              ↓
                           reports
                 persona_configs → persona_sessions
```

**RLS:** All tables have Row Level Security enabled. Users can only access their own data, enforced via Clerk JWT claims.

---

## Report Generation

**File:** `src/lib/engine/reporter.ts`

After all sessions in a test run complete, `generateAndStoreReport` runs:

1. Fetch all sessions + their logs from Supabase
2. Calculate emotion stats, unique UX feedback strings, session scores
3. Build qualitative context: first 2 steps, last 2 steps, all friction-flagged steps
4. Send to LLM (text-only, cheap model) with the synthesis prompt:

```
You are a senior UX strategist. Write a professional executive UX audit report.
[Stats, feedback, session context]

Write in Markdown. Cover: visual hierarchy, navigation friction, content clarity, trust signals.
State the biggest drop-off risks and which persona types are affected.

Then output action items:
[ACTION_ITEMS]
- (Priority: High) | Fix: [title] | Detail: [recommendation]
[/ACTION_ITEMS]
Max 5 items.
```

5. Parse `[ACTION_ITEMS]` block, extract priority/title/detail per line
6. Store in `reports` table: score, executive_summary (Markdown), action_items (JSON), funnel rate

---

## Performance Optimizations

| Optimization | Impact |
|---|---|
| Multi-section single LLM call | ~50% token reduction vs per-section calls |
| Buffered DB writes (every 3 steps) | ~65% fewer database roundtrips |
| Auth page regex skip | Saves LLM call on every login/signup page |
| DOM deduplication (max 30 elements) | Smaller context, faster LLM decisions |
| Link filter + dedup | Prevents queue explosion on large sites |
| Archetype/persona caching | Zero LLM calls for repeat URLs |
| Loop blacklisting | Prevents infinite spin on broken UI |

---

## What's Production-Ready vs. In Progress

### Production-Ready
- Full autonomous session execution (multi-page, multi-persona)
- Multi-LLM provider support with encryption
- Real-time session view with terminal and screenshots
- Scoring system and report generation
- PDF export, link sharing
- Supabase RLS, Clerk auth

### In Progress / Incomplete
- **Manual mode UI** — backend and DB schema done, frontend toggle missing in setup wizard
- **Auth credential support** — schema exists, UI section commented out (LLM is instructed to never fill credentials)
- **Screenshot storage** — currently local filesystem (`/public/screenshots/`); needs S3/GCS for production scale
- **Heatmap visualization** — `heatmap_data_url` field reserved in reports, not generated yet
- **Concurrent session limits** — no per-user throttling; could hit LLM rate limits on large cohorts

---

## Deployment

**Required environment variables:**
```bash
GEMINI_API_KEY                # Always required (browser automation uses this)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ENCRYPTION_KEY                # For vault.encrypt() / vault.decrypt()

# Optional (per provider)
OPENAI_API_KEY
OLLAMA_HOST                   # Default: http://localhost:11434
OLLAMA_MODELS                 # Comma-separated model names
```

**Hosting:** Vercel (Next.js 16, App Router). Uses `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`).

**Browser:** Headless Chromium via Playwright. On Vercel, Stagehand can use BrowserBase for cloud-hosted browsers.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + Realtime) |
| Browser automation | Stagehand (Playwright + AI) |
| LLM | Gemini / OpenAI / OpenRouter / Ollama |
| Styling | Tailwind CSS |
| PDF export | html2canvas + jsPDF |
| Deployment | Vercel |
| Key encryption | AES-256-CBC (vault.ts) |

---

*Last updated: March 2026*
