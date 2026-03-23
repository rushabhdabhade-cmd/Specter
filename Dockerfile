# Lightweight Node.js image — no local Chromium needed (BrowserBase handles browser on Railway)
FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

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
