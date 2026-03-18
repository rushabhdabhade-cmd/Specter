# Specter Engine Technical Documentation

This document provides a deep-dive into the architecture and operational flow of the Specter engine—the core of the automated UX testing platform.

## 🛠️ Setup & Local Configuration

To enable the full multi-model specialist architecture locally, you must install the following models via Ollama:

```bash
# Pull the UX Specialist Team
ollama pull llama3.2-vision  # The Persona Specialist
ollama pull qwen2-vl         # The Layout Specialist
ollama pull moondream        # The Visual Validator
```

### Environment Configuration
Ensure your `.env` (or project settings) includes the parallel models:
```env
OLLAMA_MODELS=llama3.2-vision,qwen2-vl,moondream
OLLAMA_HOST=http://localhost:11434
```

---

## 🏗️ Architecture Overview

Specter follows a **Perception-Cognition-Execution** (PCE) loop, orchestrated by a central controller that manages state and communication between specialized services.

### 1. The PCE Loop
The engine operates in distinct steps (default max 15):
1.  **Perception ([BrowserService](src/lib/engine/browser.ts))**: Captures the current visual and structural state of the webpage (screenshot + DOM).
2.  **Cognition ([LLMService](file:///Users/rushabhdabhade/Desktop/Specter/src/lib/engine/llm.ts))**: Processes the perception via multimodal LLMs to decide the next action based on a persona profile.
3.  **Execution ([BrowserService](file:///Users/rushabhdabhade/Desktop/Specter/src/lib/engine/browser.ts))**: Performs the decided action (click, type, scroll, wait) on the live browser.

---

## 🛰️ Core Components

### [Orchestrator](file:///Users/rushabhdabhade/Desktop/Specter/src/lib/engine/orchestrator.ts)
The "Brain" of the operation. It handles:
-   **Session Lifetime**: Initialization, step looping, and graceful shutdown.
-   **Real-time Status Streaming**: Updates the database with granular intent (e.g., "Step 1: Analyzing Visual Layout...") using non-blocking calls.
-   **Loop Prevention (V2)**: Hardened logic that detects repetitive 'wait' or 'click' cycles. If a loop is detected, it forces a recovery action (e.g., scroll).
-   **Background Logging**: Offloads heavy screenshot logging to the background to reduce latency between engine thoughts.

### [BrowserService](file:///Users/rushabhdabhade/Desktop/Specter/src/lib/engine/browser.ts)
The "Hands" and "Eyes." Built on Playwright:
-   **Observation**: Efficiently captures viewport screenshots and extracts the top 50 interactable elements (with unique IDs mapped to red labels).
-   **Hyper-Drive Speed**: Optimized with aggressive 3s network settling and 1s wait durations.
-   **Interaction**: Executes precision clicks and scrolls using coordinates or CSS selectors.

### [LLMService](file:///Users/rushabhdabhade/Desktop/Specter/src/lib/engine/llm.ts)
The "Cognitive Processor."
-   **Multi-Model Parallel Inference**: Can pulse multiple Ollama models simultaneously (LLaMA 3.2-Vision, Qwen2-VL, Moondream 2).
-   **Consensus Synthesis**: Aggregates reasoning from multiple "specialists" to form a robust final decision.
-   **Structured Thinking**: Enforces a 3-part internal monologue:
    1.  [VISUAL AWARENESS]
    2.  [CODE OVERVIEW]
    3.  [ACTION INTENT]

---

## 🏎️ Hyper-Drive & Speed Optimizations

Specter is engineered for high-throughput testing:
| Optimization | Mechanism | Speed Gain |
| :--- | :--- | :--- |
| **Non-Blocking Status** | `updateLiveStatus` is fire-and-forget. | ~500ms/step |
| **Parallel Logging** | Logging & Action-execution happen simultaneously. | ~1s/step |
| **Aggressive Settling** | `networkidle` timeout reduced to 3s. | ~5s/navigation |
| **Reduced Wait** | Internal `wait` actions reduced to 1s. | ~1s/wait |

--- [x] Navigation Resilience (Timeout Recovery)

## 🛡️ Resilience & Edge Cases

- **Resilient Navigation (NEW)**: Navigation now prefers the `load` state for speed, with a 5s non-blocking `networkidle` fallback. If a site times out but is not blank, the engine gracefully proceeds instead of crashing.
- **Anti-Analysis Paralysis**: If the AI uses `wait` twice in a row, the Orchestrator forces a scroll to break its confusion.
-   **Stuck Recovery**: Actions that fail (e.g., element missing) are logged as warnings but don't crash the session; the engine immediately proceeds to the next observation.
-   **Graceful Exit**: `Reporter.ts` ensures that even if a session errors out, a partial report is generated and the Test Run is finalized.

---

## 📊 Reporting ([Reporter](file:///Users/rushabhdabhade/Desktop/Specter/src/lib/engine/reporter.ts))
Once all sessions in a cohort finish:
1.  **Metric Calculation**: Synthesizes a "Product Opportunity Score" based on user frustration vs. delight.
2.  **Funnel Analysis**: Calculates completion rates.
3.  **Executive Summary**: Generates a high-level narrative of the test results.
