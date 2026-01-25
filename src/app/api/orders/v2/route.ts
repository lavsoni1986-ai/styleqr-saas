import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { withApiAuth } from "@/lib/api-guard";
import { assertRestaurantOwner } from "@/lib/tenant";
import { orderCreateSchema, validateBodySafe } from "@/lib/validators";
import {
  created,
  ok,
  badRequest,
  notFound,
  conflict,
  withErrorHandler,
} from "@/lib/api-response";
import { Prisma, OrderStatus } from "@prisma/client";

/**
 * Orders API v2 - Transactional & Idempotent
 * 
 * Endpoints:
 * - POST /api/orders/v2 - Create order (transactional, idempotent)
 * - GET /api/orders/v2 - List orders for restaurant
 * 
 * Security:
 * - Requires authentication
 * - Validates restaurant ownership
 * - Uses serializable transaction isolation
 * - Prevents duplicate orders (idempotency)
 * - Handles race conditions
 */

export const dynamic = "force-dynamic";

/**
 * Idempotency key storage (in-memory for now, can be moved to Redis/DB)
 * In production, use Redis or a database table for distributed systems
 */
const idempotencyStore = new Map<
  string,
  { orderId: string; createdAt: number }
>();

// Clean up old idempotency keys (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, value] of idempotencyStore.entries()) {
    if (value.createdAt < oneHourAgo) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

/**
 * POST /api/orders/v2
 * Create a new order with transaction safety and idempotency
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const validation = validateBodySafe(orderCreateSchema, body);
  if (!validation.success) {
    return badRequest(
      "Validation failed",
      validation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
    );
  }

  const {
    restaurantId,
    tableId,
    type,
    items,
    notes,
    isPriority,
    idempotencyKey,
  } = validation.data;

  // Enforce tenant isolation - verify restaurant ownership
  await assertRestaurantOwner(user.id, restaurantId);

  // Check idempotency key (prevent duplicate order submission)
  const idempotencyKeyWithUser = `${user.id}:${idempotencyKey}`;
  const existingOrder = idempotencyStore.get(idempotencyKeyWithUser);
  
  if (existingOrder) {
    // Return the existing order (idempotent response)
    const order = await prisma.order.findUnique({
      where: { id: existingOrder.orderId },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (order) {
      return ok(order, "Order already exists (idempotent)");
    }
  }

  // Verify restaurant exists
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    return notFound("Restaurant not found");
  }

  // Verify table exists and belongs to restaurant (if provided)
  if (tableId) {
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId,
      },
    });

    if (!table) {
      return notFound("Table not found or does not belong to this restaurant");
    }
  }

  // Get menu items snapshot (for price validation and calculation)
  const menuItemIds = items.map((item) => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      category: {
        restaurantId, // Ensure items belong to restaurant
      },
      available: true, // Only available items
    },
    select: {
      id: true,
      name: true,
      price: true,
      categoryId: true,
    },
  });

  // Validate all menu items exist and are available
  if (menuItems.length !== menuItemIds.length) {
    const foundIds = new Set(menuItems.map((item) => item.id));
    const missingIds = menuItemIds.filter((id) => !foundIds.has(id));
    return badRequest(
      `Menu items not found or unavailable: ${missingIds.join(", ")}`
    );
  }

  // Calculate total
  const total = items.reduce((sum, item) => {
    const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
    return sum + (menuItem?.price || 0) * item.quantity;
  }, 0);

  // Create order in transaction with serializable isolation level
  // This prevents race conditions and ensures data consistency
  let order;
  try {
    order = await prisma.$transaction(
      async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            restaurantId,
            tableId: tableId || null,
            type,
            total,
            isPriority,
            items: {
              create: items.map((item) => {
                const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
                return {
                  menuItemId: item.menuItemId,
                  quantity: item.quantity,
                  price: menuItem?.price || 0,
                };
              }),
            },
            ...(notes && {
              notes: {
                create: {
                  content: notes,
                },
              },
            }),
          },
          include: {
            items: {
              include: {
                menuItem: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
            restaurant: {
              select: {
                id: true,
                name: true,
              },
            },
            table: tableId
              ? {
                  select: {
                    id: true,
                    name: true,
                  },
                }
              : undefined,
          },
        });

        // Store idempotency key
        idempotencyStore.set(idempotencyKeyWithUser, {
          orderId: newOrder.id,
          createdAt: Date.now(),
        });

        return newOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // Wait up to 5 seconds for transaction
        timeout: 10000, // Transaction timeout after 10 seconds
      }
    );
  } catch (error) {
    // Handle transaction conflicts (race conditions)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      // Transaction conflict - retry once or return conflict
      return conflict(
        "Transaction conflict. Please retry with the same idempotency key."
      );
    }

    // Re-throw to be handled by error handler
    throw error;
  }

  return created(order, "Order created successfully");
});

/**
 * GET /api/orders/v2
 * List orders for a restaurant (tenant-isolated)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  const status = searchParams.get("status");

  if (!restaurantId) {
    return badRequest("restaurantId query parameter is required");
  }

  // Enforce tenant isolation - verify restaurant ownership
  await assertRestaurantOwner(user.id, restaurantId);

  // Build query
  const where: {
    restaurantId: string;
    status?: OrderStatus;
  } = {
    restaurantId,
  };

  if (status) {
    // Validate status against OrderStatus enum
    const validStatuses = Object.values(OrderStatus);
    if (validStatuses.includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    } else {
      return badRequest(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
  }

  // Fetch orders
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
      table: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to 100 orders
  });

  return ok(orders, "Orders retrieved successfully");
});

