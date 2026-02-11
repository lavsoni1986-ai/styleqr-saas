/**
 * Offline Queue Engine - IndexedDB-based action queue
 * Handles order creation, updates, billing, payments when offline
 */

export type QueueAction = 
  | { type: "CREATE_ORDER"; data: { token: string; items: Array<{ menuItemId: string; qty: number }>; notes?: string | null } }
  | { type: "UPDATE_ORDER_STATUS"; data: { orderId: string; status: string } }
  | { type: "CREATE_BILL"; data: { tableId?: string; items: any[] } }
  | { type: "ADD_BILL_ITEM"; data: { billId: string; menuItemId: string; quantity: number } }
  | { type: "REMOVE_BILL_ITEM"; data: { billId: string; itemId: string } }
  | { type: "UPDATE_BILL_DISCOUNT"; data: { billId: string; discount: number } }
  | { type: "UPDATE_BILL_SERVICE_CHARGE"; data: { billId: string; serviceCharge: number } }
  | { type: "ADD_PAYMENT"; data: { billId: string; method: string; amount: number; reference?: string | null; notes?: string | null } }
  | { type: "CLOSE_BILL"; data: { billId: string } }
  | { type: "CREATE_PAYMENT"; data: { restaurantId: string; amount: number; currency: string; method: string; metadata: any } }
  | { type: "VERIFY_PAYMENT"; data: { restaurantId: string; paymentId: string; gatewayResponse?: unknown } }
  | { type: "PROCESS_REFUND"; data: { restaurantId: string; paymentId: string; amount: number; reason?: string } };

export interface QueuedAction {
  id: string;
  action: QueueAction;
  timestamp: number;
  retries: number;
  status: "PENDING" | "SYNCING" | "COMPLETED" | "FAILED";
  error?: string;
  lastAttempt?: number;
}

class OfflineQueueEngine {
  private dbName = "styleqr-offline-queue";
  private dbVersion = 1;
  private storeName = "actions";
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private syncListeners: Array<() => void> = [];

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async enqueue(action: QueueAction): Promise<string> {
    if (!this.db) await this.init();

    const queuedAction: QueuedAction = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
      status: "PENDING",
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(queuedAction);

      request.onsuccess = () => {
        this.triggerSync();
        resolve(queuedAction.id);
      };

      request.onerror = () => {
        console.error("Failed to queue action:", request.error);
        reject(request.error);
      };
    });
  }

  async getAllPending(): Promise<QueuedAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("status");
      const request = index.getAll("PENDING");

      request.onsuccess = () => {
        const actions = request.result as QueuedAction[];
        resolve(actions.sort((a, b) => a.timestamp - b.timestamp));
      };

      request.onerror = () => {
        console.error("Failed to get pending actions:", request.error);
        reject(request.error);
      };
    });
  }

  async updateStatus(id: string, status: QueuedAction["status"], error?: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const action = getRequest.result as QueuedAction;
        if (!action) {
          resolve();
          return;
        }

        action.status = status;
        action.lastAttempt = Date.now();
        if (error) action.error = error;
        if (status === "SYNCING") action.retries++;

        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async remove(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQueueStatus(): Promise<{
    total: number;
    pending: number;
    syncing: number;
    failed: number;
  }> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ total: 0, pending: 0, syncing: 0, failed: 0 });
        return;
      }

      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const actions = request.result as QueuedAction[];
        resolve({
          total: actions.length,
          pending: actions.filter(a => a.status === "PENDING").length,
          syncing: actions.filter(a => a.status === "SYNCING").length,
          failed: actions.filter(a => a.status === "FAILED").length,
        });
      };

      request.onerror = () => {
        resolve({ total: 0, pending: 0, syncing: 0, failed: 0 });
      };
    });
  }

  onSync(callback: () => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private triggerSync(): void {
    this.syncListeners.forEach(cb => cb());
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pending = await this.getAllPending();
      
      for (const queued of pending) {
        if (queued.retries >= 5) {
          await this.updateStatus(queued.id, "FAILED", "Max retries exceeded");
          continue;
        }

        await this.updateStatus(queued.id, "SYNCING");

        try {
          const success = await this.executeAction(queued.action);
          
          if (success) {
            await this.updateStatus(queued.id, "COMPLETED");
            await this.remove(queued.id);
          } else {
            await this.updateStatus(queued.id, "PENDING", "Execution failed");
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await this.updateStatus(queued.id, "PENDING", errorMsg);
          console.error(`Failed to sync action ${queued.id}:`, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeAction(action: QueueAction): Promise<boolean> {
    try {
      switch (action.type) {
        case "CREATE_ORDER": {
          const res = await fetch(`${window.location.origin}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: action.data.token,
              items: action.data.items,
              notes: action.data.notes || null,
            }),
          });
          return res.ok;
        }

        case "UPDATE_ORDER_STATUS": {
          const res = await fetch(`${window.location.origin}/api/kitchen/orders/${action.data.orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action.data.status }),
          });
          return res.ok;
        }

        case "ADD_BILL_ITEM": {
          const res = await fetch(`${window.location.origin}/api/billing/${action.data.billId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "addItem",
              menuItemId: action.data.menuItemId,
              quantity: action.data.quantity,
            }),
          });
          return res.ok;
        }

        case "REMOVE_BILL_ITEM": {
          const res = await fetch(`${window.location.origin}/api/billing/${action.data.billId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "removeItem",
              itemId: action.data.itemId,
            }),
          });
          return res.ok;
        }

        case "ADD_PAYMENT": {
          const res = await fetch(`${window.location.origin}/api/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
          return res.ok;
        }

        case "CLOSE_BILL": {
          const res = await fetch(`${window.location.origin}/api/billing/${action.data.billId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "close" }),
          });
          return res.ok;
        }

        default:
          return false;
      }
    } catch (error) {
      console.error("Action execution error:", error);
      return false;
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueEngine();

// Auto-initialize
if (typeof window !== "undefined") {
  offlineQueue.init().catch(console.error);
}
