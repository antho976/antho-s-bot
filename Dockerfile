# Host-agnostic image: runs the bot + dashboard monolith (planning/02, planning/07 seam: Dockerized).
# Build on Linux so the libsql native binary matches the runtime.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Fonts for @napi-rs/canvas (skill-tree image, welcome cards). The slim image ships none, so
# canvas text renders blank without this; fontconfig lets "sans-serif" resolve to DejaVu.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core fontconfig \
  && rm -rf /var/lib/apt/lists/*
# Only what `next start` needs at runtime (+ the /drizzle migrations, read from disk on boot).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "start"]
