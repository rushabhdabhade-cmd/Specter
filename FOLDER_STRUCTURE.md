# Specter File & Folder Structure

This document outlines the directory architecture for the **Specter** Next.js monorepo. The app is structured using the Next.js **App Router** (`app/`) and uses a unified codebase for both the frontend dashboard and the backend API/Workers.

---

## 📂 `src/` (Core Application Code)

### 📂 `app/` (Next.js App Router)

Handles all routing, pages, and API endpoints.

- **`(marketing)/`** — Public-facing landing pages (no auth required).
  - `page.tsx` — Product Home page.
  - `pricing/page.tsx` — Pricing tiers.
- **`(dashboard)/`** — Authenticated app dashboard for users.
  - `layout.tsx` — Dashboard shell (Sidebar, Header).
  - `projects/page.tsx` — List of user’s web apps.
  - `projects/[projectId]/page.tsx` — Details for a specific project.
  - `projects/[projectId]/setup/page.tsx` — Form to configure a new test run.
  - `reports/[testRunId]/page.tsx` — The 3-panel final report view.
- **`api/`** — Serverless API routes (Backend).
  - `webhooks/stripe/route.ts` — Listens for subscription events.
  - `jobs/enqueue/route.ts` — Receives `TestRun` payload and pushes `PersonaSession` jobs to BullMQ.

### 📂 `components/` (React UI Components)

Reusable UI elements, roughly grouped by domain.

- **`ui/`** — Generic dumb components (Buttons, Inputs, Modals, Cards). _Often populated by shadcn/ui._
- **`dashboard/`** — Dashboard specific components (Sidebar, TopNav, StatCards).
- **`reports/`** — Components for the report view.
  - `HeatmapOverlay.tsx`
  - `JourneyReplay.tsx`
  - `ScoreCard.tsx`
- **`forms/`** — Complex form structures.
  - `PersonaConfigForm.tsx`
  - `ProjectUrlForm.tsx`

### 📂 `lib/` (Shared Utilities & Configurations)

Core utility functions executed across both client and server.

- `supabase/` — Supabase client initializers.
  - `client.ts` — Browser client.
  - `server.ts` — Server client.
- `utils.ts` — Small generic helpers (e.g., classname merging formatting dates).
- `constants.ts` — Magic strings, URLs, config settings.
- `types.ts` — TypeScript interfaces (e.g., `Persona`, `TestRun`, `ActionLog`).

### 📂 `server/` (Backend Logic & The "Engine")

This directory holds the heavy backend code that powers the synthetic users. _Code in here is strictly server-side._

- **`db/`** — Database wrappers and complex queries.
  - `queries.ts` — Functions like `getProjectWithRuns()`.
- **`engine/`** — The Core Specter Logic.
  - `playwright-manager.ts` — Handles spinning up, configuring, and killing headless browsers.
  - `dom-parser.ts` — Extracts clickable elements and parses them into JSON.
- **`llm/`** — Interaction with the AI.
  - `prompts.ts` — The massive system prompts that define persona behavior.
  - `client.ts` — Wrapper for OpenAI/Anthropic API calls (handling multimodal data).
- **`workers/`** — Queue processing.
  - `persona-worker.ts` — The function that executes the `Perception -> Cognition -> Action` loop continuously until test completion.
  - `aggregator.ts` — Synthesizes data after all sessions finish to build the final report.

---

## 📂 `public/` (Static Assets)

- `images/` — Logos, default avatars, empty-state graphics.
- `favicon.ico`

---

## 📂 Root Config Files

- `next.config.js` — Next.js specific settings (e.g., allowing external domains for S3 screenshots).
- `tailwind.config.ts` — Design system tokens (colors, fonts).
- `.env.local` — Secrets (Supabase keys, LLM API keys, Stripe webhook secrets, Redis URL).
- `package.json` — Dependencies (Next, Playwright, BullMQ, etc.).
- `playwright.config.ts` — Global configuration for headless browser testing behavior.
