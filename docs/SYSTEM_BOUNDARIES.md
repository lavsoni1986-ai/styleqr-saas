# System Boundaries

## What StyleQR Is

- **Restaurant QR Ordering System**: Customers scan QR codes to view menus and place orders
- **Context-Native Platform**: Automatically infers location, service mode, and time from QR
- **Kitchen Display System**: Real-time order management for kitchen staff
- **Multi-Tenant SaaS**: Supports restaurants, districts, partners, and white-label deployments
- **Production-Ready**: Full authentication, payments, billing, and reporting

## What StyleQR Is Not

- **Not a POS System**: Does not handle cash register operations
- **Not a Delivery Platform**: Does not manage delivery drivers or routes
- **Not a Reservation System**: Does not handle table reservations
- **Not a Loyalty Program**: Does not track customer points or rewards
- **Not a Marketing Platform**: No email campaigns or promotions
- **Not a Analytics Platform**: Basic reporting only, no advanced analytics

## Core Features

### Included
- QR code generation and scanning
- Menu management
- Order placement and tracking
- Kitchen order display
- Payment processing (Stripe, Razorpay)
- Billing and invoicing
- Multi-tenant architecture
- ContextNode (hotel/restaurant context)

### Not Included
- Mobile apps (web-only)
- Real-time chat
- Customer reviews
- Inventory management
- Staff scheduling
- Advanced analytics
- Marketing tools

## Technical Boundaries

- **Frontend**: Next.js 16 App Router (React 19)
- **Backend**: Next.js API Routes (same process)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: NextAuth.js (JWT)
- **Deployment**: Standalone Next.js output (Docker-ready)

## Data Model Scope

- Users (restaurant owners, partners, admins)
- Restaurants (multi-tenant)
- Menu items and categories
- Orders and order items
- Tables and QR codes
- Bills and payments
- ContextNode (context-aware ordering)
- Commissions and settlements

