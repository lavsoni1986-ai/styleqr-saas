/**
 * Razorpay Payment Provider
 * Handles UPI, Cards, Netbanking, Wallets for Indian market
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

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export class RazorpayProvider implements PaymentProvider {
  private config: RazorpayConfig;
  private baseUrl = "https://api.razorpay.com/v1";

  constructor(config: RazorpayConfig) {
    this.config = config;
  }

  getName(): string {
    return "razorpay";
  }

  getSupportedCountries(): string[] {
    return ["IN"];
  }

  getSupportedMethods(): string[] {
    return ["UPI", "CARD", "NETBANKING", "WALLET", "QR"];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.keyId && this.config.keySecret);
  }

  async createPayment(
    amount: number,
    currency: string,
    method: string,
    metadata: PaymentMetadata
  ): Promise<PaymentIntent> {
    if (!await this.isAvailable()) {
      throw new Error("Razorpay not configured");
    }

    // Convert amount to paise (smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: currency.toUpperCase(),
          receipt: `bill_${metadata.billId}`,
          notes: {
            billId: metadata.billId,
            restaurantId: metadata.restaurantId,
            tableId: metadata.tableId || "",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(`Razorpay order creation failed: ${error.error?.description || "Unknown error"}`);
      }

      const order = await response.json();

      return {
        id: order.id,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "pending",
        metadata,
        gateway: "razorpay",
        gatewayPaymentId: order.id,
        createdAt: new Date(order.created_at * 1000),
      };
    } catch (error) {
      console.error("Razorpay createPayment error:", error);
      throw error;
    }
  }

  async verifyPayment(
    paymentId: string,
    gatewayResponse?: unknown
  ): Promise<PaymentResult> {
    if (!await this.isAvailable()) {
      throw new Error("Razorpay not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Razorpay payment verification failed: ${response.statusText}`);
      }

      const payment = await response.json();

      return {
        success: payment.status === "captured" || payment.status === "authorized",
        paymentId: payment.id,
        gatewayPaymentId: payment.id,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        status: payment.status === "captured" ? "succeeded" : payment.status === "authorized" ? "pending" : "failed",
        method: payment.method || "CARD",
        reference: payment.order_id,
        failureReason: payment.status === "failed" ? payment.error_description : undefined,
      };
    } catch (error) {
      console.error("Razorpay verifyPayment error:", error);
      throw error;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    if (!await this.isAvailable()) {
      throw new Error("Razorpay not configured");
    }

    const amountInPaise = Math.round(request.amount * 100);

    try {
      const response = await fetch(`${this.baseUrl}/payments/${request.paymentId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          notes: {
            reason: request.reason || "Customer request",
            ...request.metadata,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(`Razorpay refund failed: ${error.error?.description || "Unknown error"}`);
      }

      const refund = await response.json();

      return {
        success: refund.status === "processed",
        refundId: refund.id,
        gatewayRefundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status === "processed" ? "succeeded" : "pending",
        reason: request.reason,
      };
    } catch (error) {
      console.error("Razorpay refund error:", error);
      throw error;
    }
  }

  async getSettlement(date: string): Promise<SettlementData> {
    // Razorpay settlements are fetched via their settlements API
    // This is a simplified implementation
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
