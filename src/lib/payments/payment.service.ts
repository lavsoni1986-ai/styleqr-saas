/**
 * Payment Service - Orchestrates payment providers
 * Handles routing, retry logic, offline queue integration
 */

import type { PaymentProvider } from "./payment.provider";
import type { PaymentIntent, PaymentResult, RefundRequest, RefundResult, SettlementData, PaymentMetadata } from "./payment.provider";
import { RazorpayProvider } from "./razorpay.provider";
import { StripeProvider } from "./stripe.provider";
import { MockProvider } from "./mock.provider";
import { offlineQueue } from "@/lib/offline/queue.engine";
import { networkMonitor } from "@/lib/offline/network.monitor";
import { logPayment, logError } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma.server";

export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private defaultProvider: PaymentProvider | null = null;

  constructor() {
    // Initialize providers
    this.providers.set("mock", new MockProvider());
  }

  /**
   * Register a payment provider
   */
  registerProvider(name: string, provider: PaymentProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Set default provider for a restaurant
   */
  async setDefaultProvider(restaurantId: string, providerName: string): Promise<void> {
    // Load provider from database configuration
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        restaurantId,
        name: providerName,
        isActive: true,
        isDefault: true,
      },
    });

    if (!gateway) {
      throw new Error(`Payment gateway ${providerName} not configured for restaurant ${restaurantId}`);
    }

    // Initialize provider based on gateway config
    const provider = await this.createProviderFromGateway(gateway);
    if (provider) {
      this.providers.set(`${restaurantId}_${providerName}`, provider);
      this.defaultProvider = provider;
    }
  }

  /**
   * Create provider instance from gateway configuration.
   * Gateway keySecret and webhookSecret are stored and read as plaintext;
   * use DB-level encryption or a secrets manager in production.
   */
  private async createProviderFromGateway(gateway: any): Promise<PaymentProvider | null> {
    try {
      switch (gateway.name.toLowerCase()) {
        case "razorpay":
          return new RazorpayProvider({
            keyId: gateway.keyId || "",
            keySecret: gateway.keySecret || "",
            webhookSecret: gateway.webhookSecret,
          });

        case "stripe":
          return new StripeProvider({
            publishableKey: gateway.keyId || "",
            secretKey: gateway.keySecret || "",
            webhookSecret: gateway.webhookSecret,
          });

        case "mock":
          return new MockProvider();

        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to create provider for ${gateway.name}:`, error);
      return null;
    }
  }

  /**
   * Get provider for restaurant
   */
  private async getProvider(restaurantId: string, providerName?: string): Promise<PaymentProvider> {
    // Try restaurant-specific provider
    if (providerName) {
      const key = `${restaurantId}_${providerName}`;
      const provider = this.providers.get(key);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }

    // Try default provider
    if (this.defaultProvider && await this.defaultProvider.isAvailable()) {
      return this.defaultProvider;
    }

    // Fallback to mock provider
    const mockProvider = this.providers.get("mock");
    if (mockProvider) {
      return mockProvider;
    }

    throw new Error("No payment provider available");
  }

  /**
   * Create payment intent
   */
  async createPayment(
    restaurantId: string,
    amount: number,
    currency: string,
    method: string,
    metadata: PaymentMetadata,
    providerName?: string
  ): Promise<PaymentIntent> {
    const isOnline = networkMonitor.isOnline();

    try {
      const provider = await this.getProvider(restaurantId, providerName);
      const intent = await provider.createPayment(amount, currency, method, metadata);

      logPayment("Payment intent created", {
        restaurantId,
        paymentId: intent.id,
        amount,
        method,
        gateway: provider.getName(),
        offline: !isOnline,
      });

      return intent;
    } catch (error) {
      logError("Payment intent creation failed", {
        error: String(error),
        restaurantId,
        amount,
        method,
      }, "payment");

      // Queue for retry if offline
      if (!isOnline) {
        await offlineQueue.enqueue({
          type: "CREATE_PAYMENT",
          data: {
            restaurantId,
            amount,
            currency,
            method,
            metadata,
          },
        } as any);
      }

      throw error;
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(
    restaurantId: string,
    paymentId: string,
    gatewayResponse?: unknown,
    providerName?: string
  ): Promise<PaymentResult> {
    try {
      const provider = await this.getProvider(restaurantId, providerName);
      const result = await provider.verifyPayment(paymentId, gatewayResponse);

      logPayment("Payment verified", {
        restaurantId,
        paymentId,
        success: result.success,
        status: result.status,
        gateway: provider.getName(),
      });

      return result;
    } catch (error) {
      logError("Payment verification failed", {
        error: String(error),
        restaurantId,
        paymentId,
      }, "payment");
      throw error;
    }
  }

  /**
   * Refund payment
   */
  async refund(
    restaurantId: string,
    request: RefundRequest,
    providerName?: string
  ): Promise<RefundResult> {
    try {
      const provider = await this.getProvider(restaurantId, providerName);
      const result = await provider.refund(request);

      logPayment("Refund processed", {
        restaurantId,
        paymentId: request.paymentId,
        amount: request.amount,
        success: result.success,
        gateway: provider.getName(),
      });

      return result;
    } catch (error) {
      logError("Refund failed", {
        error: String(error),
        restaurantId,
        paymentId: request.paymentId,
        amount: request.amount,
      }, "payment");
      throw error;
    }
  }

  /**
   * Get settlement data
   */
  async getSettlement(
    restaurantId: string,
    date: string,
    providerName?: string
  ): Promise<SettlementData> {
    try {
      const provider = await this.getProvider(restaurantId, providerName);
      return await provider.getSettlement(date);
    } catch (error) {
      logError("Settlement fetch failed", {
        error: String(error),
        restaurantId,
        date,
      }, "payment");
      throw error;
    }
  }
}

// Singleton instance
export const paymentService = new PaymentService();
