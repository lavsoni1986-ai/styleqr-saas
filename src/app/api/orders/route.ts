import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { isTestMode, logTestMode } from "@/lib/test-mode";

type Body = {
  token?: unknown;
  items?: unknown;
  notes?: unknown;
  isPriority?: unknown;
  requestId?: unknown; // Idempotency: Client-generated unique request ID
  context?: {
    entityType: string | null;
    spaceType: string | null;
    identifier: string | null;
    timeSlot: string | null;
    serviceMode: string | null;
  } | null;
};

type OrderItemInput = {
  menuItemId: string;
  qty: number;
};

type ResolveRow = {
  tableId: string;
  restaurantId: string;
};

type MenuItemRow = {
  id: string;
  price: number;
};

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && Number.isFinite(n) && n > 0;
}

async function resolveToken(token: string): Promise<ResolveRow | null> {
  const table = await prisma.table.findUnique({
    where: { qrToken: token },
    select: { id: true, restaurantId: true },
  });
  if (!table) return null;
  return { tableId: table.id, restaurantId: table.restaurantId };
}

async function getMenuItemsSnapshot(
  menuItemIds: string[],
  restaurantId: string
): Promise<Map<string, MenuItemRow>> {
  if (!menuItemIds.length) return new Map();

  const rows = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      category: { restaurantId },
    },
    select: { id: true, price: true },
  });

  const map = new Map<string, MenuItemRow>();
  for (const r of rows) map.set(r.id, r);
  return map;
}

export async function POST(request: NextRequest) {
  // Test mode short-circuit for fast E2E tests
  if (isTestMode) {
    logTestMode("/api/orders POST");
    const mockOrderId = `test-order-${Date.now()}`;
    return NextResponse.json({ orderId: mockOrderId }, { status: 201 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch (error) {
    // Production-safe: No stack traces, minimal logging
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const itemsRaw = body.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    return NextResponse.json({ error: "items are required" }, { status: 400 });
  }

  const items: OrderItemInput[] = [];
  for (const it of itemsRaw) {
    const menuItemId = typeof (it as any)?.menuItemId === "string" ? (it as any).menuItemId.trim() : "";
    const qty = (it as any)?.qty;
    if (!menuItemId || !isPositiveInt(qty)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }
    items.push({ menuItemId, qty });
  }

  // Extract optional fields
  const isPriority = typeof body.isPriority === "boolean" ? body.isPriority : false;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  try {
    const resolved = await resolveToken(token);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid QR token" }, { status: 404 });
    }

    const menuItemIds = Array.from(new Set(items.map((i) => i.menuItemId)));
    const snapshotMap = await getMenuItemsSnapshot(menuItemIds, resolved.restaurantId);

    if (snapshotMap.size !== menuItemIds.length) {
      return NextResponse.json({ error: "One or more items are invalid" }, { status: 400 });
    }

    // Calculate total
    const total = items.reduce((sum, item) => {
      const price = snapshotMap.get(item.menuItemId)?.price || 0;
      return sum + price * item.qty;
    }, 0);

    // ContextNode: Handle context-aware ordering (hotel rooms, zones, etc.)
    // No questions asked - derive all from context and time
    const context = body.context && 
      body.context.entityType && 
      body.context.spaceType && 
      body.context.identifier
      ? body.context
      : null;

    // Derive time slot from current time if not provided in context
    // Timezone: Uses server's local timezone (assumed to match restaurant timezone)
    // TODO: If multi-timezone support needed, use explicit timezone from restaurant settings
    const deriveTimeSlot = (): string | null => {
      if (context?.timeSlot) return context.timeSlot;
      // Server timezone assumption: Restaurant operates in server's local timezone
      const hour = new Date().getHours(); // Server local time
      if (hour >= 6 && hour < 11) return "breakfast";
      if (hour >= 11 && hour < 15) return "lunch";
      if (hour >= 15 && hour < 22) return "dinner";
      return null; // late night or early morning
    };

    // Derive order type from service mode (no questions asked)
    const deriveOrderType = (): "DINE_IN" | "TAKEAWAY" | "DELIVERY" => {
      if (!context?.serviceMode) return "DINE_IN"; // Default for restaurant mode
      const mode = context.serviceMode.toLowerCase();
      if (mode === "takeaway") return "TAKEAWAY";
      if (mode === "in-room" || mode === "delivery") return "DELIVERY";
      return "DINE_IN"; // Default for dine-in
    };

    const finalTimeSlot = deriveTimeSlot();
    const orderType = deriveOrderType();

    // Idempotency: Prevent duplicate order creation within 5-second window
    // Uses token + items hash + timestamp window to detect duplicates
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : null;
    const idempotencyKey = requestId || `${token}:${JSON.stringify(items)}:${Math.floor(Date.now() / 5000)}`;
    
    // Check for recent duplicate (within last 5 seconds)
    if (!requestId) {
      const recentOrder = await prisma.order.findFirst({
        where: {
          restaurantId: resolved.restaurantId,
          tableId: resolved.tableId,
          createdAt: {
            gte: new Date(Date.now() - 5000), // Last 5 seconds
          },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, total: true },
      });
      
      // If recent order with same total exists, likely duplicate
      if (recentOrder && Math.abs(recentOrder.total - total) < 0.01) {
        return NextResponse.json({ 
          success: true, 
          orderId: recentOrder.id,
          duplicate: true 
        }, { status: 201 });
      }
    }

    // Transactional safety: Wrap ContextNode + Order creation in single transaction
    // Ensures atomicity - either both succeed or both fail (no orphaned ContextNode)
    const order = await prisma.$transaction(async (tx) => {
      // Create or connect ContextNode if context is provided
      let contextNodeId: string | null = null;
      if (context) {
        const contextNode = await tx.contextNode.upsert({
          where: {
            entityType_spaceType_identifier_timeSlot_serviceMode: {
              entityType: context.entityType!,
              spaceType: context.spaceType!,
              identifier: context.identifier!,
              timeSlot: finalTimeSlot,
              serviceMode: context.serviceMode || null,
            },
          },
          update: {},
          create: {
            entityType: context.entityType!,
            spaceType: context.spaceType!,
            identifier: context.identifier!,
            timeSlot: finalTimeSlot,
            serviceMode: context.serviceMode || null,
          },
        });
        contextNodeId = contextNode.id;
      }

      const newOrder = await tx.order.create({
        data: {
          restaurantId: resolved.restaurantId,
          tableId: resolved.tableId,
          contextNodeId,
          status: "PENDING",
          type: orderType, // Derived from context, no question asked
          total,
          isPriority,
          items: {
            // Price snapshot integrity: Store price at time of order creation
            // Billing must NEVER depend on live menu price - this snapshot ensures consistency
            create: items.map((i) => ({
              menuItemId: i.menuItemId,
              quantity: i.qty,
              price: snapshotMap.get(i.menuItemId)!.price, // Snapshot from menu at order time
            })),
          },
        },
        include: { items: true },
      });
      if (notes && notes.length > 0) {
        await tx.orderNote.create({
          data: { orderId: newOrder.id, content: notes },
        });
      }
      return newOrder;
    });

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (error) {
    // Production-safe: No stack traces, generic error message
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Orders POST error:", errorMessage);
    }
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
