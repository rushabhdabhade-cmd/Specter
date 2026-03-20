# Microsoft's official Playwright image — Node.js + Chromium + all system deps pre-installed
FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Build Next.js (output: standalone)
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["pnpm", "start"]
