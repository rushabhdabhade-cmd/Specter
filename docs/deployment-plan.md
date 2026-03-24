# AWS Deployment Plan

Full plan for deploying Specter to AWS ECS (ap-south-1), removing Browserbase/Browserless,
and wiring S3 for screenshot storage.

---

## What Changes and Why

| Area | Current | After |
|---|---|---|
| Browser | Browserless WebSocket / Browserbase cloud | Playwright Chromium in-container (LOCAL mode) |
| Screenshots | `public/screenshots/` on local disk | S3 bucket (disk is ephemeral on ECS) |
| Keepalive/reconnect | Needed for Railway WebSocket proxy drops | Remove — no WebSocket, ECS restarts crashed tasks |
| Health check | Missing | `/api/health` — required by ALB |
| Dockerfile | `node:20-slim`, no Chromium | Add Chromium system libs + `playwright install chromium` |
| `browserbase` package | Installed | Remove from `package.json` |
| AWS SDK | Not installed | Add `@aws-sdk/client-s3` |

---

## Phase 1 — Code Changes

### 1. `src/lib/engine/browser.ts` — Strip to LOCAL only

**Remove entirely:**
- Properties: `savedConfig`, `lastKnownUrl`, `keepaliveTimer`, `reconnecting`, `reconnectGeneration` (lines 9-13)
- `isCdpError()` static method (lines 24-36)
- `reconnect()` method (lines 40-70)
- `waitForReconnect()` method (lines 74-80)
- `withReconnect()` method (lines 82-132)
- `startKeepalive()` method (lines 236-256)
- `stopKeepalive()` method (lines 258-263)

**Simplify `init()` (lines 136-201):**

Remove the `useBrowserless` / `useBrowserBase` branching. Replace with:

```typescript
async init(modelName: string = 'google/gemini-2.0-flash', apiKey?: string) {
    const isGemini = modelName.includes('gemini');
    const resolvedApiKey = isGemini
        ? (apiKey || process.env.GEMINI_API_KEY)
        : (apiKey || process.env.OPENAI_API_KEY);

    const stagehandConfig: any = {
        env: 'LOCAL',
        verbose: 0,
        disableAPI: true,
        model: { modelName, apiKey: resolvedApiKey },
        localBrowserLaunchOptions: {
            headless: true,
            viewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
    };

    this.stagehand = new Stagehand(stagehandConfig);
    console.log('Initializing Stagehand...');
    await this.stagehand.init();
    await this.setupPage();
    console.log('Stagehand ready.');
}
```

> `--no-sandbox` and `--disable-dev-shm-usage` are required for Chromium inside Docker containers.

**Simplify `setupPage()` (lines 205-232):**
- Remove `this.startKeepalive()` call (line 231)

**Replace `withReconnect` wrappers:**
- `navigate()` line 298: `await this.withReconnect(() => this.page.goto(...))` → `await this.page.goto(...)`
- `observeFullPage()` line 420: `this.withReconnect(() => this._observeFullPage())` → `this._observeFullPage()`
- `observe()` line 475: unwrap `withReconnect`, call inner body directly
- `perform()` line 502: `this.withReconnect(() => this._perform(action))` → `this._perform(action)`

**Remove lines tracking last URL (no longer needed):**
- `this.lastKnownUrl = url` in `navigate()` (line 305)
- `this.lastKnownUrl = this.page.url()` in `_perform()` (line 568)

**Remove imports:**
- Remove `import { chromium } from 'playwright-core'` (line 3) — Stagehand/Playwright finds its own binary

**`close()` — remove `stopKeepalive()` call (line 639)**

---

### 2. `src/lib/engine/orchestrator.ts` — S3 screenshot storage

Screenshots currently write to `public/screenshots/` on disk. ECS tasks are ephemeral — this will be lost on every restart/scale event.

**Add S3 client at top of file:**

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
```

**Add S3 client to `Orchestrator` class:**

```typescript
private s3 = new S3Client({ region: process.env.S3_REGION || 'ap-south-1' });
```

**Replace `saveScreenshot()` (lines 537-547):**

```typescript
private async saveScreenshot(sessionId: string, step: number, base64: string): Promise<string> {
    try {
        const bucket = process.env.S3_BUCKET_NAME;
        if (!bucket) return '';
        const key = `screenshots/${sessionId}/step_${step}.jpg`;
        await this.s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(base64, 'base64'),
            ContentType: 'image/jpeg',
        }));
        return `https://${bucket}.s3.${process.env.S3_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
    } catch (err: any) {
        console.warn('S3 screenshot upload failed:', err.message);
        return '';
    }
}
```

**Remove `fs` and `path` imports** (no longer used for screenshots — check nothing else uses them first).

