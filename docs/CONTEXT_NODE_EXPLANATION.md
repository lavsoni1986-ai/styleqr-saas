# ContextNode Architecture

## Overview

ContextNode is a context-aware ordering layer that eliminates the need for users to manually input location, service mode, or time information. Context is automatically inferred from QR codes.

## How It Works

### 1. QR Context Capsule

Context is passed via URL parameter in pipe-separated format:
```
/menu?token=xxx&ctx=hotel|room|205|breakfast|in-room
```

Format: `entityType|spaceType|identifier|timeSlot|serviceMode`

### 2. Automatic Derivation

- **Time Slot**: Derived from current time if not in QR
  - 6-11 AM → breakfast
  - 11-15 → lunch
  - 15-22 → dinner

- **Order Type**: Derived from service mode
  - `in-room` → DELIVERY
  - `takeaway` → TAKEAWAY
  - Default → DINE_IN

### 3. Database Model

```prisma
model ContextNode {
  id          String   @id @default(uuid())
  entityType  String   // "hotel" | "restaurant"
  spaceType   String   // "room" | "table" | "zone"
  identifier  String   // e.g. "205", "T3"
  timeSlot    String?  // Optional: "breakfast" | "lunch" | "dinner"
  serviceMode String?  // Optional: "in-room" | "dine-in" | "takeaway"
  createdAt   DateTime @default(now())
  orders      Order[]
}

model Order {
  ...
  contextNodeId String?
  contextNode   ContextNode? @relation(...)
  ...
}
```

### 4. Implementation

- **Menu Page** (`src/app/menu/MenuClient.tsx`): Parses `ctx` param
- **Order Creation** (`src/app/api/orders/route.ts`): Creates/connects ContextNode
- **Kitchen Display** (`src/app/kitchen/KitchenDisplay.tsx`): Shows context prominently

### 5. Backward Compatibility

Orders without context (restaurant mode) work unchanged. `contextNodeId` is nullable.

## Key Principles

- **Zero Questions**: Users never type room/table numbers
- **Context > Configuration**: Situation inferred, not asked
- **Silent Operation**: No confirmations, no explanations
- **Backward Compatible**: Restaurant flow unchanged

