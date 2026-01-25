import { APIRequestContext } from '@playwright/test';

export class APIClient {
  constructor(public request: APIRequestContext, public baseURL = 'http://localhost:3000') {}

  async login(email: string, password: string) {
    const response = await this.request.post(`${this.baseURL}/api/auth/login`, {
      data: { email, password },
    });
    
    if (response.ok()) {
      const cookies = response.headers()['set-cookie'] || [];
      return Array.isArray(cookies) ? cookies.join('; ') : cookies;
    }
    return null;
  }

  async createOrder(restaurantId: string, items: Array<{ menuItemId: string; qty: number }>, token?: string) {
    const response = await this.request.post(`${this.baseURL}/api/orders`, {
      data: {
        token: token || 'test-token',
        items,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok() ? await response.json() : null;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const response = await this.request.patch(`${this.baseURL}/api/admin/orders/${orderId}`, {
      data: { status },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok();
  }

  async getOrders(restaurantId: string) {
    const response = await this.request.get(`${this.baseURL}/api/admin/orders?restaurantId=${restaurantId}`);
    return response.ok() ? await response.json() : null;
  }

  async getBills(restaurantId: string) {
    const response = await this.request.get(`${this.baseURL}/api/billing?restaurantId=${restaurantId}`);
    return response.ok() ? await response.json() : null;
  }

  async createPayment(billId: string, amount: number, method: string) {
    const response = await this.request.post(`${this.baseURL}/api/payments`, {
      data: {
        billId,
        amount,
        method,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok() ? await response.json() : null;
  }
}
