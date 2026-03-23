FROM node:20-slim

WORKDIR /app

# System deps required by Playwright's bundled Chromium
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Download Playwright's bundled Chromium (used by Stagehand LOCAL init)
RUN pnpm exec playwright install chromium

# Copy full source
COPY . .

# Declare build-time args for NEXT_PUBLIC vars (Railway passes these automatically)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Expose them as ENV so Next.js can bake them into the bundle during build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN pnpm build

ENV NODE_ENV=production

# Railway injects PORT automatically — do not hardcode it
# Next.js reads $PORT and listens on whatever Railway assigns

CMD ["pnpm", "start"]
