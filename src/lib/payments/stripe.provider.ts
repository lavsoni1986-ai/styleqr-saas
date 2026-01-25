/**
 * Stripe Payment Provider
 * Handles Cards, Digital Wallets, International payments
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

interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret?: string;
}

export class StripeProvider implements PaymentProvider {
  private config: StripeConfig;
  private baseUrl = "https://api.stripe.com/v1";

  constructor(config: StripeConfig) {
    this.config = config;
  }

  getName(): string {
    return "stripe";
  }

  getSupportedCountries(): string[] {
    return ["US", "GB", "CA", "AU", "EU", "SG", "AE"]; // Major Stripe markets
  }

  getSupportedMethods(): string[] {
    return ["CARD", "WALLET", "BANK_TRANSFER"];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.secretKey && this.config.publishableKey);
  }

  async createPayment(
    amount: number,
    currency: string,
    method: string,
    metadata: PaymentMetadata
  ): Promise<PaymentIntent> {
    if (!await this.isAvailable()) {
      throw new Error("Stripe not configured");
    }

    // Convert amount to cents (smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    try {
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${this.config.secretKey}`,
        },
        body: new URLSearchParams({
          amount: amountInCents.toString(),
          currency: currency.toLowerCase(),
          payment_method_types: method === "CARD" ? "card" : "card",
          metadata: JSON.stringify({
            billId: metadata.billId,
            restaurantId: metadata.restaurantId,
            tableId: metadata.tableId || "",
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(`Stripe payment intent creation failed: ${error.error?.message || "Unknown error"}`);
      }

      const intent = await response.json();

      return {
        id: intent.id,
        amount: amount,
        currency: currency.toUpperCase(),
        status: intent.status === "requires_payment_method" ? "pending" : "processing",
        metadata,
        gateway: "stripe",
        gatewayPaymentId: intent.id,
        clientSecret: intent.client_secret,
        createdAt: new Date(intent.created * 1000),
      };
    } catch (error) {
      console.error("Stripe createPayment error:", error);
      throw error;
    }
  }

  async verifyPayment(
    paymentId: string,
    gatewayResponse?: unknown
  ): Promise<PaymentResult> {
    if (!await this.isAvailable()) {
      throw new Error("Stripe not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Stripe payment verification failed: ${response.statusText}`);
      }

      const intent = await response.json();

      return {
        success: intent.status === "succeeded",
        paymentId: intent.id,
        gatewayPaymentId: intent.id,
        amount: intent.amount / 100, // Convert from cents
        currency: intent.currency.toUpperCase(),
        status: intent.status === "succeeded" ? "succeeded" : intent.status === "processing" ? "pending" : "failed",
        method: intent.payment_method_types?.[0]?.toUpperCase() || "CARD",
        reference: intent.id,
        failureReason: intent.last_payment_error?.message,
      };
    } catch (error) {
      console.error("Stripe verifyPayment error:", error);
      throw error;
    }
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    if (!await this.isAvailable()) {
      throw new Error("Stripe not configured");
    }

    const amountInCents = Math.round(request.amount * 100);

    try {
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${this.config.secretKey}`,
        },
        body: new URLSearchParams({
          payment_intent: request.paymentId,
          amount: amountInCents.toString(),
          reason: request.reason || "requested_by_customer",
          metadata: JSON.stringify(request.metadata || {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(`Stripe refund failed: ${error.error?.message || "Unknown error"}`);
      }

      const refund = await response.json();

      return {
        success: refund.status === "succeeded",
        refundId: refund.id,
        gatewayRefundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        reason: request.reason,
      };
    } catch (error) {
      console.error("Stripe refund error:", error);
      throw error;
    }
  }

  async getSettlement(date: string): Promise<SettlementData> {
    // Stripe settlements are fetched via their balance transactions API
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
      currency: "USD",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    return this.verifyPayment(paymentId);
  }
}
