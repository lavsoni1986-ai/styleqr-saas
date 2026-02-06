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

# Copy Next.js standalone output (includes minimal node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma runtime files (standalone doesn't include generated Prisma Client)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p public

EXPOSE 3000

CMD ["node", "server.js"]
