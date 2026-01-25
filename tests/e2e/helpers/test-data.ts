import { APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Pre-computed hash for 'password123' using bcrypt with 12 rounds
// This needs to be dynamically generated at runtime
async function hashTestPassword(): Promise<string> {
  return bcrypt.hash('password123', 12);
}

export interface SeededRestaurantContext {
  restaurant: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    email: string;
  };
  tables: Array<{ id: string; number: string }>;
  menuItems: Array<{ id: string; name: string; price: number }>;
  orders: Array<{ id: string; status: string }>;
  bills: Array<{ id: string; status: string }>;
  payments: Array<{ id: string; method: string; amount: number }>;
}

/**
 * Seeds a complete restaurant context for E2E tests.
 * Creates: Restaurant, Owner, Tables, Menu Items, Orders, Bills, Payments
 */
export async function seedFullRestaurantContext(): Promise<SeededRestaurantContext> {
  try {
    // Clean up existing test data first
    await cleanupTestData();

    // 1. Create or get test owner
    const hashedPassword = await hashTestPassword();
    
    let owner = await prisma.user.findUnique({
      where: { email: 'owner@test.com' },
    });

    if (!owner) {
      owner = await prisma.user.create({
        data: {
          email: 'owner@test.com',
          password: hashedPassword,
          name: 'Test Owner',
          role: 'RESTAURANT_OWNER',
        },
      });
    } else {
      // Update password hash to ensure it's correct
      owner = await prisma.user.update({
        where: { id: owner.id },
        data: { password: hashedPassword },
      });
    }

    // 2. Create or get test restaurant
    let restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: owner.id },
    });

    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          name: 'Test Restaurant',
          ownerId: owner.id,
        },
      });
    }

    // 3. Create 2 tables with qrToken directly on Table model
    let table1 = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, name: '1' },
    });

    if (!table1) {
      table1 = await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          name: '1',
          qrToken: 'test-token-1',
        },
      });
    } else if (table1.qrToken !== 'test-token-1') {
      // Update token to match expected test token
      table1 = await prisma.table.update({
        where: { id: table1.id },
        data: { qrToken: 'test-token-1' },
      });
    }

    let table2 = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, name: '2' },
    });

    if (!table2) {
      table2 = await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          name: '2',
          qrToken: 'test-token-2',
        },
      });
    } else if (table2.qrToken !== 'test-token-2') {
      // Update token to match expected test token
      table2 = await prisma.table.update({
        where: { id: table2.id },
        data: { qrToken: 'test-token-2' },
      });
    }

    const tables = [table1, table2];

    // 4. Create category and 5 menu items
    let category = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name: 'Test Category' },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Test Category',
        },
      });
    }

    // Create menu items (MenuItem has NO restaurantId, only categoryId)
    const menuItemNames = ['Test Burger', 'Test Pizza', 'Test Pasta', 'Test Salad', 'Test Drink'];
    const menuItemPrices = [250, 400, 300, 150, 50];
    
    const menuItems = await Promise.all(
      menuItemNames.map(async (name, index) => {
        // MenuItem doesn't have restaurantId directly, search through category
        const existing = await prisma.menuItem.findFirst({
          where: { 
            categoryId: category.id, 
            name 
          },
        });
        
        if (existing) {
          return existing;
        }
        
        return prisma.menuItem.create({
          data: {
            categoryId: category.id,
            name,
            description: `Test ${name}`,
            price: menuItemPrices[index],
            available: true,
          },
        });
      })
    );

    // 5. Create 3 pending orders (Order doesn't have token field, only tableId and type)
    const orders = await Promise.all([
      prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: tables[0].id,
          type: 'DINE_IN',
          status: 'PENDING',
          items: {
            create: [
              {
                menuItemId: menuItems[0].id,
                quantity: 1,
                price: menuItems[0].price,
              },
            ],
          },
        },
        include: { items: true },
      }),
      prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: tables[0].id,
          type: 'DINE_IN',
          status: 'ACCEPTED',
          items: {
            create: [
              {
                menuItemId: menuItems[1].id,
                quantity: 2,
                price: menuItems[1].price,
              },
            ],
          },
        },
        include: { items: true },
      }),
      prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: tables[1].id,
          type: 'DINE_IN',
          status: 'PREPARING',
          items: {
            create: [
              {
                menuItemId: menuItems[2].id,
                quantity: 1,
                price: menuItems[2].price,
              },
            ],
          },
        },
        include: { items: true },
      }),
    ]);

    // 6. Create 1 SERVED order and its bill
    const servedOrder = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: tables[0].id,
        type: 'DINE_IN',
        status: 'SERVED',
        items: {
          create: [
            {
              menuItemId: menuItems[0].id,
              quantity: 1,
              price: menuItems[0].price,
            },
            {
              menuItemId: menuItems[3].id,
              quantity: 2,
              price: menuItems[3].price,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Check if bill already exists for this table/order
    // Bill doesn't have orderId directly, find by tableId instead
    let bill = await prisma.bill.findFirst({
      where: { 
        restaurantId: restaurant.id,
        tableId: tables[0].id,
        status: 'CLOSED',
      },
    });

    if (!bill) {
      const subtotal = servedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const taxRate = 18;
      const cgst = subtotal * (taxRate / 200); // CGST is half of GST (18% = 9% CGST + 9% SGST)
      const sgst = subtotal * (taxRate / 200);
      const total = subtotal + cgst + sgst;

      // Get next bill number
      let billSequence = await prisma.billSequence.findUnique({
        where: { restaurantId: restaurant.id },
      });

      if (!billSequence) {
        billSequence = await prisma.billSequence.create({
          data: {
            restaurantId: restaurant.id,
            year: new Date().getFullYear(),
            lastBillNumber: 0,
          },
        });
      }

      const nextBillNumber = billSequence.lastBillNumber + 1;
      const billNumber = `BILL-${billSequence.year}-${String(nextBillNumber).padStart(4, '0')}`;

      bill = await prisma.bill.create({
        data: {
          restaurantId: restaurant.id,
          tableId: tables[0].id,
          status: 'CLOSED',
          billNumber,
          subtotal,
          taxRate,
          cgst,
          sgst,
          total,
          paidAmount: total,
          balance: 0,
          items: {
            create: servedOrder.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              name: menuItems.find((m) => m.id === item.menuItemId)?.name || 'Unknown',
              taxRate: taxRate / 2, // Half for each (CGST + SGST)
              cgst: item.price * item.quantity * (taxRate / 200),
              sgst: item.price * item.quantity * (taxRate / 200),
              total: item.price * item.quantity * (1 + taxRate / 100),
            })),
          },
        },
        include: { items: true },
      });

      // Update bill sequence
      await prisma.billSequence.update({
        where: { restaurantId: restaurant.id },
        data: { lastBillNumber: nextBillNumber },
      });
    }

    const totalWithGst = bill.total;

    // 7. Create 2 payments for the closed bill (if not exist)
    const existingPayments = await prisma.payment.findMany({
      where: { billId: bill.id },
    });

    let payments = existingPayments;
    
    if (existingPayments.length < 2) {
      const newPayments = await Promise.all([
        prisma.payment.create({
          data: {
            billId: bill.id,
            method: 'CASH',
            amount: totalWithGst / 2,
            status: 'SUCCEEDED',
            reference: `CASH-${Date.now()}`,
          },
        }),
        prisma.payment.create({
          data: {
            billId: bill.id,
            method: 'UPI',
            amount: totalWithGst / 2,
            status: 'SUCCEEDED',
            reference: `UPI-${Date.now()}`,
          },
        }),
      ]);
      payments = [...existingPayments, ...newPayments];
    }

    // 8. Create a settlement for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingSettlement = await prisma.settlement.findFirst({
      where: {
        restaurantId: restaurant.id,
        date: today,
      },
    });

    if (!existingSettlement) {
      await prisma.settlement.create({
        data: {
          restaurantId: restaurant.id,
          date: today,
          totalSales: totalWithGst,
          cash: totalWithGst / 2,
          upi: totalWithGst / 2,
          transactionCount: 2,
          status: 'PROCESSED',
        },
      });
    }

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
      owner: {
        id: owner.id,
        email: owner.email,
      },
      tables: tables.map((t) => ({ id: t.id, number: t.name || '1' })),
      menuItems: menuItems.map((m) => ({ id: m.id, name: m.name, price: m.price })),
      orders: orders.map((o) => ({ id: o.id, status: o.status })),
      bills: [{ id: bill.id, status: bill.status }],
      payments: payments.map((p) => ({ id: p.id, method: p.method, amount: p.amount })),
    };
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Cleans up test data before seeding
 */
