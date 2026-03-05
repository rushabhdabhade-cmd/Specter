# Specter - Your users, before they exist. — Masterplan

> **Version:** 1.0  
> **Author:** Rushabh 
> **Last Updated:** March 2026  
> **Status:** Blueprint / Pre-Development

---

## 1. App Overview & Objectives

The **Specter** is an AI-powered user testing engine that deploys autonomous synthetic users (AI personas) to interact with real, live web applications — just like real humans would. Founders and product teams submit their web app URL, configure a cohort of AI personas, and receive a comprehensive report detailing where users struggled, dropped off, succeeded, or felt frustrated.

### Core Objective
Democratize user testing for solo founders and early-stage startups by replacing expensive, time-consuming human user research with instant, autonomous AI-driven testing — at a fraction of the cost and time.

### Key Value Proposition
- **Speed:** Minutes instead of weeks
- **Depth:** Emotional + behavioral simulation, not just surveys
- **Accessibility:** No UX research budget required
- **Actionability:** Clear reports with scores, narratives, and visual replays

---

## 2. Target Audience

### Primary (Beachhead Market)
- **Solo founders** building their first web product
- **Early-stage startup teams** (pre-seed to seed) needing fast validation between sprints

### Secondary (Future Expansion)
- Product Managers at growing startups
- UX/design agencies running validation for clients

---

## 3. Core Features & Functionality

### 3.1 Project Setup
- User submits a **live web app URL** to test
- Optional: upload **credentials** (email/password) for apps requiring login
- Optional: specify **which pages/flows to test** (for large apps)

### 3.2 Persona Configuration (Cohort Builder)
Users define their synthetic user army via a UI form:

| Attribute | Options |
|---|---|
| Number of personas | 1–N (capped by plan tier) |
| Geolocation | Country / Region |
| Age range | e.g., 22–35 |
| Technical literacy | Low / Medium / High |
| Domain familiarity | e.g., "Familiar with SaaS tools" |
| Mindset/Prompt | Free text e.g., "Skeptical budget-cutter looking for pricing first" |

### 3.3 Autonomous Exploration Engine (Core Engine)
Each synthetic user:
1. Launches a **headless browser** instance pointed at the submitted URL
2. Takes **visual screenshots** to "see" the app
3. Uses a **multimodal LLM** to interpret the screen through the lens of its persona
4. Makes **autonomous navigation decisions** — clicking, scrolling, form-filling
5. Reacts **emotionally** based on persona (e.g., frustration, confusion, delight)
6. Pursues an implicit **goal** (find value, complete a task) without scripted paths
7. Stops on: session timeout, dead ends, task completion, or page limit reached

### 3.4 Edge Case Handling
| Scenario | Behavior |
|---|---|
| CAPTCHA detected | Skip + report it |
| 2FA required | Prompt user to disable for test accounts |
| SSO-only login | Guide user to create test credentials |
| Headless browser blocked | Report it as a testing limitation |
| Infinite scroll | Persona scrolls for a human-like duration then stops |
| Pop-ups / modals | Persona reacts (frustration if intrusive) + logged |
| File upload flow | Persona skips + reports inability |
| Payment flow | Persona skips or uses demo credentials if provided |
| Language mismatch | Persona reports confusion (e.g., "I'm a Japanese user and can't read this") |
| App goes down mid-test | Partial report generated up to that point |
| Session timeout | Report generated for completed portion |
| Infinite navigation loop | Hard limit on repeated actions per element |
| Dead end page | Persona navigates back or exits gracefully |

### 3.5 Report Generation
Post-run report combining three layers:

#### Layer 1: Visual Replay / Heatmap
- Screenshot-by-screenshot journey per persona
- Heatmap overlay showing where personas clicked, scrolled, hovered
- Drop-off points highlighted visually

#### Layer 2: Per-Persona Written Narrative
- Human-readable story of each persona's experience
- Emotional reactions logged (frustration, confusion, delight, boredom)
- Key decision moments explained ("Persona 3 looked for pricing on the homepage, didn't find it, and exited")

#### Layer 3: Aggregated Scores & Insights
- **Product Opportunity Score** — overall signal of product viability
- **Drop-off funnel** — where personas abandoned the app
- **Confusion hotspots** — UI elements causing repeated hesitation
- **Value clarity score** — did personas understand what the product does?
- **Persona compatibility matrix** — which persona types found the most value

