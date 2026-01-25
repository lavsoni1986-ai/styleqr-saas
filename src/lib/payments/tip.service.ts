/**
 * Tip & Gratuity Service
 * Handles tip calculations, staff allocation, and tip distribution
 */

import { prisma } from "@/lib/prisma.server";
import { logPayment } from "@/lib/observability/logger";

export interface TipRequest {
  paymentId: string;
  amount: number;
  percentage?: number;
  staffId?: string;
  notes?: string;
}

export class TipService {
  /**
   * Add tip to a payment
   */
  async addTip(request: TipRequest): Promise<{ tipId: string }> {
    try {
      // Verify payment exists and succeeded
      const payment = await prisma.payment.findFirst({
        where: {
          id: request.paymentId,
          status: "SUCCEEDED",
        },
        include: {
          bill: true,
        },
      });

      if (!payment) {
        throw new Error("Payment not found or not succeeded");
      }

      // Check if tip already exists
      const existingTip = await prisma.tip.findFirst({
        where: { paymentId: request.paymentId },
      });

      if (existingTip) {
        throw new Error("Tip already added to this payment");
      }

      // Create tip
      const tip = await prisma.tip.create({
        data: {
          billId: payment.billId,
          paymentId: request.paymentId,
          amount: request.amount,
          percentage: request.percentage || null,
          staffId: request.staffId || null,
          notes: request.notes || null,
        },
      });

      logPayment("Tip added", {
        tipId: tip.id,
        paymentId: request.paymentId,
        amount: request.amount,
        staffId: request.staffId,
      });

      return { tipId: tip.id };
    } catch (error) {
      console.error("Add tip error:", error);
      throw error;
    }
  }

  /**
   * Get tips for a staff member
   */
  async getStaffTips(staffId: string, startDate?: Date, endDate?: Date) {
    const tips = await prisma.tip.findMany({
      where: {
        staffId,
        ...(startDate && endDate ? {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        } : {}),
      },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            total: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = tips.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      tips,
      total,
      count: tips.length,
    };
  }

  /**
   * Get tips for a date range
   */
  async getTipsForPeriod(restaurantId: string, startDate: Date, endDate: Date) {
    const tips = await prisma.tip.findMany({
      where: {
        bill: {
          restaurantId,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
          },
        },
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = tips.reduce((sum, tip) => sum + tip.amount, 0);
    const byStaff = tips.reduce((acc, tip) => {
      const staffId = tip.staffId || "unassigned";
      acc[staffId] = (acc[staffId] || 0) + tip.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      tips,
      total,
      count: tips.length,
      byStaff,
    };
  }
}

export const tipService = new TipService();
