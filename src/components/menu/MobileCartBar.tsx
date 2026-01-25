"use client";

import { ShoppingCart, ArrowRight } from "lucide-react";

interface MobileCartBarProps {
  itemCount: number;
  totalPrice: number;
  onViewCart: () => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
  disabled: boolean;
}

export function MobileCartBar({
  itemCount,
  totalPrice,
  onViewCart,
  onPlaceOrder,
  isPlacingOrder,
  disabled,
}: MobileCartBarProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <button
          onClick={onViewCart}
          className="w-full px-4 py-3 flex items-center justify-between active:bg-white/5 transition-colors touch-manipulation"
          aria-label="View cart"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-amber-400" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-zinc-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-100">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-zinc-500" />
        </button>

        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-400">Total</span>
            <span className="text-2xl font-bold text-amber-400">${totalPrice.toFixed(2)}</span>
          </div>
          <button
            data-testid="place-order"
            onClick={onPlaceOrder}
            disabled={disabled || isPlacingOrder}
            className="w-full h-14 bg-amber-500 text-zinc-950 font-bold text-lg rounded-xl hover:bg-amber-400 active:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
            aria-label="Place order"
          >
            {isPlacingOrder ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send to kitchen</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
