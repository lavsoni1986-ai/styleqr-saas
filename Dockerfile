FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
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
# Copy entire standalone directory first, then backup server.js before overwriting
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Backup the generated server.js before we overwrite it with our wrapper
RUN cp server.js server.original.js

# Copy Prisma runtime files (standalone doesn't include generated Prisma Client)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy custom server.js wrapper (overrides generated server.js)
COPY server.js ./server.js

RUN mkdir -p public

EXPOSE 8080

CMD ["node", "server.js"]
