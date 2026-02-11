FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .

# ---- TEMP BUILD ENVS ----
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXTAUTH_SECRET="build-secret"
ENV JWT_SECRET="build-secret"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV SKIP_ENV_VALIDATION="true"

RUN npx prisma generate
RUN npm run build

# ================= RUNNER =================

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
# Unset SKIP_ENV_VALIDATION to ensure runtime validation (Railway will inject real env vars)
ENV SKIP_ENV_VALIDATION=""

# Copy Next.js standalone output (includes minimal node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Backup the generated server.js before we overwrite it with our wrapper
RUN cp server.js server.original.js

# Temporary fix: Copy full node_modules to resolve Prisma v6 CLI deps (effect, @prisma/config, etc.)
# Overwrites standalone's minimal node_modules to ensure migrations work
COPY --from=builder /app/node_modules ./node_modules

# Copy custom server.js wrapper (overrides generated server.js)
COPY server.js ./server.js

# Copy Prisma schema and migrations for runtime migrate deploy
COPY prisma ./prisma

# Copy rollback script
COPY scripts ./scripts

RUN mkdir -p public

EXPOSE 8080

# Run migrations on startup, then start server (migrate deploy is idempotent)
CMD ["node", "scripts/rollback.js"]
