# StyleQR SaaS

A production-ready, context-native restaurant ordering system built with Next.js, Prisma, and PostgreSQL.

## Architecture

- **Frontend/Backend**: Next.js 16 (App Router) - Full-stack monolith
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (JWT-based)
- **Key Feature**: ContextNode - Zero-question, context-aware ordering

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and NEXTAUTH_SECRET
   ```

3. **Set up database**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Access application**:
   - Frontend: http://localhost:3000
   - Signup: http://localhost:3000/signup
   - Dashboard: http://localhost:3000/dashboard

## ContextNode Architecture

ContextNode enables zero-question ordering by automatically inferring:
- Location (room/table/zone)
- Service mode (in-room/dine-in/takeaway)
- Time slot (breakfast/lunch/dinner)

Context is passed via QR URL: `/menu?token=xxx&ctx=hotel|room|205|breakfast|in-room`

See `docs/CONTEXT_NODE_EXPLANATION.md` for details.

## Project Structure

```
src/
  app/          # Next.js App Router pages and API routes
  components/   # React components
  lib/          # Shared utilities and services
prisma/
  schema.prisma # Database schema (includes ContextNode)
```

## Production Build

```bash
npm run build
npm start
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for JWT signing
- `NEXTAUTH_URL` - Application URL

Optional:
- `NODE_ENV` - Environment (development/production)
- `PRISMA_QUERY_LOG` - Enable Prisma query logging (true/false)

