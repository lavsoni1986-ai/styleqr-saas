/**
 * Structured Logging Service
 * Centralized logging for orders, payments, printer jobs, offline queue
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  level: LogLevel;
  message: string;
  category: "order" | "payment" | "printer" | "offline" | "system";
  data?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  restaurantId?: string;
  orderId?: string;
  billId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sentryEnabled = false;

  constructor() {
    // Initialize Sentry if available
    if (typeof window !== "undefined" && (window as any).Sentry) {
      this.sentryEnabled = true;
    }

    // Persist logs to IndexedDB
    this.loadLogs();
  }

  private async loadLogs(): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB) return;

    try {
      const db = await this.openLogDB();
      const transaction = db.transaction(["logs"], "readonly");
      const store = transaction.objectStore("logs");
      const request = store.getAll();

      request.onsuccess = () => {
        this.logs = (request.result || []).slice(-this.maxLogs);
      };
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  }

  private async saveLog(entry: LogEntry): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB) {
      // Fallback to in-memory
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      return;
    }

    try {
      const db = await this.openLogDB();
      const transaction = db.transaction(["logs"], "readwrite");
      const store = transaction.objectStore("logs");
      await store.add(entry);

      // Keep only recent logs
      if (this.logs.length >= this.maxLogs) {
        const deleteRequest = store.index("timestamp").openKeyCursor(null, "next");
        deleteRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      }

      this.logs.push(entry);
    } catch (error) {
      console.error("Failed to save log:", error);
      this.logs.push(entry);
    }
  }

  private async openLogDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("styleqr-logs", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("logs")) {
          const store = db.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("category", "category", { unique: false });
          store.createIndex("level", "level", { unique: false });
        }
      };
    });
  }

  async log(entry: Omit<LogEntry, "timestamp">): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Console output
    const consoleMethod = entry.level === "error" ? console.error 
                       : entry.level === "warn" ? console.warn
                       : entry.level === "debug" ? console.debug
                       : console.log;
    
    consoleMethod(`[${entry.category.toUpperCase()}] ${entry.message}`, entry.data || "");

    // Sentry for errors
    if (entry.level === "error" && this.sentryEnabled && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(entry.message), {
        tags: { category: entry.category },
        extra: entry.data,
      });
    }

    // Persist log
    await this.saveLog(logEntry);
  }

  async getLogs(filters?: {
    category?: LogEntry["category"];
    level?: LogLevel;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LogEntry[]> {
    let filtered = [...this.logs];

    if (filters) {
      if (filters.category) {
        filtered = filtered.filter(l => l.category === filters.category);
      }
      if (filters.level) {
        filtered = filtered.filter(l => l.level === filters.level);
      }
      if (filters.startTime) {
        const start = filters.startTime.toISOString();
        filtered = filtered.filter(l => l.timestamp >= start);
      }
      if (filters.endTime) {
        const end = filters.endTime.toISOString();
        filtered = filtered.filter(l => l.timestamp <= end);
      }
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const logger = new Logger();

// Convenience methods
export const logOrder = (message: string, data?: Record<string, unknown>) => 
  logger.log({ level: "info", message, category: "order", data });

export const logPayment = (message: string, data?: Record<string, unknown>) =>
  logger.log({ level: "info", message, category: "payment", data });

export const logPrinter = (message: string, data?: Record<string, unknown>) =>
  logger.log({ level: "info", message, category: "printer", data });

export const logOffline = (message: string, data?: Record<string, unknown>) =>
  logger.log({ level: "info", message, category: "offline", data });

export const logError = (message: string, data?: Record<string, unknown>, category: LogEntry["category"] = "system") =>
  logger.log({ level: "error", message, category, data });