---

### 3. Create `src/app/api/health/route.ts`

```typescript
export async function GET() {
    return Response.json({ status: 'ok' });
}
```

ALB health check will `GET /api/health` and expect HTTP 200.

---

### 4. `Dockerfile` — Add Chromium

```dockerfile
FROM node:20-slim

# Chromium system dependencies (required for Playwright in Docker)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Install Playwright's Chromium binary
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

### 5. `package.json` — Swap packages

```bash
pnpm remove browserbase
pnpm add @aws-sdk/client-s3
```

---

### 6. `.env.example` — Clean up

**Remove:**
```
BROWSERLESS_WS_URL
USE_BROWSERBASE
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID
S3_ENDPOINT
REDIS_URL
```

**Add (with values):**
```
S3_REGION=ap-south-1
S3_BUCKET_NAME=specter-screenshots-prod
```

---

## Phase 2 — AWS Infrastructure (CDK)

Create `infra/` directory with a CDK TypeScript stack.

### Setup

```bash
mkdir infra && cd infra
npx cdk init app --language typescript
pnpm add @aws-cdk/aws-ecs-patterns aws-cdk-lib constructs
```

### Stack: `infra/lib/specter-stack.ts`

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class SpecterStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ── VPC (public subnets only — no NAT Gateway cost) ──────────────────────
        const vpc = new ec2.Vpc(this, 'SpecterVpc', {
            maxAzs: 2,
            natGateways: 0,  // $0/month — tasks run in public subnets
            subnetConfiguration: [
                { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }
            ]
        });

        // ── S3 bucket for screenshots ─────────────────────────────────────────────
        const screenshotBucket = new s3.Bucket(this, 'Screenshots', {
            bucketName: 'specter-screenshots-prod',
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [{
                expiration: cdk.Duration.days(90)  // auto-delete old screenshots
            }]
        });

        // ── Secrets (one secret per env var group) ────────────────────────────────
        const appSecrets = secretsmanager.Secret.fromSecretNameV2(
            this, 'AppSecrets', 'specter/prod'
        );

        // ── ECR repository ────────────────────────────────────────────────────────
        const repo = new ecr.Repository(this, 'SpecterRepo', {
            repositoryName: 'specter-web',
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        // ── ECS cluster ───────────────────────────────────────────────────────────
        const cluster = new ecs.Cluster(this, 'SpecterCluster', {
            vpc,
            clusterName: 'specter-prod'
        });

        // ── Task definition ───────────────────────────────────────────────────────
        const taskDef = new ecs.FargateTaskDefinition(this, 'SpecterTask', {
            cpu: 1024,       // 1 vCPU
            memoryLimitMiB: 3072,  // 3 GB (Chromium needs headroom)
        });

        // Grant S3 write access to task role
        screenshotBucket.grantWrite(taskDef.taskRole);

        const container = taskDef.addContainer('specter', {
            image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'specter' }),
            environment: {
                NODE_ENV: 'production',
                S3_REGION: 'ap-south-1',
                S3_BUCKET_NAME: 'specter-screenshots-prod',
            },
            secrets: {
                NEXT_PUBLIC_SUPABASE_URL:        ecs.Secret.fromSecretsManager(appSecrets, 'NEXT_PUBLIC_SUPABASE_URL'),
                NEXT_PUBLIC_SUPABASE_ANON_KEY:   ecs.Secret.fromSecretsManager(appSecrets, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
                SUPABASE_SERVICE_ROLE_KEY:       ecs.Secret.fromSecretsManager(appSecrets, 'SUPABASE_SERVICE_ROLE_KEY'),
                GEMINI_API_KEY:                  ecs.Secret.fromSecretsManager(appSecrets, 'GEMINI_API_KEY'),
                OPENAI_API_KEY:                  ecs.Secret.fromSecretsManager(appSecrets, 'OPENAI_API_KEY'),
                ANTHROPIC_API_KEY:               ecs.Secret.fromSecretsManager(appSecrets, 'ANTHROPIC_API_KEY'),
                ENCRYPTION_KEY:                  ecs.Secret.fromSecretsManager(appSecrets, 'ENCRYPTION_KEY'),
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
                CLERK_SECRET_KEY:                ecs.Secret.fromSecretsManager(appSecrets, 'CLERK_SECRET_KEY'),
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
                STRIPE_SECRET_KEY:               ecs.Secret.fromSecretsManager(appSecrets, 'STRIPE_SECRET_KEY'),
                STRIPE_WEBHOOK_SECRET:           ecs.Secret.fromSecretsManager(appSecrets, 'STRIPE_WEBHOOK_SECRET'),
            },
            portMappings: [{ containerPort: 3000 }],
        });

        // ── ALB + Fargate Service ─────────────────────────────────────────────────
        // Look up existing hosted zone
        const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
            domainName: 'yourdomain.com'  // replace with actual domain
        });

        const certificate = new acm.Certificate(this, 'Cert', {
            domainName: 'app.yourdomain.com',  // replace
            validation: acm.CertificateValidation.fromDns(hostedZone)
        });

        const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'SpecterService', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            publicLoadBalancer: true,
            assignPublicIp: true,     // needed since no NAT
            certificate,
            domainName: 'app.yourdomain.com',  // replace
            domainZone: hostedZone,
            healthCheckGracePeriod: cdk.Duration.seconds(60),
        });

        // Health check path
        service.targetGroup.configureHealthCheck({
            path: '/api/health',
            healthyHttpCodes: '200',
            interval: cdk.Duration.seconds(30),
        });

        // Auto-scaling
        const scaling = service.service.autoScaleTaskCount({ maxCapacity: 4 });
        scaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        // Outputs
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: service.loadBalancer.loadBalancerDnsName
        });
        new cdk.CfnOutput(this, 'ECRRepo', {
            value: repo.repositoryUri
        });
    }
}
```