---

## 4. High-Level Technical Stack Recommendations

### 4.1 Frontend
- **Recommended:** Next.js (React)
- Clean, fast, SEO-friendly, great developer experience for solo builder
- Handles both marketing pages and the app dashboard in one codebase

### 4.2 Backend / API
- **Recommended:** Node.js with Express or Next.js API routes
- Consistent language across stack (reduces context switching for solo dev)
- Strong ecosystem for async job processing

### 4.3 Synthetic User Engine
- **Browser Automation:** Playwright (preferred over Puppeteer — better multi-browser support, more human-like interaction APIs)
- **LLM Brain:** Multimodal model (GPT-4o or Claude 3.5 Sonnet) for screenshot interpretation + decision making
- **Persona State:** Each persona maintains a JSON state object (current goal, emotional state, history of actions, frustration level)

### 4.4 Job Queue / Orchestration
- **Recommended:** BullMQ (Redis-backed)
- Each persona deployment is a job in the queue
- Enables parallel execution, retry logic, and progress tracking
- Critical for managing concurrent headless browser instances

### 4.5 Database
- **Recommended:** PostgreSQL (via Supabase for solo-dev speed)
- Stores: users, projects, test runs, persona configs, reports
- Supabase also provides auth out of the box

### 4.6 File / Screenshot Storage
- **Recommended:** Cloudflare R2 or AWS S3
- Screenshots and session recordings stored as objects
- Cheap, scalable, CDN-friendly for report display

### 4.7 Authentication
- **Recommended:** Supabase Auth or Clerk
- Email/password + Google OAuth
- Fast to implement for solo developer

### 4.8 Hosting / Infrastructure
- **Recommended:** Railway or Render for v1 (simpler than AWS for solo dev)
- Easy scaling later to AWS/GCP when needed
- Headless browser workers may need dedicated compute (not serverless)

---

## 5. Conceptual Data Model

```
User
  └── Projects (one per web app being tested)
        └── TestRuns
              ├── PersonaConfigs[]
              └── PersonaSessions[]
                    ├── Screenshots[]
                    ├── ActionLog[]
                    ├── EmotionLog[]
                    └── Report
                          ├── NarrativeSummary
                          ├── HeatmapData
                          └── AggregatedScores
```

### Key Entities
- **User** — account, plan tier, usage limits
- **Project** — the web app being tested (URL, credentials, page scope)
- **TestRun** — one deployment of a persona cohort
- **PersonaConfig** — age, geo, tech level, domain, prompt
- **PersonaSession** — the full recorded journey of one synthetic user
- **Report** — the final output combining all sessions

---

## 6. User Interface Design Principles

### Philosophy
- **Zero learning curve** — a solo founder should get their first test running in under 5 minutes
- **Progressive disclosure** — simple by default, advanced options available but hidden
- **Clarity over cleverness** — reports should be understandable without a UX background

### Key Screens
1. **Dashboard** — active projects, recent test runs, quick-start CTA
2. **New Test Setup** — URL input → credentials (optional) → page scope (optional)
3. **Cohort Builder** — persona configuration cards with add/remove
4. **Running State** — progress indicator showing personas deployed (not real-time v1, but visual feedback)
5. **Report View** — three-panel layout: heatmap | narrative | scores
6. **Settings / Billing** — plan management, usage stats

### Design Tone
Confident, modern, founder-friendly. Think Linear meets Maze.io — clean dark UI, data-forward, no fluff.

---

## 7. Freemium Business Model

| Tier | Personas | Test Runs/month | Report Depth | Price |
|---|---|---|---|---|
| **Free** | Up to 3 | 2 | Basic (scores + narrative) | $0 |
| **Pro** | Up to 15 | Unlimited | Full (heatmap + replay + scores) | ~$49/mo |
| **Team** | Up to 50 | Unlimited | Full + team sharing + priority queue | ~$149/mo |

### Growth Strategy
- Free tier drives viral adoption (founders share reports with co-founders, investors)
- Upgrade trigger: "You've used your 2 free runs this month — upgrade to run again"
- Future: API access for CI/CD integration (test on every deploy)

---

## 8. Security Considerations

