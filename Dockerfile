# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma (does NOT need DB)
RUN npx prisma generate

# 🔥 Skip env validation during build
ENV SKIP_ENV_VALIDATION=true

RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
