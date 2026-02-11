/**
 * Cashfree PG Payment Provider
 * Handles UPI, Cards, Net Banking, Wallets for Indian market
 */

import type {
  PaymentProvider,
  PaymentIntent,
  PaymentResult,
  RefundRequest,
  RefundResult,
  SettlementData,
  PaymentMetadata,
} from "./payment.provider";

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  webhookSecret?: string;
}

export class CashfreeProvider implements PaymentProvider {
  private config: CashfreeConfig;
  private baseUrl = "https://api.cashfree.com/pg";

  constructor(config: CashfreeConfig) {
    this.config = config;
  }

  getName(): string {
    return "cashfree";
  }

  getSupportedCountries(): string[] {
    return ["IN"];
  }

  getSupportedMethods(): string[] {
    return ["UPI", "CARD", "NETBANKING", "WALLET"];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.appId && this.config.secretKey);
  }

  async createPayment(
    amount: number,
    currency: string,
    method: string,
    metadata: PaymentMetadata
  ): Promise<PaymentIntent> {
    if (!(await this.isAvailable())) {
      throw new Error("Cashfree not configured");
    }

    const orderId = `order_${metadata.billId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2025-01-01",
          "x-client-id": this.config.appId,
          "x-client-secret": this.config.secretKey,
        },
        body: JSON.stringify({
          order_amount: amount,
          order_currency: currency || "INR",
          order_id: orderId,
          customer_details: {
            customer_id: metadata.customerPhone || metadata.billId || "guest",
            customer_phone: metadata.customerPhone || "9999999999",
            customer_email: metadata.customerEmail,
          },
          order_meta: {
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/payments?order_id={order_id}`,
            notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/cashfree/webhook`,
          },
          order_tags: {
            billId: metadata.billId,
            restaurantId: metadata.restaurantId,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          `Cashfree order creation failed: ${(err as { message?: string }).message || response.statusText}`
        );
      }

      const order = (await response.json()) as {
        cf_order_id?: string;
        order_id?: string;
        order_amount?: number;
        payment_session_id?: string;
        order_currency?: string;
      };

      return {
        id: order.cf_order_id || order.order_id || orderId,
        amount: order.order_amount ?? amount,
        currency: (order.order_currency || currency).toUpperCase(),
        status: "pending",
        metadata,
        gateway: "cashfree",
        gatewayPaymentId: order.cf_order_id,
        paymentLink: order.payment_session_id
          ? `https://payments.cashfree.com/merchant/pay?session_id=${order.payment_session_id}`
          : undefined,
        clientSecret: order.payment_session_id,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error("Cashfree createPayment error:", error);
      throw error;
    }
  }

  async verifyPayment(paymentId: string, gatewayResponse?: unknown): Promise<PaymentResult> {
    if (!(await this.isAvailable())) {
      throw new Error("Cashfree not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${paymentId}`, {
        method: "GET",
        headers: {
          "x-api-version": "2025-01-01",
          "x-client-id": this.config.appId,
          "x-client-secret": this.config.secretKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Cashfree order verification failed: ${response.statusText}`);
      }

      const order = (await response.json()) as {
        order_status?: string;
        order_amount?: number;
        order_currency?: string;
      };

      const status =
        order.order_status === "PAID"
          ? "succeeded"
          : order.order_status === "ACTIVE"
          ? "pending"
          : "failed";

      return {
        success: order.order_status === "PAID",
        paymentId,
        gatewayPaymentId: paymentId,
        amount: order.order_amount ?? 0,
        currency: (order.order_currency || "INR").toUpperCase(),
        status,
        method: "UPI",
        reference: paymentId,
      };
    } catch (error) {
      console.error("Cashfree verifyPayment error:", error);
      throw error;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    if (!(await this.isAvailable())) {
      throw new Error("Cashfree not configured");
    }
    // Cashfree refund requires order_id; for now return placeholder
    return {
      success: false,
      refundId: `ref_${Date.now()}`,
      amount: request.amount,
      status: "pending",
      reason: "Refund via Cashfree dashboard",
    };
  }

  async getSettlement(date: string): Promise<SettlementData> {
    return {
      date,
      totalSales: 0,
      cash: 0,
      upi: 0,
      card: 0,
      wallet: 0,
      qr: 0,
      refunds: 0,
      tips: 0,
      gatewayAmount: 0,
      gatewayFees: 0,
      variance: 0,
      transactions: 0,
      currency: "INR",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    return this.verifyPayment(paymentId);
  }
}
