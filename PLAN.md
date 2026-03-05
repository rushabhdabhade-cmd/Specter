# Specter Implementation Plan

This is a step-by-step development strategy to build Specter. The strategy is broken down into four distinct phases, prioritizing getting the core "engine" working first before building the surrounding SaaS infrastructure.

## Phase 1: Core Engine (Vertical Slice - 1 Persona)

**Goal:** Prove the core value proposition. A user can run a single persona against a single URL and get a basic report back.

### Step 1.1: Project Initialization

- Initialize Next.js application (App Router, TypeScript, Tailwind CSS).
- Set up ESLint, Prettier, and basic project structure (`components`, `lib`, `api`, `app`).
- Set up Supabase project (PostgreSQL database).
- Create basic schema for `Projects`, `TestRuns`, `PersonaConfigs`, `PersonaSessions`.

### Step 1.2: Minimum Viable UI

- Build a simple manual form to input a target URL.
- Build a basic manual form to configure a single Persona (Age, Tech level, Goal).
- Display a loading state when the test is running.

### Step 1.3: Playwright Integration & Basic LLM Loop

- Set up Playwright in a backend Node.js environment (Next.js API route or separate worker script for local dev).
- Write a script that navigates to a URL, captures a screenshot, and extracts basic DOM elements.
- Integrate a Multimodal LLM (e.g., GPT-4o).
- Build the perception-cognition-execution loop: Send the screenshot + DOM to the LLM, parse the JSON response, and use Playwright to execute the click/type action.
- _Milestone:_ Watch the headless browser autonomously click through a test site successfully.

### Step 1.4: State & Logging

- Store action logs (clicks, text typed) in Supabase.
- Store the persona's inner monologue/emotional state.
- Build a basic hard-coded text report generator that spits out the journey.

---

## Phase 2: Orchestration & Analytics

**Goal:** Scale the engine to run multiple personas simultaneously and aggregate their data into visual and statistical insights.

### Step 2.1: Queue System (BullMQ)

- Integrate Redis-backed BullMQ.
- When a user submits a test with 5 personas, enqueue 5 distinct jobs.
- Build standalone worker processes that consume these jobs and spin up Playwright instances concurrently.

### Step 2.2: Artifact Storage

- Integrate Cloudflare R2 or AWS S3.
- Modify the engine to upload viewport screenshots at every step of the journey to cloud storage.
- Update database records to link to these stored screenshot URLs.

### Step 2.3: Data Aggregation & Analytics Engine

- Build a pipeline that takes all individual `PersonaSession` logs for a `TestRun` and aggregates them.
- Write scripts to map X/Y click coordinates onto screenshot overlays to simulate heatmaps.
- Write an LLM prompt that takes all individual journeys and synthesizes a "Product Opportunity Score" and an Executive Summary.

### Step 2.4: Report UI

- Build the final interactive dashboard.
- Create a three-panel view:
  1.  Overview (Scores, Executive Summary)
  2.  Persona Journeys (Click-by-click narrative replay)
  3.  Visuals (Heatmaps and Drop-off funnels)

---

## Phase 3: SaaS Infrastructure

**Goal:** Turn the working prototype into a user-ready product with accounts, limits, and payments.

### Step 3.1: Authentication

- Integrate Supabase Auth (or Clerk).
- Add Google OAuth and Email/Password login.
- Protect API routes and dashboard pages (ensure users can only see their own `Projects` and `TestRuns`).

### Step 3.2: Subscription & Billing

- Integrate Stripe Checkout and Customer Portal.
- Create subscription logic matching the pricing tiers (Free, Pro, Team).
- Enforce limits in the backend (e.g., if on Free tier, block test runs > 3 personas).

### Step 3.3: UX Polish

- Build the actual marketing landing page.
- Polish the onboarding flow: Sign up -> Add Project -> Run Test in < 5 minutes.
- Improve edge-case handling in the UI (e.g., giving users distinct feedback if the LLM hit a CAPTCHA and died).

---

## Phase 4: Hardening & Edge Cases

**Goal:** Prepare for public launch and real-world messy web apps.

### Step 4.1: Edge Case Sandbox

- Build mitigation for Infinite Scrolling (maximum pagination depth).
- Build mitigation for repeated DOM action loops (LLM clicking the same thing 5 times).
- Handle authentication injection (allowing the LLM to use provided credentials to log into apps).

### Step 4.2: Infrastructure Scaling

- Containerize the Playwright workers using Docker.
- Deploy to a provider like Railway or Render that supports dynamic scaling of worker containers based on BullMQ queue depth.

### Step 4.3: Final Checks

- Load Testing: Run a cohort of 50 concurrent personas to monitor database connections and memory consumption.
- Add Telemetry (e.g., PostHog/Sentry) for internal monitoring of app stability.
