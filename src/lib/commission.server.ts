import "server-only";
import { prisma } from "./prisma.server";
import { Prisma } from "@prisma/client";

/**
 * Calculate commission for an order
 * Returns commission amount and rate
 */
export interface CommissionCalculation {
  amount: number;
  rate: number;
  baseAmount: number;
}

/**
 * Calculate commission for an order
 * @param orderTotal - Total amount of the order
 * @param commissionRate - Commission rate as percentage (e.g., 10.0 for 10%)
 * @returns Commission calculation result
 */
export function calculateCommission(
  orderTotal: number,
  commissionRate: number
): CommissionCalculation {
  if (orderTotal <= 0 || commissionRate <= 0) {
    return {
      amount: 0,
      rate: commissionRate,
      baseAmount: orderTotal,
    };
  }

  const amount = (orderTotal * commissionRate) / 100;

  return {
    amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
    rate: commissionRate,
    baseAmount: orderTotal,
  };
}

/**
 * Create commission record for an order
 * Called when order status changes to SERVED
 */
export async function createOrderCommission(
  orderId: string,
  restaurantId: string,
  partnerId: string,
  orderTotal: number,
  commissionRate: number
): Promise<{
  success: boolean;
  commissionId?: string;
  error?: string;
}> {
  try {
    // Check if commission already exists for this order
    const existing = await prisma.commission.findFirst({
      where: {
        orderId,
        partnerId,
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Commission already exists for this order",
      };
    }

    // Calculate commission
    const calculation = calculateCommission(orderTotal, commissionRate);

    // Get restaurant owner for userId reference
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });

    // Create commission record
    const commission = await prisma.commission.create({
      data: {
        partnerId,
        orderId,
        restaurantId,
        userId: restaurant?.ownerId || null,
        amount: calculation.amount,
        rate: calculation.rate,
        baseAmount: calculation.baseAmount,
        status: "CALCULATED",
        description: `Commission for order ${orderId.slice(-8)}`,
      },
    });

    // Link commission to order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        commissionId: commission.id,
      },
    });

    return {
      success: true,
      commissionId: commission.id,
    };
  } catch (error) {
    console.error("Error creating order commission:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Commission record already exists",
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create commission",
    };
  }
}

/**
 * Auto-calculate and create commission when order is SERVED
 * This function checks if order has a partner and calculates commission
 */
export async function processOrderCommission(orderId: string): Promise<{
  success: boolean;
  commissionId?: string;
  error?: string;
}> {
  try {
    // Load order with restaurant and partner
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: {
            partner: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    // Check if order has partner
    if (!order.restaurant.partnerId || !order.restaurant.partner) {
      // No partner, no commission
      return {
        success: true, // Not an error, just no commission to calculate
      };
    }

    // Check if commission already exists
    if (order.commissionId) {
      return {
        success: true, // Commission already processed
        commissionId: order.commissionId,
      };
    }

    // Get commission rate from partner
    const commissionRate = order.restaurant.partner.commissionRate || 10.0;

    // Create commission
    return await createOrderCommission(
      order.id,
      order.restaurantId,
      order.restaurant.partnerId,
      order.total,
      commissionRate
    );
  } catch (error) {
    console.error("Error processing order commission:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process commission",
    };
  }
}
