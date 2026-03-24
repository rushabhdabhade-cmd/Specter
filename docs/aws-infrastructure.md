# AWS Infrastructure Plan

Migration from Railway + Browserless to AWS ECS Fargate in **ap-south-1 (Mumbai)**.
Single container, small-launch configuration — no Redis, no worker separation.

---

## Current Stack

| Component | Current | Target |
|---|---|---|
| Next.js App | Railway (Docker) | AWS ECS Fargate |
| Browser Automation | Browserless (separate service) | Playwright + Chromium in-container |
| Database | Supabase (external) | Supabase (unchanged) |
| Auth | Clerk (external) | Clerk (unchanged) |
| Billing | Stripe (external) | Stripe (unchanged) |

---

## How It Works Without Browserless

`browser.ts` already has a `LOCAL` mode. When `BROWSERLESS_WS_URL` is unset, Stagehand launches Playwright's bundled Chromium directly in-process — no external browser service needed.

```
browser.ts init():
  BROWSERLESS_WS_URL set?  → remote WebSocket (old Railway mode)
  USE_BROWSERBASE=true?    → Browserbase cloud
  neither                  → LOCAL: Playwright Chromium in-process ✓
```

The orchestrator is called directly from Server Actions — no queue or worker process needed.

---

## Architecture

```
Internet → Route 53 → ALB → ECS: Next.js + Chromium (public subnet)
                               ↕
                             S3 (screenshots)
```

Single ECS service. Chromium runs in-process alongside Next.js. No Redis, no BullMQ, no worker separation.

### Security Groups

| SG | Inbound | Outbound |
|---|---|---|
| `sg-alb` | 443/80 from 0.0.0.0/0 | All to `sg-web` |
| `sg-web` | 3000 from `sg-alb` only | All to internet |

---

## VPC Layout

```
VPC: 10.0.0.0/16 (ap-south-1)
└── Public Subnets (1a, 1b) → ALB + ECS tasks
```

ECS tasks in public subnets — direct outbound internet, no NAT Gateway needed.

---

## ECS Service Sizing

| Service | vCPU | Memory | Min Tasks | Max Tasks | Mode |
|---|---|---|---|---|---|
| `specter-web` (Next.js + Chromium) | 1 | 3 GB | 1 | 4 | On-demand |

- 3 GB memory: Chromium needs headroom. Drop to 2 GB only if confirmed stable under load.
- Min 1 task is fine for a small launch. Bump to 2 when you go public.
- Auto-scale trigger: CPU > 70%

---

## Dockerfile

```dockerfile
FROM node:20-slim

# Chromium system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

RUN npx playwright install chromium

COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN pnpm build
ENV NODE_ENV=production

EXPOSE 3000
CMD ["pnpm", "start", "--", "-p", "3000"]
```

---

## Environment Variables

### Remove
```
BROWSERLESS_WS_URL
USE_BROWSERBASE
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID
S3_ENDPOINT               # R2-only; not needed for native AWS S3
REDIS_URL                 # No Redis in this config
```

### Unchanged
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ENCRYPTION_KEY
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET_NAME
S3_REGION=ap-south-1
```

All secrets in **AWS Secrets Manager**.

---

## Supporting AWS Services

| Service | Config | Notes |
|---|---|---|
| **ECR** | 1 repo: `specter-web` | |
| **ALB** | 1 ALB, SSL via ACM | |
| **S3** | `specter-screenshots-ap-south-1` | Presigned URLs — no CloudFront needed |
| **Secrets Manager** | ~14 secrets | |
| **Route 53** | 1 hosted zone | |
| **CloudWatch** | Logs + alarms | |
| **ACM** | Free SSL cert | Auto-renews |

---

## Monthly Cost Estimate

> Prices: ap-south-1, March 2026.

| Component | Config | Monthly |
|---|---|---|
| ECS Fargate | 1 vCPU, 3 GB × avg 1.5 tasks | **~$55** |
| ALB | 1 ALB + LCU | **~$18** |
| S3 | ~50 GB screenshots | **~$3** |
| ECR, Secrets Manager, Route 53, CloudWatch | | **~$12** |
| NAT Gateway | None (public subnets) | **$0** |
| ElastiCache Redis | None | **$0** |
| **Total** | | **~$88/month** |

Single task at minimum: **~$65/month**. Scales to ~$130/month at 3 concurrent tasks.

---

## Code Changes Required

### 1. Add health check endpoint

```ts
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' })
}
```

### 2. Update S3 config

Set `S3_REGION=ap-south-1`, remove `S3_ENDPOINT`.

### 3. Keepalive / reconnect

The keepalive and reconnect logic in `browser.ts` was built for CDP drops over Railway's WebSocket proxy. With Chromium in-process there is no WebSocket to drop. Safe to leave as-is.

---

## Migration Steps

### Phase 1 — Infrastructure (Day 1)
- [ ] Create VPC, public subnets (2 AZs), security groups
- [ ] Create ECR repository (`specter-web`)
- [ ] Create ECS cluster
- [ ] Move all env vars to Secrets Manager
- [ ] Request SSL cert in ACM

### Phase 2 — Container (Day 1–2)
- [ ] Update Dockerfile (Chromium deps + playwright install)
- [ ] Add `/api/health` route
- [ ] Remove `BROWSERLESS_WS_URL`, `S3_ENDPOINT` from env
- [ ] Set `S3_REGION=ap-south-1`
- [ ] Build and push image to ECR
- [ ] Test locally: `docker run` → verify a browser session completes

### Phase 3 — Deploy & Validate (Day 2–3)
- [ ] Create ECS task definition (reference Secrets Manager for all secrets)
- [ ] Deploy ECS service (min 1 task)
- [ ] Attach ALB target group
- [ ] Set Route 53 record → ALB
- [ ] Smoke test: create project → run persona session → verify report generates
- [ ] Verify Supabase Realtime (live session dashboard)
- [ ] Verify Stripe webhook (update endpoint URL in Stripe dashboard)

### Phase 4 — Cutover (Day 3)
- [ ] Lower DNS TTL to 60s
- [ ] Point domain to ALB
- [ ] Watch CloudWatch for errors
- [ ] Set alarms: CPU > 80%, memory > 85%, 5xx > 1%
- [ ] Decommission Railway after 24h stable

---

## Scaling Path (When Needed)

When usage grows beyond a few concurrent sessions:

1. **Increase task size** — bump to 2 vCPU / 4 GB if OOM under load
2. **Add Redis + BullMQ** — decouple browser sessions from the HTTP process
3. **Split into web + worker** — worker runs on Fargate Spot at ~70% discount
4. **Add NAT + private subnets** — if compliance or security requires it

Estimated cost at that point: ~$150–200/month.

---

## IaC

**AWS CDK (TypeScript)** — fits the existing TypeScript codebase, single stack deploy:

```
cdk deploy specter-prod
```

Add under `infra/` in the repo.
