/**
 * Network Status Monitor
 * Tracks online/offline state and provides utilities
 */

export class NetworkMonitor {
  private listeners: Array<(online: boolean) => void> = [];
  private online = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor() {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
    }
  }

  isOnline(): boolean {
    return typeof navigator !== "undefined" ? (navigator.onLine ?? false) : true;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private handleOnline(): void {
    this.online = true;
    this.listeners.forEach(cb => cb(true));
  }

  private handleOffline(): void {
    this.online = false;
    this.listeners.forEach(cb => cb(false));
  }

  async testConnection(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${window.location.origin}/api/health`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-cache",
      });
      
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const networkMonitor = new NetworkMonitor();
