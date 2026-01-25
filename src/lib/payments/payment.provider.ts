/**
 * Payment Provider Abstraction Layer
 * Universal interface for payment gateways (Razorpay, Stripe, Adyen, etc.)
 */

export interface PaymentMetadata {
  billId: string;
  tableId?: string;
  restaurantId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  metadata: PaymentMetadata;
  gateway: string;
  gatewayPaymentId?: string;
  clientSecret?: string; // For client-side confirmation (Stripe, etc.)
  paymentLink?: string; // For UPI/QR payments
  createdAt: Date;
  expiresAt?: Date;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  method: string;
  reference?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  gatewayRefundId?: string;
  amount: number;
  status: "succeeded" | "failed" | "pending";
  reason?: string;
}

export interface SettlementData {
  date: string; // YYYY-MM-DD
  totalSales: number;
  cash: number;
  upi: number;
  card: number;
  wallet: number;
  qr: number;
  refunds: number;
  tips: number;
  gatewayAmount: number;
  gatewayFees: number;
  variance: number;
  transactions: number;
  currency: string;
}

/**
 * Universal Payment Provider Interface
 * All payment gateways must implement this interface
 */
export interface PaymentProvider {
  /**
   * Create a new payment intent
   */
  createPayment(
    amount: number,
    currency: string,
    method: string,
    metadata: PaymentMetadata
  ): Promise<PaymentIntent>;

  /**
   * Verify/Confirm a payment after gateway callback
   */
  verifyPayment(
    paymentId: string,
    gatewayResponse?: unknown
  ): Promise<PaymentResult>;

  /**
   * Refund a payment (full or partial)
   */
  refund(request: RefundRequest): Promise<RefundResult>;

  /**
   * Get daily settlement data from gateway
   */
  getSettlement(date: string): Promise<SettlementData>;

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Promise<PaymentResult>;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get supported payment methods
   */
  getSupportedMethods(): string[];

  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get supported countries
   */
  getSupportedCountries(): string[];
}

export enum PaymentMethod {
  CASH = "CASH",
  UPI = "UPI",
  CARD = "CARD",
  QR = "QR",
  WALLET = "WALLET",
  NETBANKING = "NETBANKING",
  EMI = "EMI",
  CREDIT = "CREDIT",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}
