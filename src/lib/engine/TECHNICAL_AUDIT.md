# Technical Conversion Audit — How It Works

The **Technical Conversion Audit** section in the report provides deterministic, heuristic metrics that track the performance, network reliability, and UX friction points of the site during the AI traversal.

---

## 🏛️ 1. Overall Usability Score (0-100)

The dashboard presents an overall **Usability Score** that reduces linearly based on the number of critical issues found.

* **Formula**: `Maximum(0, 100 - (Total Issues * 5))`
* **Example**: If there are **2 broken links** and **1 slow page** (`3 total issues`), the score drops by `3 * 5 = 15`, resulting in an **85/100**.

---

## 🚦 2. Critical 404 Errors (Broken Links)

This panel tracks network requests that failed to fully resolve with a success response.

* **How it is captured**:
  The `BrowserService` attaches strict network listeners to the browsing page:
  ```ts
  page.on('response', (response) => {
      if (response.status() >= 400) {
          metrics.broken_links.push(`${status}: ${url}`);
      }
  });
  ```
  Any script, image, stylesheet, or API endpoint asset that throws `4xx` or `5xx` gets pushed into the broken links log dynamically.

* **How it is calculated**:
  The reporter parses through all logs in the session. If `broken_links_count > 0`, it adds the page to the list of bottlenecks so you can trace which views trigger resource leakage.

---

## ⚡ 3. Slow Load Alerts (Performance Bottlenecks)

Tracks page loads that take exceptionally long and exceed standard web-vitals thresholds for user patience.

* **How it is captured**:
  Whenever the AI instructs navigation to a URL:
  1. Starts a High-Res Timestamp (`Date.now()`).
  2. Executes `page.goto()` with a `domcontentloaded` wait state.
  3. Waits up to 5 seconds for `networkidle` state to settle properly.
  4. Computes latency: `Date.now() - start` and maps it to `metrics.last_load_time`.

* **How it is calculated**:
  The reporter filters all pages where `latency_ms > 3000ms` (3 seconds thresh). If found, the exact millisecond response latency is logged as a performance bottleneck.

---

## 🖱️ 4. Behavioral Friction Log (e.g. Rage Clicks)

Deterministic issues based on interaction heuristics emitted by LLM prompt templates or Stagehand observers.

* **How it is calculated**:
  The reporter checks any interaction step where `heuristic_finding` contains strict action keywords (such as `"Rage click"`). These denote places where the agent attempted multiple fast clicks on unresponsive or non-navigable DOM elements, signaling dead-end clicks or broken visual feedback loops.

---

## Where to find this in the code

| Component/File | Role |
|---|---|
| [`src/lib/engine/browser.ts`](src/lib/engine/browser.ts) | **Metrics gathering**: `attachNetworkListeners()` and `navigate()` compute timestamps and response statuses at the browser layer. |
| [`src/lib/engine/reporter.ts`](src/lib/engine/reporter.ts) | **Data Aggregation**: Reads raw metric counters out of traversal steps and aggregates onto the `report_data` JSON doc safely saved inside Supabase. |
| [`src/components/reports/TechnicalAudit.tsx`](src/components/reports/TechnicalAudit.tsx) | **UI Display**: Loops over `slowPages/brokenLinks/frictionPoints` bundles to draw the responsive checklist layout viewable on your dashboard reporting suite. |
