/**
 * Mock Payment Provider
 * For development, testing, and offline scenarios
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

export class MockProvider implements PaymentProvider {
  private payments: Map<string, PaymentResult> = new Map();

  getName(): string {
    return "mock";
  }

  getSupportedCountries(): string[] {
    return ["*"]; // All countries for testing
  }

  getSupportedMethods(): string[] {
    return ["CASH", "UPI", "CARD", "QR", "WALLET", "NETBANKING"];
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available for testing
  }

  async createPayment(
    amount: number,
    currency: string,
    method: string,
    metadata: PaymentMetadata
  ): Promise<PaymentIntent> {
    const paymentId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      id: paymentId,
      amount,
      currency: currency.toUpperCase(),
      status: "pending",
      metadata,
      gateway: "mock",
      gatewayPaymentId: paymentId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };
  }

  async verifyPayment(
    paymentId: string,
    gatewayResponse?: unknown
  ): Promise<PaymentResult> {
    // In mock mode, auto-approve after 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result: PaymentResult = {
      success: true,
      paymentId,
      gatewayPaymentId: paymentId,
      amount: 0, // Will be set from stored intent
      currency: "INR",
      status: "succeeded",
      method: "MOCK",
      reference: paymentId,
    };

    this.payments.set(paymentId, result);
    return result;
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      refundId,
      gatewayRefundId: refundId,
      amount: request.amount,
      status: "succeeded",
      reason: request.reason,
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
    const stored = this.payments.get(paymentId);
    if (stored) {
      return stored;
    }

    // Return pending if not found
    return {
      success: false,
      paymentId,
      amount: 0,
      currency: "INR",
      status: "pending",
      method: "MOCK",
    };
  }
}
