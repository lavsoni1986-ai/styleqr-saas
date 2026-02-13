/**
 * localStorage key and helpers for persisting active order across navigation/refresh.
 */

const STORAGE_KEY = "styleqr_active_order";

export type ActiveOrder = {
  orderId: string;
  restaurantId: string;
};

export function getActiveOrder(): ActiveOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as ActiveOrder).orderId === "string" &&
      typeof (parsed as ActiveOrder).restaurantId === "string"
    ) {
      return parsed as ActiveOrder;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveOrder(orderId: string, restaurantId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ orderId, restaurantId })
    );
  } catch {
    // Ignore quota/private mode errors
  }
}

export function clearActiveOrder(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
