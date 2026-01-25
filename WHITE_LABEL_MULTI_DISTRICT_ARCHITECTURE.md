# White-Label Multi-District SaaS Architecture

## 🎯 Overview

This document outlines the transformation of StyleQR into a white-label multi-district SaaS platform with:
- **District-based tenant isolation**
- **Partner/reseller system**
- **Subdomain routing**
- **Commission tracking**
- **Subscription & billing**
- **Multi-level admin panels**

---

## 📊 Database Schema Enhancements

### New Models

1. **District** - Geographic regions (e.g., Delhi, Mumbai)
2. **Partner** - White-label resellers in districts
3. **Subscription** - Restaurant billing & plans
4. **Commission** - Partner revenue tracking

### Enhanced Models

1. **User** - Added `districtId`, `partnerId` fields
2. **WhiteLabel** - Added `subdomain`, `districtId`, `partnerId`, `primaryColor`, `secondaryColor`
3. **Restaurant** - Added `partnerId`, `districtId`, `subscriptionId`

### Role System

**Updated Role Enum:**
```prisma
enum Role {
  SUPER_ADMIN      // Platform owner
  DISTRICT_ADMIN   // District manager
  PARTNER          // White-label partner/reseller
  RESTAURANT_OWNER // Restaurant owner
}
```

**Migration Path:**
- `WHITE_LABEL_ADMIN` → `PARTNER` (backward compatible)
- New `DISTRICT_ADMIN` role for district management

---

## 🏗️ Architecture Layers

### Layer 1: Platform (Super Admin)
- Manage districts
- Manage district admins
- Platform-wide analytics
- System configuration

### Layer 2: District (District Admin)
- Manage partners in district
- Manage white-labels in district
- District analytics
- Commission oversight

### Layer 3: Partner (Partner)
- Manage restaurants
- White-label branding
- Commission tracking
- Partner dashboard

### Layer 4: Restaurant (Restaurant Owner)
- Menu management
- Orders
- QR codes
- Subscription management

---

## 🌐 Subdomain Routing

### Domain Structure
```
platform.com              → Super Admin Dashboard
delhi.platform.com        → Delhi District
mumbai.platform.com       → Mumbai District
partner.delhi.platform.com → Partner Dashboard
restaurant.platform.com   → Restaurant Dashboard (via login)
```

### Routing Logic
1. Extract subdomain from `Host` header
2. Query database for matching District/WhiteLabel
3. Load district-specific branding
4. Route to appropriate dashboard/UI

---

## 💰 Commission Engine

### Commission Types

1. **Order-Based Commission**
   - Calculated per order
   - Partner earns % of order total
   - Status: PENDING → CALCULATED → PAID

2. **Subscription Commission**
   - Partner earns % of monthly subscription
   - Recurring monthly
   - Tracks period start/end

### Commission Flow
```
Order Placed → Calculate Commission → Store in Commission table
                ↓
            Monthly Payout → Update Status to PAID
```

---

## 💳 Subscription System

### Plans

**BASIC**
- 1 restaurant
- Basic features
- $29/month

**PRO**
- Up to 5 restaurants
- Advanced features
- $99/month

**ENTERPRISE**
- Unlimited restaurants
- All features + priority support
- Custom pricing

### Subscription Flow
```
Trial (14 days) → Active → Suspended (if unpaid) → Cancelled
```

---

## 🔐 Multi-Tenant Isolation

### Tenant Hierarchy
```
Platform
  ├── District (Delhi)
  │     ├── Partner (Partner A)
  │     │     ├── Restaurant 1
  │     │     └── Restaurant 2
  │     └── Partner (Partner B)
  │           └── Restaurant 3
  └── District (Mumbai)
        └── Partner (Partner C)
              └── Restaurant 4
```

### Data Isolation Rules
- **Super Admin**: Can see all data
- **District Admin**: Can see only their district data
- **Partner**: Can see only their restaurants
- **Restaurant**: Can see only their own data

---

## 📁 File Structure

```
prisma/
  └── schema.prisma (enhanced with districts)
src/
  ├── lib/
  │   ├── district.ts (district utilities)
  │   ├── commission.ts (commission engine)
  │   ├── subscription.ts (subscription management)
  │   └── subdomain.ts (subdomain routing)
  ├── app/
  │   ├── platform/ (Super Admin)
  │   ├── district/ (District Admin)
  │   ├── partner/ (Partner - already exists)
  │   └── dashboard/ (Restaurant)
  └── middleware.ts (enhanced with subdomain detection)
```

---

## 🚀 Implementation Phases

### Phase 1: Database Schema ✅
- Create migration for new models
- Update Role enum
- Add indexes

### Phase 2: Multi-Tenant Middleware
- Subdomain detection
- District/Partner routing
- Branding context injection

### Phase 3: Commission Engine
- Order commission calculation
- Subscription commission
- Partner payout tracking

### Phase 4: Subscription System
- Plan management
- Billing cycles
- Feature gating

### Phase 5: Admin Panels
- Super Admin dashboard
- District Admin dashboard
- Enhanced Partner dashboard

---

## 🔒 Security & Access Control

### Authentication Flow
1. User logs in → Role determined
2. District/Partner context loaded
3. Access scoped to tenant level
4. API routes enforce tenant isolation

### API Route Protection
```typescript
// Super Admin only
requireSuperAdmin()

// District Admin only
requireDistrictAdmin()

// Partner only
requirePartner()

// Restaurant Owner only
requireRestaurantOwner()
```

---

## 📊 Revenue Tracking

### Partner Commissions
- Real-time commission calculation
- Monthly commission reports
- Payout tracking
- Historical commission data

### Platform Revenue
- Total subscriptions
- District-wise revenue
- Partner-wise revenue
- Commission payouts

---

## ✅ Next Steps

1. **Review schema migration** - Ensure compatibility
2. **Run migration** - `npx prisma migrate dev --name add_multi_district`
3. **Update middleware** - Add subdomain routing
4. **Build commission engine** - Calculate commissions
5. **Build subscription system** - Manage plans
6. **Create admin panels** - Super/District/Partner dashboards

---

**Last Updated:** 2025-01-09  
**Status:** 📋 **ARCHITECTURE PLANNED**
