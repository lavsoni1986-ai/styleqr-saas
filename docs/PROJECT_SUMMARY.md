# StyleQR SaaS - Project Summary

## Purpose

StyleQR is a production-ready, context-native restaurant ordering system that enables zero-question ordering through QR codes. The system automatically infers location, service mode, and time context without asking users.

## Technology Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Runtime**: Node.js 20+
- **Database**: PostgreSQL
- **ORM**: Prisma 6.19.1
- **Authentication**: NextAuth.js 5.0
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript 5.9

## Key Innovation: ContextNode

ContextNode is a world-first context-aware ordering layer that:
- Eliminates manual room/table input
- Derives service mode and time slot automatically
- Works seamlessly with existing restaurant flow
- Enables hotel room service scenarios

## Architecture Pattern

- **Monolithic Full-Stack**: Next.js handles both frontend and backend
- **API Routes**: RESTful endpoints in `src/app/api/`
- **Server Components**: Default rendering strategy
- **Client Components**: Used only when needed (interactivity)
- **Prisma Client**: Singleton pattern with connection pooling

## Core User Flows

1. **Restaurant Owner**: Signup → Dashboard → Manage menu → Generate QR codes
2. **Customer**: Scan QR → View menu → Add items → Send to kitchen
3. **Kitchen Staff**: View orders → Update status → Mark ready

## Database Schema Highlights

- **ContextNode**: Context-aware ordering (hotel/restaurant)
- **Order**: Links to ContextNode (nullable for backward compatibility)
- **Restaurant**: Multi-tenant root entity
- **Table**: QR token mapping
- **Bill**: Payment and invoicing
- **Commission**: Partner/district revenue sharing

## Production Readiness

- ✅ Environment variable validation
- ✅ Production-safe error handling
- ✅ Minimal logging (no stack traces in prod)
- ✅ Graceful shutdown handlers
- ✅ Connection pool management
- ✅ Security headers
- ✅ Performance optimizations

## File Organization

```
src/
  app/              # Pages and API routes
  components/       # React components
  lib/             # Utilities and services
prisma/
  schema.prisma    # Database schema
  migrations/      # Migration history
```

## Running the System

See `README.md` for setup instructions.

## ContextNode Implementation

See `docs/CONTEXT_NODE_EXPLANATION.md` for technical details.