async function cleanupTestData() {
  try {
    const testOwner = await prisma.user.findUnique({
      where: { email: 'owner@test.com' },
    });

    if (testOwner) {
      // Delete in reverse order of dependencies
      await prisma.settlement.deleteMany({
        where: { restaurant: { ownerId: testOwner.id } },
      });

      await prisma.payment.deleteMany({
        where: { bill: { restaurant: { ownerId: testOwner.id } } },
      });

      await prisma.billItem.deleteMany({
        where: { bill: { restaurant: { ownerId: testOwner.id } } },
      });

      await prisma.bill.deleteMany({
        where: { restaurant: { ownerId: testOwner.id } },
      });

      await prisma.billSequence.deleteMany({
        where: { restaurant: { ownerId: testOwner.id } },
      });

      await prisma.orderItem.deleteMany({
        where: { order: { restaurant: { ownerId: testOwner.id } } },
      });

      await prisma.order.deleteMany({
        where: { restaurant: { ownerId: testOwner.id } },
      });

      // QR tokens are stored in Table model, no separate cleanup needed
      
      // MenuItem doesn't have restaurantId directly, delete through category
      const categories = await prisma.category.findMany({
        where: { restaurant: { ownerId: testOwner.id } },
        select: { id: true },
      });
      
      await prisma.menuItem.deleteMany({
        where: { categoryId: { in: categories.map(c => c.id) } },
      });

      await prisma.category.deleteMany({
        where: { restaurant: { ownerId: testOwner.id } },
      });

      // Get restaurant IDs first
      const restaurants = await prisma.restaurant.findMany({
        where: { ownerId: testOwner.id },
        select: { id: true },
      });

      await prisma.table.deleteMany({
        where: { restaurantId: { in: restaurants.map(r => r.id) } },
      });

      await prisma.restaurant.deleteMany({
        where: { ownerId: testOwner.id },
      });
    }
  } catch (error) {
    console.warn('Error cleaning up test data:', error);
    // Continue anyway
  }
}

/**
 * Legacy functions for backward compatibility
 */
export async function createTestRestaurant(request: APIRequestContext, ownerId: string) {
  // This will be handled by seedFullRestaurantContext
  return null;
}

export async function createTestOrder(request: APIRequestContext, restaurantId: string, tableId?: string) {
  // This will be handled by seedFullRestaurantContext
  return null;
}

export async function createTestBill(request: APIRequestContext, restaurantId: string, tableId?: string) {
  // This will be handled by seedFullRestaurantContext
  return null;
}

export async function seedTestData(request: APIRequestContext) {
  // Legacy function - redirects to new seeding
  return await seedFullRestaurantContext();
}
