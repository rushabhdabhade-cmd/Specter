# Specter UX Scoring — How It Works

## The Big Number: UX Health Score (0–100)

Every test run produces a single **UX Health Score** that summarises how users felt while navigating the site.

| Range | Meaning |
|---|---|
| **85 – 100** | Excellent — users felt mostly delight and satisfaction |
| **70 – 84** | Good — minor friction, but the core experience works |
| **55 – 69** | Mediocre — noticeable confusion or disappointment |
| **40 – 54** | Poor — recurring frustration, users are struggling |
| **0 – 39** | Critical — high frustration, likely to cause churn |

> A score of **60** means users felt completely *neutral* — neither good nor bad. Neutral is *mediocre*, not a pass.

---

## Step 1 — Every page action gets an emotion

The AI persona assigns an **emotion** and an **intensity** (0.0–1.0) to each action it takes on the site.

| Emotion | Weight | What it signals |
|---|---|---|
| 😊 Delight | **+15** | Users love this — rare and worth celebrating |
| 😯 Surprise | **+8** | Positive discovery, pleasant unexpected moment |
| 😌 Satisfaction | **+6** | Task completed smoothly |
| 🤔 Curiosity | **+4** | Engaged and exploring |
| 😐 Neutral | **0** | Nothing good or bad happened |
| 🥱 Boredom | **−6** | Users are disengaging |
| 😕 Confusion | **−10** | Something is unclear — a UX blocker |
| 😞 Disappointment | **−12** | Expectation wasn't met |
| 😤 Frustration | **−20** | Strongest negative signal — users may leave |

---

## Step 2 — Intensity scales the impact

Each emotion's weight is multiplied by how intensely the persona felt it (0.0 = barely, 1.0 = strongly).

```
step contribution = emotion_weight × intensity

Example:
  Frustration (−20) at intensity 0.8 → −16 points of contribution
  Delight (+15) at intensity 0.5    →  +7.5 points of contribution
```

---

## Step 3 — Average contribution maps to 0–100

All step contributions are averaged, then mapped to a 0–100 score:

```
Average contribution = 0    →  score 60  (neutral baseline)
Average contribution = +15  →  score 100 (pure delight)
Average contribution = −20  →  score 0   (pure frustration)
```

The scale is **intentionally asymmetric** — negative experiences hurt more than positive ones help, because that's how real users behave.

---

## Step 4 — Multiple sessions get averaged

If a test run has multiple personas, each gets its own score. The final **UX Health Score** is the average across all personas.

Sessions with no recorded data (e.g. a crash before any action) default to **50** — unknown data is treated as unknown, not perfect.

---

## The Funnel Completion Rate

Separately from the score, Specter tracks what % of personas actually completed their goal:

```
Funnel Rate = (sessions that reached 'complete') / (total sessions) × 100
```

A high score with a low funnel rate often means users *liked* the pages they saw — but couldn't find what they were looking for.

---

## Where to find this in the code

| File | What |
|---|---|
| [`src/lib/utils/scoring.ts`](src/lib/utils/scoring.ts) | Core algorithm: `calculateSessionScore()`, emotion weights, intensity normalization |
| [`src/lib/engine/reporter.ts`](src/lib/engine/reporter.ts) | Aggregates session scores, computes funnel rate, stores report |