---

## Phase 3 — Deploy Sequence

### Step 1: Store secrets in AWS Secrets Manager

Create one secret `specter/prod` with all key-value pairs:

```bash
aws secretsmanager create-secret \
  --name specter/prod \
  --region ap-south-1 \
  --secret-string '{
    "NEXT_PUBLIC_SUPABASE_URL": "...",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "...",
    "SUPABASE_SERVICE_ROLE_KEY": "...",
    "GEMINI_API_KEY": "...",
    "OPENAI_API_KEY": "...",
    "ANTHROPIC_API_KEY": "...",
    "ENCRYPTION_KEY": "...",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "...",
    "CLERK_SECRET_KEY": "...",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "...",
    "STRIPE_SECRET_KEY": "...",
    "STRIPE_WEBHOOK_SECRET": "..."
  }'
```

### Step 2: Deploy CDK stack

```bash
cd infra
npx cdk bootstrap aws://ACCOUNT_ID/ap-south-1
npx cdk deploy --region ap-south-1
```

This creates: VPC, S3 bucket, ECS cluster, task definition, ALB, Route 53 record, ACM cert.

### Step 3: Build and push Docker image

```bash
# Get ECR login token
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

# Build with public env vars as build args
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="..." \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..." \
  -t specter-web .

# Tag and push
docker tag specter-web:latest ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/specter-web:latest
docker push ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/specter-web:latest
```

### Step 4: Force ECS to redeploy with new image

```bash
aws ecs update-service \
  --cluster specter-prod \
  --service SpecterService \
  --force-new-deployment \
  --region ap-south-1
```

### Step 5: Verify

```bash
# Watch deployment
aws ecs wait services-stable --cluster specter-prod --services SpecterService --region ap-south-1

# Test health check
curl https://app.yourdomain.com/api/health
# Expected: {"status":"ok"}
```

### Step 6: Update external services

- **Stripe dashboard** → update webhook URL to `https://app.yourdomain.com/api/webhooks/stripe`
- **Clerk dashboard** → update allowed origins/redirect URLs
- **DNS** → lower TTL before cutover, then point to ALB

---

## Phase 4 — Cut over from Railway

```bash
# 1. Lower TTL to 60s (do this 24h before cutover)
# 2. Update DNS to ALB
# 3. Monitor CloudWatch for 24h
# 4. Delete Railway services
```

---

## Testing Checklist (Before Cutover)

- [ ] `curl /api/health` returns 200
- [ ] Sign in with Clerk works
- [ ] Create a project, run a persona session end-to-end
- [ ] Screenshots appear in S3 bucket (`specter-screenshots-prod/screenshots/...`)
- [ ] Report generates successfully
- [ ] Supabase Realtime works (live session log updates in UI)
- [ ] Stripe webhook fires (create a test subscription)
- [ ] ALB logs show no 5xx errors after a full test run

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/lib/engine/browser.ts` | Remove ~110 lines (reconnect, keepalive, Browserbase/Browserless init) |
| `src/lib/engine/orchestrator.ts` | Replace `saveScreenshot()` with S3 upload |
| `src/app/api/health/route.ts` | **New file** — health check endpoint |
| `Dockerfile` | Add Chromium system deps + `playwright install chromium` |
| `package.json` | Remove `browserbase`, add `@aws-sdk/client-s3` |
| `.env.example` | Remove Browserless/Browserbase/Redis vars |
| `infra/lib/specter-stack.ts` | **New file** — CDK stack |
