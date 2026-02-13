"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2, UtensilsCrossed, CheckCircle, WifiOff, MapPin } from "lucide-react";
import { MobileMenuCard, type MobileMenuItem } from "@/components/menu/MobileMenuCard";
import { MobileCartBar } from "@/components/menu/MobileCartBar";
import { CartDrawer, type CartItem } from "@/components/menu/CartDrawer";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { offlineQueue } from "@/lib/offline/queue.engine";
import { networkMonitor } from "@/lib/offline/network.monitor";
import { logOrder, logError } from "@/lib/observability/logger";
import { setActiveOrder, getActiveOrder } from "@/lib/active-order-storage";

type QrResponse = {
  tableId: string;
  tableName: string | null;
  restaurantId: string;
  restaurantName: string;
};

type Category = {
  id: string;
  name: string;
  items: MobileMenuItem[];
};

export default function MenuClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  // ContextNode: Parse context from URL param (e.g., ctx=hotel|room|205|breakfast|in-room)
  const contextParam = useMemo(() => searchParams.get("ctx") || null, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [tableName, setTableName] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, { item: MobileMenuItem; qty: number }>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Check for active order in localStorage (same restaurant)
  useEffect(() => {
    if (!restaurantId) return;
    const sync = () => {
      const stored = getActiveOrder();
      if (stored && stored.restaurantId === restaurantId) {
        setActiveOrderId(stored.orderId);
      } else {
        setActiveOrderId(null);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [restaurantId]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      setCategories([]);
      setRestaurantName("");
      setRestaurantId("");
      setTableName(null);
      setCart({});
      setOrderId(null);
      setIsCartDrawerOpen(false);
      setActiveCategoryId(null);
      setNotes("");

      if (!token) {
        setError("Something didn't go through. Please try again.");
        setLoading(false);
        return;
      }

      try {
        // Use window.location.origin for mobile compatibility
        const apiBaseUrl = window.location.origin;
        
        const qrRes = await fetch(`${apiBaseUrl}/api/qr?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        const qrJson = (await qrRes.json().catch(() => null)) as QrResponse | { error?: string } | null;

        if (!qrRes.ok) {
          const msg = "Something didn't go through. Please try again.";
          setError(msg);
          setLoading(false);
          return;
        }

        const qr = qrJson as QrResponse;
        setRestaurantName(qr.restaurantName);
        setRestaurantId(qr.restaurantId);
        setTableName(qr.tableName ?? null);

        const menuRes = await fetch(`${apiBaseUrl}/api/menu?restaurantId=${encodeURIComponent(qr.restaurantId)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        const menuJson = await menuRes.json().catch(() => null);
        if (!menuRes.ok) {
          setError((menuJson as any)?.error || "Could not load menu items. Please try again.");
          setLoading(false);
          return;
        }

        const loadedCategories = Array.isArray(menuJson) ? (menuJson as Category[]) : [];
        setCategories(loadedCategories);

        if (loadedCategories.length > 0) {
          setActiveCategoryId(loadedCategories[0].id);
        }

        setLoading(false);
      } catch {
        if (controller.signal.aborted) return;
        setError("Network error. Please check your connection and try again.");
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [token]);

  // Auto-select first category when categories exist but active is null (fixes QR scan → null active tab)
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // Scroll to category when clicked; never use negative scroll offset
  const handleCategoryClick = (id: string) => {
    setActiveCategoryId(id);
    const section = categoryRefs.current[id];
    if (!section) return;

    const y = section.getBoundingClientRect().top + window.scrollY - 130;
    const safeY = Math.max(0, y);
    window.scrollTo({ top: safeY, behavior: "smooth" });
  };

  // Track scroll position to update active category
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160; // Offset for sticky headers

      for (const category of categories) {
        const element = categoryRefs.current[category.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategoryId(category.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartItems.reduce((s, x) => s + x.qty, 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((s, x) => s + x.qty * x.item.price, 0), [cartItems]);

  const addToCart = (item: MobileMenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const nextQty = (existing?.qty ?? 0) + 1;
      return { ...prev, [item.id]: { item, qty: nextQty } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...existing, qty: existing.qty - 1 } };
    });
  };

  const placeOrder = async () => {
    if (!token) return;
    if (cartCount === 0) return;
    setPlacingOrder(true);
    setError(null);
    setOrderId(null);
    setIsCartDrawerOpen(false);

    // ContextNode: Parse context from URL param (pipe-separated: entityType|spaceType|identifier|timeSlot|serviceMode)
    // No questions asked - context inferred from QR URL
    let context = null;
    if (contextParam) {
      const parts = contextParam.split("|");
      if (parts.length >= 3) {
        context = {
          entityType: parts[0] || null,
          spaceType: parts[1] || null,
          identifier: parts[2] || null,
          // timeSlot and serviceMode optional - will be derived from time/context if missing
          timeSlot: parts[3] || null,
          serviceMode: parts[4] || null,
        };
      }
    }

    const payload = {
      token,
      items: cartItems.map((c) => ({ menuItemId: c.item.id, qty: c.qty })),
      notes: typeof notes === "string" ? notes.trim() || null : null,
      ...(context && { context }),
    };
    setNotes("");

    const isOnline = networkMonitor.isOnline();

    try {
      if (isOnline) {
        // Try normal API call first
        const apiUrl = `${window.location.origin}/api/orders`;
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => null);
        
        if (res.ok && json && (json as any)?.orderId) {
          // Success - order placed
          const newOrderId = (json as any).orderId;
          logOrder("Order placed successfully", { orderId: newOrderId, token, itemCount: cartCount });
          setActiveOrder(newOrderId, restaurantId);
          setCart({});
          router.push(`/order/${newOrderId}`);
          setPlacingOrder(false);
          return;
        }
        
        // API call failed - queue it (silent in production)
      }

      // Queue order (offline or API failed)
      const queueId = await offlineQueue.enqueue({
        type: "CREATE_ORDER",
        data: payload,
      });

      const localOrderId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setOrderId(localOrderId);
      
      logOrder("Order queued for sync", { 
        queueId, 
        localOrderId, 
        offline: !isOnline,
        token,
        itemCount: cartCount 
      });

      // Show success message with queue info
      setCart({});
      setError(null);
      
      // Redirect to order tracking (with queued indicator)
      router.push(`/order/${localOrderId}?queued=true&queueId=${queueId}`);
      
    } catch (error) {
      console.error("Order placement error:", error);
      logError("Order placement failed", { error: String(error), token, cartCount }, "order");
      
      // Still try to queue even on error
      try {
        const queueId = await offlineQueue.enqueue({
          type: "CREATE_ORDER",
          data: payload,
        });
        const localOrderId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setOrderId(localOrderId);
        setCart({});
        router.push(`/order/${localOrderId}?queued=true&queueId=${queueId}`);
      } catch (queueError) {
        setError("Something didn't go through. Please try again.");
        console.error("Queue failed:", queueError);
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const cartItemsForDrawer: CartItem[] = cartItems.map((c) => ({
    item: c.item,
    qty: c.qty,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl animate-pulse w-12 h-12" />
            <div className="min-w-0 flex-1">
              <div className="h-5 bg-white/10 rounded-lg animate-pulse mb-2 w-40" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-48" />
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-6 space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 bg-white/10 rounded animate-pulse w-32" />
              <div className="space-y-4">
                {[1, 2].map((j) => (
                  <div key={j} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
                    <div className="h-48 bg-white/10 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-white/10 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-white/10 rounded animate-pulse w-full" />
                      <div className="h-12 bg-amber-500/20 rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center safe-area-inset">
        <div className="p-5 bg-red-500/10 rounded-2xl border border-red-400/30">
          <AlertCircle className="h-12 w-12 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mt-6">Menu unavailable</h1>
        <p className="text-zinc-400 mt-2 max-w-sm">Something didn't go through. Please try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-2xl transition-all touch-manipulation"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div data-testid="menu-page" className="min-h-screen bg-zinc-950 pb-36">
      {/* Sticky Header - Restaurant branding */}
      <div className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-400/30 flex-shrink-0">
            <UtensilsCrossed className="h-6 w-6 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-100 truncate">
              {restaurantName || "Restaurant Menu"}
            </h1>
            {tableName && (
              <p className="text-xs text-zinc-400 truncate">
                {tableName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <CategoryTabs
          categories={categories}
          activeCategoryId={activeCategoryId}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {/* Menu Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-8">
        {categories.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <UtensilsCrossed className="h-7 w-7 text-zinc-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">No items</h2>
          </div>
        ) : (
          categories.map((cat, cIdx) => (
            <section
              key={cat.id}
              ref={(el) => {
                if (el) categoryRefs.current[cat.id] = el as HTMLDivElement;
              }}
              className="space-y-4 scroll-mt-32"
            >
              <div className="flex items-end justify-between border-b border-white/10 pb-2">
                <h2 className="text-xl font-bold text-zinc-100">{cat.name}</h2>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30">
                  {cat.items?.length || 0}
                </span>
              </div>

              <div className="space-y-4">
                {(cat.items || []).map((item, iIdx) => (
                  <MobileMenuCard
                    key={item.id}
                    item={item}
                    quantity={cart[item.id]?.qty ?? 0}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                    priority={cIdx === 0 && iIdx === 0}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Track Active Order - floating button when user has an order in progress */}
      {activeOrderId && (
        <div
          className={`fixed left-0 right-0 z-40 px-4 safe-area-inset-bottom ${
            cartCount > 0 ? "bottom-40" : "bottom-8"
          }`}
        >
          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={() => router.push(`/order/${activeOrderId}`)}
              className="w-full py-3 px-4 bg-emerald-500/90 hover:bg-emerald-500 text-zinc-950 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg border border-emerald-400/50 touch-manipulation"
            >
              <MapPin className="h-5 w-5" />
              Track Active Order
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Bar */}
      <MobileCartBar
        itemCount={cartCount}
        totalPrice={cartTotal}
        onViewCart={() => setIsCartDrawerOpen(true)}
        onPlaceOrder={placeOrder}
        isPlacingOrder={placingOrder}
        disabled={!restaurantId}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cartItems={cartItemsForDrawer}
        onAddItem={addToCart}
        onRemoveItem={removeFromCart}
        onPlaceOrder={() => placeOrder()}
        notes={notes}
        onNotesChange={(e) => setNotes(e.target.value)}
        isPlacingOrder={placingOrder}
        disabled={!restaurantId}
      />
    </div>
  );
}
