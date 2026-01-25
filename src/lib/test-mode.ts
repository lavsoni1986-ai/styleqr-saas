/**
 * Test Mode Detection and Mock Data for Playwright E2E Tests
 * 
 * This module provides test-mode detection and mock data generators
 * to accelerate API responses during E2E testing.
 * 
 * When PLAYWRIGHT=true or NODE_ENV=test (and NOT in production):
 * - APIs return instant mock data
 * - Skip heavy Prisma aggregations
 * - Skip background polling/jobs
 * - Dashboard loads under 2s
 * 
 * IMPORTANT: isTestMode is NEVER true when NODE_ENV === "production",
 * so test-mode bypass cannot affect production.
 */

export const isTestMode =
  process.env.NODE_ENV !== "production" &&
  (process.env.PLAYWRIGHT === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.TEST_MODE === "true");

/**
 * Mock data generators for test mode
 */
export const testMockData = {
  // Dashboard summary stats
  dashboardStats: {
    totalOrders: 25,
    totalRevenue: 12500,
    todayOrders: 8,
    todayRevenue: 3200,
    pendingOrders: 3,
    activeOrders: 5,
    averageOrderValue: 400,
    totalCustomers: 150,
  },

  // Daily sales report
  dailySalesReport: {
    date: new Date().toISOString().split('T')[0],
    totalBills: 12,
    totalSales: 8500,
    totalSubtotal: 7200,
    totalTax: 1296,
    totalDiscount: 200,
    totalServiceCharge: 204,
    paymentBreakdown: {
      CASH: 3500,
      UPI: 2800,
      CARD: 1500,
      QR: 700,
      WALLET: 0,
      NETBANKING: 0,
      EMI: 0,
      CREDIT: 0,
    },
  },

  // Payments list
  payments: [
    {
      id: 'test-payment-1',
      amount: 850,
      method: 'CASH',
      status: 'SUCCEEDED',
      reference: 'CASH-123456',
      billNumber: 'BILL-2026-0001',
      tableName: 'Table 1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test-payment-2',
      amount: 650,
      method: 'UPI',
      status: 'SUCCEEDED',
      reference: 'UPI-789012',
      billNumber: 'BILL-2026-0002',
      tableName: 'Table 2',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test-payment-3',
      amount: 450,
      method: 'CARD',
      status: 'SUCCEEDED',
      reference: 'CARD-345678',
      billNumber: 'BILL-2026-0003',
      tableName: 'Table 1',
      createdAt: new Date().toISOString(),
    },
  ],

  // Settlement data
  settlement: {
    id: 'test-settlement-1',
    date: new Date().toISOString().split('T')[0],
    status: 'PROCESSED',
    totalSales: 8500,
    cash: 3500,
    upi: 2800,
    card: 1500,
    wallet: 0,
    qr: 700,
    netbanking: 0,
    refunds: 0,
    tips: 250,
    discounts: 200,
    gatewayAmount: 5000,
    gatewayFees: 50,
    variance: 0,
    varianceNotes: null,
    transactionCount: 12,
    paymentCount: 12,
    refundCount: 0,
  },

  // Kitchen orders
  kitchenOrders: [
    {
      id: 'test-order-1',
      status: 'PENDING',
      type: 'DINE_IN',
      tableName: 'Table 1',
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      items: [
        { id: 'item-1', name: 'Test Burger', quantity: 2, price: 250 },
        { id: 'item-2', name: 'Test Drink', quantity: 2, price: 50 },
      ],
    },
    {
      id: 'test-order-2',
      status: 'ACCEPTED',
      type: 'DINE_IN',
      tableName: 'Table 2',
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      items: [
        { id: 'item-3', name: 'Test Pizza', quantity: 1, price: 400 },
      ],
    },
    {
      id: 'test-order-3',
      status: 'PREPARING',
      type: 'DINE_IN',
      tableName: 'Table 3',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      items: [
        { id: 'item-4', name: 'Test Pasta', quantity: 1, price: 300 },
        { id: 'item-5', name: 'Test Salad', quantity: 1, price: 150 },
      ],
    },
  ],

  // Tips data
  tips: [
    {
      id: 'test-tip-1',
      amount: 100,
      percentage: 10,
      staffName: 'John Server',
      staffId: 'staff-1',
      billNumber: 'BILL-2026-0001',
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
      notes: null,
    },
    {
      id: 'test-tip-2',
      amount: 75,
      percentage: 8,
      staffName: 'Jane Server',
      staffId: 'staff-2',
      billNumber: 'BILL-2026-0002',
      paymentMethod: 'UPI',
      createdAt: new Date().toISOString(),
      notes: null,
    },
  ],

  // Refunds data
  refunds: [] as Array<{
    id: string;
    paymentId: string;
    amount: number;
    status: string;
    reason: string;
    billNumber: string;
    paymentMethod: string;
    paymentAmount: number;
    createdAt: string;
  }>,

  // Offline queue status
  offlineQueueStatus: {
    total: 0,
    pending: 0,
    failed: 0,
  },

  // Bills list
  bills: [
    {
      id: 'test-bill-1',
      billNumber: 'BILL-2026-0001',
      status: 'OPEN',
      subtotal: 850,
      taxRate: 18,
      cgst: 76.5,
      sgst: 76.5,
      discount: 0,
      serviceCharge: 0,
      total: 1003,
      paidAmount: 0,
      balance: 1003,
      table: { id: 'table-1', name: 'Table 1' },
      items: [
        { id: 'bi-1', name: 'Test Burger', quantity: 2, price: 250, total: 500 },
        { id: 'bi-2', name: 'Test Pasta', quantity: 1, price: 300, total: 300 },
        { id: 'bi-3', name: 'Test Drink', quantity: 1, price: 50, total: 50 },
      ],
      payments: [],
      createdAt: new Date().toISOString(),
      closedAt: null,
    },
    {
      id: 'test-bill-2',
      billNumber: 'BILL-2026-0002',
      status: 'CLOSED',
      subtotal: 650,
      taxRate: 18,
      cgst: 58.5,
      sgst: 58.5,
      discount: 50,
      serviceCharge: 0,
      total: 717,
      paidAmount: 717,
      balance: 0,
      table: { id: 'table-2', name: 'Table 2' },
      items: [
        { id: 'bi-4', name: 'Test Pizza', quantity: 1, price: 400, total: 400 },
        { id: 'bi-5', name: 'Test Salad', quantity: 1, price: 150, total: 150 },
        { id: 'bi-6', name: 'Test Drink', quantity: 2, price: 50, total: 100 },
      ],
      payments: [
        { id: 'pay-1', method: 'UPI', amount: 717, reference: 'UPI-123' },
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      closedAt: new Date().toISOString(),
    },
  ],

  // Orders for dashboard
  orders: [
    {
      id: 'test-order-1',
      status: 'PENDING',
      total: 600,
      type: 'DINE_IN',
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      table: { name: 'Table 1' },
      items: [
        { id: 'oi-1', quantity: 2, price: 250, menuItem: { id: 'mi-1', name: 'Test Burger' } },
        { id: 'oi-2', quantity: 2, price: 50, menuItem: { id: 'mi-2', name: 'Test Drink' } },
      ],
    },
    {
      id: 'test-order-2',
      status: 'ACCEPTED',
      total: 400,
      type: 'DINE_IN',
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      table: { name: 'Table 2' },
      items: [
        { id: 'oi-3', quantity: 1, price: 400, menuItem: { id: 'mi-3', name: 'Test Pizza' } },
      ],
    },
    {
      id: 'test-order-3',
      status: 'PREPARING',
      total: 450,
      type: 'DINE_IN',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      table: { name: 'Table 3' },
      items: [
        { id: 'oi-4', quantity: 1, price: 300, menuItem: { id: 'mi-4', name: 'Test Pasta' } },
        { id: 'oi-5', quantity: 1, price: 150, menuItem: { id: 'mi-5', name: 'Test Salad' } },
      ],
    },
  ],

  // Menu items for admin
  menuItems: [
    { id: 'mi-1', name: 'Test Burger', price: 250, description: 'Delicious test burger', available: true, category: { id: 'cat-1', name: 'Test Category' } },
    { id: 'mi-2', name: 'Test Pizza', price: 400, description: 'Delicious test pizza', available: true, category: { id: 'cat-1', name: 'Test Category' } },
    { id: 'mi-3', name: 'Test Pasta', price: 300, description: 'Delicious test pasta', available: true, category: { id: 'cat-1', name: 'Test Category' } },
    { id: 'mi-4', name: 'Test Salad', price: 150, description: 'Fresh test salad', available: true, category: { id: 'cat-1', name: 'Test Category' } },
    { id: 'mi-5', name: 'Test Drink', price: 50, description: 'Refreshing test drink', available: true, category: { id: 'cat-1', name: 'Test Category' } },
  ],

  // Shifts data
  shifts: [
    {
      id: 'shift-1',
      staffName: 'John Server',
      staffId: 'staff-1',
      startTime: new Date(Date.now() - 4 * 3600000).toISOString(),
      endTime: null,
      status: 'ACTIVE',
      totalSales: 2500,
      totalTips: 175,
    },
    {
      id: 'shift-2',
      staffName: 'Jane Server',
      staffId: 'staff-2',
      startTime: new Date(Date.now() - 8 * 3600000).toISOString(),
      endTime: new Date(Date.now() - 4 * 3600000).toISOString(),
      status: 'COMPLETED',
      totalSales: 3200,
      totalTips: 225,
    },
  ],
};

/**
 * Helper to check if request is in test mode
 */
export function shouldUseTestMode(): boolean {
  return isTestMode;
}

/**
 * Logging helper for test mode
 */
export function logTestMode(endpoint: string): void {
  if (isTestMode) {
    console.log(`[TEST MODE] ${endpoint} - returning mock data`);
  }
}
