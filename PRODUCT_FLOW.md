# Specter: Complete Product Flow & Architecture

This document details the end-to-end operational flow of **Specter**, describing how a user interacts with the system, how synthetic personas are generated, and the autonomous backend loop where the LLM interacts with the target application.

---

## 1. User Journey: Setup & Configuration (Frontend)

The flow begins when a human user (e.g., a solo founder) logs into the Specter dashboard to initiate a new test run.

### Step 1.1: Project & Target Setup

1. **URL Submission:** The user inputs the live web application URL they want to test (e.g., `https://example.com`).
2. **Authentication Injection (Optional):** If the app requires login, the user provides a set of test credentials (email/password) or a session cookie. Specter stores these securely to bypass login screens.
3. **Scope Definition (Optional):** The user can define specific goals (e.g., "Test the checkout flow") or restrict the test to specific sub-paths (e.g., `example.com/pricing`).

### Step 1.2: Persona Cohort Generation

The user configures the "synthetic users" that will test the app.

1. **Manual Configuration:** The user defines parameters for each persona:
   - **Demographics:** Age, Geolocation, Language.
   - **Technical Literacy:** Low, Medium, High.
   - **Mindset/Intent:** e.g., "Skeptical buyer looking for exact pricing," or "Impatient user wanting to sign up quickly."
2. **AI Persona Expansion:**
   - Before the test begins, Specter's backend uses an LLM to take these basic parameters and expand them into a **deep psychological profile**.
   - _Example:_ A "Low Tech, 50 y/o" persona becomes: _"You are Bob, 50. You get easily frustrated by hidden menus and small text. You prefer clear, large buttons. If you can't find pricing within 2 minutes, you will leave."_

---

## 2. Backend Orchestration (Job Queue & Workers)

Once the user clicks **"Run Test"**, the frontend sends the payload to the backend to begin execution.

### Step 2.1: Job Enqueueing

1. The backend receives the test configuration and creates a `TestRun` record in PostgreSQL (via Supabase).
2. For every persona in the cohort, a distinct `PersonaSession` job is pushed to a **Redis-backed Queue (BullMQ)**.
3. This architecture allows Specter to run dozens of personas in parallel without overwhelming the main API server.

### Step 2.2: Worker Instantiation

1. A background Worker picks up the `PersonaSession` job from the queue.
2. The Worker spins up an isolated, sandboxed **Headless Browser instance (via Playwright)**.
3. The Playwright instance is configured to match the persona's technical profile (e.g., mimicking a mobile device viewport, setting a specific user agent, or simulate slower network speeds for older demographics).
4. The browser navigates to the target URL provided in Step 1.1.

---

## 3. The Autonomous LLM Interaction Loop (The Engine)

This is the core of Specter. The LLM acts as the "Brain," and the headless browser acts as the "Eyes and Hands." This loop repeats until a termination condition is met.

### Step 3.1: Perception (Seeing the App)

Once the page loads, the system must translate the visual DOM into something the LLM can understand.

1. **Screenshot Capture:** Playwright takes a full viewport screenshot.
2. **DOM Parsing (Accessibility Tree):** The worker extracts interactable elements (buttons, links, inputs) and maps them to coordinates. It may overlay bounding boxes with ID numbers on the screenshot to help the multimodal LLM target specific elements.
3. **State Construction:** The worker packages:
   - The annotated screenshot.
   - A simplified representation of the DOM.
   - The persona's psychological profile and current goal.
   - The history of previous actions (to prevent infinite loops).

### Step 3.2: Cognition (The LLM Decision)

The package is sent to a Multimodal LLM (e.g., GPT-4o or Claude 3.5 Sonnet) with a strict system prompt instructing it to roleplay as the persona.

The LLM is required to output a structured JSON response containing three parts:

1. **Inner Monologue/Thoughts:** _"I see the homepage. I'm looking for pricing, but it's hidden behind a hamburger menu. This is slightly annoying."_
2. **Emotional State Update:** `{"emotion": "mild_frustration", "score": 3}`
3. **Next Action:** The specific command to execute. Options include:
   - `{"action": "click", "target_id": 14}`
   - `{"action": "type", "target_id": 5, "value": "test@email.com"}`
   - `{"action": "scroll", "direction": "down", "amount": 500}`
   - `{"action": "wait", "seconds": 2}`
   - `{"action": "terminate", "reason": "goal_achieved"}`

### Step 3.3: Execution (Interacting with the App)

1. The Worker receives the JSON payload from the LLM.
2. Playwright translates the requested action into actual browser commands (e.g., `page.mouse.click(x, y)` or `page.keyboard.type()`).
3. The action is logged to the database under this `PersonaSession`.
4. Playwright waits for network idle or dom mutations (simulating human reaction time).

### Step 3.4: Loop Continuation or Termination

The cycle repeats (Perception ➔ Cognition ➔ Execution) until ONE of the following happens:

- **Success:** The LLM declares the persona's goal is met.
- **Abandonment:** The persona's frustration threshold is breached, and they "rage quit."
- **Timeout / Limit:** The session exceeds the maximum permitted steps (e.g., 20 actions) or maximum time (e.g., 5 minutes) to prevent runaway cloud costs.
- **Dead End / Error:** The browser hits a CAPTCHA or fatal application crash.

---

## 4. Data Aggregation & Report Generation

After all workers complete their persona sessions, the final phase synthesizes the raw data into actionable insights for the human user.

### Step 4.1: Post-Processing Data

1. **Visual Heatmaps:** The backend aggregates all X/Y click coordinates and scroll depths across all sessions to generate visual heatmap overlays.
2. **Drop-off Analysis:** The system calculates the funnel conversion rate (e.g., 10 personas started ➔ 8 clicked pricing ➔ 2 reached signup).

### Step 4.2: AI Synthesis

The backend makes a final LLM call, feeding it the aggregated action logs, emotional states, and individual persona narratives. The LLM generates:

- **Product Opportunity Score:** A synthesized metric representing UI clarity.
- **Executive Summary:** Highlighting the most common friction points (e.g., _"60% of personas over age 40 failed to find the signup button due to low contrast."_)

### Step 4.3: Result Delivery

1. The `TestRun` status is marked as `COMPLETED`.
2. The user receives an email notification.
3. The user opens the Specter Dashboard to view the interactive Report View (Heatmap + Narrative + Scores).
