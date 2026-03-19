# 🧠 Specter: Autonomous Persona Audit Engine

The Specter Engine is an **Autonomous Synthetic User Testing framework**. It simulates real human behaviors, emotional responses, and navigational intent using multimodal Large Language Models (LLMs) and advanced browser automation.

---

## 🏗️ Core Architecture Components

### 1. **The Orchestrator (`orchestrator.ts`)**
The "Prefrontal Cortex" of the engine phase. Handles session state, loop-cycles, budget calculation thresholds, and database synchronizations.
- **Node-Queue Manager**: Drives traversal over branching sitemap directories structures.
- **Budget Scaler Control**: Regulates LLM execution quantities limits fairly proportional to node depths loaded forwards directly.

### 2. **Browser Service (`browser.ts`)**
The Visual Controller framing Stagehand hooks (Playwright-based wrapper) to load frame environments.
- **Link Harvesting**: Scans source pages for local hostname branch nodes.
- **Visually methodical Scans**: Breaks viewport heights iteratively analyzing fragments (`Top/Mid/Bottom`) correctly benchmarks securely.

### 3. **LLM Service (`llm.ts`)**
The Decision Inference Matrix deciding interactive loads.
- **Sensory Processing**: Takes live DOM context mappings and screenshot buffers translating states formats.
- **UX Criticism Engine Inference**: Determines whether action `click` / `scroll` solves node requirements based on exact prompts conditions forwards.

---

## 🚀 Key Operational Pillars

### 🌳 Tree-Based Sitemap Traversal
The engine scales single URLs targeting into multi-node branches explorations:
1.  **Queue Seeds**: Appends root domain to traversal nodes limits lists.
2.  **Edge Discovery**: Captures matching-origin offsets.
3.  **Recursively loops bounds**: Limits loops action limits per branch before jumping forwards smoothly.

### ⚖️ Dynamic Budget Allocation
To prevent infinite recursive setups over large-scale apps framing:
-   **Equation Formula triggers**: `Math.min(100, Math.max(30, (visited.size + queue.length) * 3))`
-   **Independent Setups insulation bounds**: Setup buffers (Initial Navigations, Setup scripts) are fully insulated from restricting allowable interactive budget counts triggers downwards securely.

### 🧩 Conditional Unified Layout Scans
Slashing repetitive token spikes loading recursive scans over action depths frames:
-   Full scans (`sequential_analysis_top/mid/bottom`) run **exactly once** on top nodes initial arrival loops.
-   Subsequent micro-interactions skip redundant fragmentation loads to speed up flow speeds.

### 🛑 Early Breakout Guardrails
AI-guided decision breaking prevents hanging loops stalls:
-  If AI returns `'skip_node'`, system logs the restraint blocks (Auth walls, persistent modals, access geo blocks) and instantly skips to next queue nodes.
-  **Loop Detect threshold**: Bails nodes iteration faster downwards consecutive stalled action counts triggers forwards smoothly.

---

## 📊 Live Monitoring Streams Metrics
Everything routes over **Supabase Realtime PostgreSQL channel publishers**:
-  Includes `Nodes x/y` remaining buffers.
-  Includes `Budget x/y` allowances counters.
-  Synchronizes `live_status` pills displaying capsule overlay states synchronously live forwards!
