# Specter Database Schema: Detailed Architecture

This document meticulously explains the PostgreSQL database structure required for the Specter platform. It details not just *what* columns exist, but *why* they exist and exactly *what kind of data* they are expected to hold over the lifecycle of a test.

---

## 1. Core Platform Tables
These tables manage the human operator side of the SaaS. They govern authentication, billing limits, and the top-level organization of the apps being tested.

### `users`
**Purpose:** Stores human account information and SaaS billing tiers. Every record here represents a human paying (or testing) customer.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier linked directly to Supabase Auth. |
| `email` | String | Used for login and transactional emails (e.g., "Your test is ready"). |
| `name` | String | Display name for the dashboard UI. |
| `plan_tier` | ENUM ('free', 'pro', 'team') | **Crucial for rate limiting.** Determines how many personas they can spin up concurrently. Free = 3, Pro = 15. |
| `stripe_customer_id` | String | Links the user to their Stripe active subscription directly. |
| `created_at` / `updated_at` | Timestamp | Standard audit fields. |

### `projects`
**Purpose:** A "Workspace" representing a single, specific web application that a User wants to repeatedly test. 

**Why it exists:** Test runs and personas are grouped under a project so the user can track improvements to the same app over time, and so they don't have to re-input the target URL or authentication session cookies for every single test.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier for the web app. |
| `user_id` | UUID (FK) | Maps the project to the human owner. Required for Row Level Security (RLS). |
| `name` | String | Human readable label, e.g., "Specter Marketing Landing Page". |
| `target_url` | String | The exact base URL where every test starts (e.g., `https://specter.build/pricing`). |
| `requires_auth` | Boolean | Flags the worker that it must perform a login flow before beginning the real test. |
| `auth_credentials` | Text (Encrypted JSON) | Holds the JSON configuration for login. *Example:* `{"method": "cookie", "token": "session_id_123"}` or `{"method": "form", "email": "test@app.com", "password": "secure123"}`. **Must be encrypted at rest.** |

---

## 2. Testing Configuration Tables
These tables define *who* the AI is pretending to be and *what batch* of tests is currently firing.

### `persona_configs`
**Purpose:** Defines the archetypes of the fake human workers. These are templates that can be reused across different test runs.

**Why it exists:** Users don't want to retype "Age 50, low tech skills, looking for pricing" every time. They create a template here, and instances of this template are deployed during a run.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier for this AI template. |
| `project_id` | UUID (FK) | Kept at the project level so users don't pollute other projects with unrelated personas. |
| `name` | String | Human-readable label (e.g., "The Skeptical Budget Cutter"). |
| `tech_literacy` | ENUM ('low', 'medium', 'high') | Controls how the Playwright worker behaves. 'Low' might add artificial delays between clicks or scroll slowly. 'High' acts instantly. |
| `goal_prompt` | Text | The explicit, human-written instruction. *Example:* "Try to figure out if there is a free tier without reading the FAQ." |
| `ai_system_prompt` | Text | **The Brain.** Before testing, an LLM takes the `goal_prompt` and writes a 500-word deep psychological profile. This is injected into the Worker's system prompt to heavily bias the AI's decision-making matrix. |

### `test_runs`
**Purpose:** Represents the specific physical event of the user clicking "Deploy Test Data Now" against a specific codebase state. 

**Why it exists:** To group 15 parallel AI workers together so they eventually roll up into one unified analytics report.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | The Job ID passed to BullMQ. |
| `project_id` | UUID (FK) | Which app are we hitting? |
| `status` | ENUM ('pending', 'running', 'completed', 'failed') | Controls the UI loading state on the dashboard. |
| `started_at` | Timestamp | When the first worker spawned. |
| `completed_at` | Timestamp | When the final worker died/finished. Used to calculate total compute billable time. |

---

## 3. Session & Execution Tables (The Big Data)
This is the core "Engine" data. When 15 personas run in parallel and take 50 actions each, these tables ingest hundreds of rows of high-density telemetry data per minute.

### `persona_sessions`
**Purpose:** Represents a single, isolated Playwright browser instance pretending to be one specific `persona_config` right now.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Ties back to a specific headless browser container. |
| `test_run_id` | UUID (FK) | Which cohort does this browser belong to. |
| `persona_config_id` | UUID (FK) | Which personality template is this browser using today. |
| `status` | ENUM ('queued', 'running', 'completed', 'abandoned', 'error') | Track if the user successfully finished their task ('completed') or rage-quit in frustration ('abandoned'). |
| `exit_reason` | Text | The explicit reason the browser closed. *Example:* "DOM element `#checkout` successfully clicked" or "Frustration limit reached, could not find cancel button." |

### `session_logs` 
**Purpose:** The most important table in the app. This is the timeline. Every single time the AI blinks, clicks, scrolls, or gets angry, a row is inserted here. This table reconstructs the "Visual Replay" for the final report.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifier. |
| `session_id` | UUID (FK) | Ties this action to the active browser instance. |
| `step_number` | Integer | Absolute timeline ordering (1, 2, 3...) to rebuild replay videos. |
| `current_url` | String | Where the browser was immediately before taking the action. |
| `screenshot_url` | String | The AWS S3 / Cloudflare R2 bucket link to the raw `.png` viewport screenshot of exactly what the AI saw at that millisecond. |
| `emotion_tag` | ENUM ('neutral', 'confusion', 'frustration', 'delight') | How the AI felt looking at the `screenshot_url` based on its persona. |
| `emotion_score` | Integer (1-10) | How intense was the confusion or frustration. If this hits 10, the session throws an 'abandoned' flag and quits. |
| `inner_monologue` | Text | The raw thinking logic returned by the multimodal LLM. *Example:* "I'm looking at the header. I see pricing, but I am clicking login by mistake because the buttons are too close together and I am elderly." |
| `action_taken` | JSONB | The physical Playwright command executed. *Example Data:* `{"type": "click", "element_type": "button", "x": 1050, "y": 80, "targetText": "Sign In"}`. Used to build physical heatmaps later. |

---

## 4. Aggregation Tables
These tables store the final, synthesized data after the engine finishes turning. It prevents the app from having to constantly query millions of rows of `session_logs` to load a dashboard.

### `reports`
**Purpose:** The single source of truth for the dashboard UI. Once a `test_run` completes, an Aggregator Worker summarizes all the data, writes one row here, and the dashboard reads from this extremely fast table.

| Column | Type | Explanation |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identifier. |
| `test_run_id` | UUID (FK, Unique) | It is a strict 1:1 relationship with a completed test run. |
| `product_opportunity_score` | Integer (0-100) | An algorithm score calculated by factoring in the average `emotion_score` across all sessions mixed with the `funnel_completion_rate`. |
| `executive_summary` | Text | A human-readable paragraph generated by passing all the `inner_monologue` data from the sessions back through a final LLM summarizer query. |
| `funnel_completion_rate` | Decimal | The percentage of sessions in this test run whose `exit_reason` matched "goal_achieved". |
| `heatmap_data_url` | String | Links to a flat JSON file in S3 containing an array of millions of X/Y coordinates. We store this in S3, rather than the DB, because retrieving a static JSON file for the `<canvas>` frontend to render heatmaps is much cheaper and faster than querying Postgres. |