- **Credential storage:** User-submitted app credentials must be encrypted at rest (AES-256) and never logged
- **Isolated browser instances:** Each persona runs in a sandboxed container — no cross-contamination between test runs or users
- **Rate limiting:** Prevent abuse of the free tier (test run limits enforced server-side, not just UI)
- **Data retention policy:** Screenshots and session data deleted after X days (configurable, GDPR consideration)
- **No persistent sessions:** Synthetic user credentials are used once per test run and not stored beyond that run
- **HTTPS only:** All communication encrypted in transit

---

## 9. Development Phases & Milestones

### Phase 1 — Core Engine (Weeks 1–6)
**Goal:** One persona can autonomously explore one web app and generate a basic report

- [ ] Set up project infrastructure (Next.js, Supabase, Railway)
- [ ] Build URL submission + basic persona config UI
- [ ] Integrate Playwright for headless browser control
- [ ] Build LLM decision loop (screenshot → interpret → act)
- [ ] Implement persona state machine (goals, emotions, action history)
- [ ] Generate basic text report from session logs

### Phase 2 — Multi-Persona & Reports (Weeks 7–10)
**Goal:** Deploy a cohort of 3–5 personas and generate a full report

- [ ] Implement BullMQ job queue for parallel persona sessions
- [ ] Build screenshot storage pipeline (S3/R2)
- [ ] Build heatmap generation from click/scroll data
- [ ] Build per-persona narrative generator (LLM-powered)
- [ ] Build aggregated scores (Product Opportunity Score algorithm)
- [ ] Build Report View UI (three-panel layout)

### Phase 3 — Auth, Billing & Free Tier (Weeks 11–13)
**Goal:** Strangers can sign up and use the product

- [ ] Implement user auth (Supabase Auth)
- [ ] Implement plan tiers + usage limits
- [ ] Integrate Stripe for Pro/Team billing
- [ ] Polish onboarding flow (under 5 minutes to first test)
- [ ] Handle all edge cases gracefully (error states, blocked browsers, etc.)

### Phase 4 — Hardening & Launch (Weeks 14–16)
**Goal:** Public launch on Product Hunt / Hacker News

- [ ] Load testing (concurrent persona sessions)
- [ ] Security audit (credential handling, sandboxing)
- [ ] Marketing site (home, pricing, example report)
- [ ] User feedback loop (post-report survey)
- [ ] Analytics (Posthog or Mixpanel for product metrics)

---

## 10. Potential Challenges & Solutions

| Challenge | Mitigation |
|---|---|
| Headless browser detection by target apps | Use stealth plugins (playwright-extra), rotate user agents, human-like timing |
| LLM hallucinating actions | Validate all actions against actual DOM before executing; fallback to safe navigation |
| High compute cost per test run | Cap session length + page visits; optimize screenshot frequency |
| Persona behavior feeling repetitive/scripted | Inject randomness in timing, scroll depth, reading speed based on persona attributes |
| Scaling concurrent browser instances | Use containerized workers (Docker); auto-scale based on queue depth |
| Keeping reports meaningful (not just noise) | Fine-tune LLM prompts with real user testing data over time |
| CAPTCHA on target apps | Clear documentation for users + graceful skip-and-report |

---

## 11. Future Expansion Possibilities

- **Real-time reporting** — watch personas explore live (v2)
- **API access** — integrate into CI/CD pipelines ("test on every deploy")
- **Mobile app testing** — extend to React Native or PWA testing
- **Competitor benchmarking** — run same persona cohort against your app AND a competitor's
- **Persona marketplace** — pre-built persona templates for common SaaS audiences
- **Integrations** — Slack/email report delivery, Notion export, Linear issue creation from report findings
- **Video replay** — full session recording per persona (not just screenshots)
- **Regression testing** — run same cohort after each product update and compare scores over time

---

## 12. Key Risks & Honest Considerations

- **Legal:** Automated testing of third-party apps could violate their ToS. Consider adding a ToS acknowledgment that users confirm they own/have rights to test the submitted URL.
- **LLM costs:** Running multimodal LLM inference per screenshot per persona can get expensive quickly. Cost controls and session limits are essential from day one.
- **Quality of insights:** The 85-92% parity claim with real human insights is a strong marketing claim — back it up with validation studies early.
- **Solo dev complexity:** This is an ambitious system. Ruthlessly prioritize Phase 1 before touching Phase 2. A working single-persona demo is infinitely more valuable than a half-built multi-persona system.

---

*This document is a living blueprint. It should be updated as the product evolves, assumptions are validated, and new insights emerge.*
