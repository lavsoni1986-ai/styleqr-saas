"use client";

import { X, Plus, Minus, Loader2 } from "lucide-react";
import type { MobileMenuItem } from "./MobileMenuCard";

export interface CartItem {
  item: MobileMenuItem;
  qty: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onAddItem: (item: MobileMenuItem) => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceOrder: () => void;
  notes: string;
  onNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPlacingOrder: boolean;
  disabled: boolean;
}

export function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onAddItem,
  onRemoveItem,
  onPlaceOrder,
  notes,
  onNotesChange,
  isPlacingOrder,
  disabled,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const total = cartItems.reduce((sum, item) => sum + item.item.price * item.qty, 0);

  return (
    <div data-testid="cart-drawer" className="fixed inset-0 z-50 flex items-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900/98 backdrop-blur-xl border-t border-white/10 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto safe-area-inset-bottom">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-zinc-100">Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors touch-manipulation"
            aria-label="Close cart"
          >
            <X className="h-6 w-6 text-zinc-400" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 text-lg">Cart is empty</p>
            </div>
          ) : (
            cartItems.map((cartItem) => (
              <div
                key={cartItem.item.id}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-100 text-base leading-tight">
                    {cartItem.item.name}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    ${cartItem.item.price.toFixed(2)} each
                  </p>
                  <p className="text-base font-bold text-amber-400 mt-2">
                    ${(cartItem.item.price * cartItem.qty).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => onRemoveItem(cartItem.item.id)}
                    className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl hover:bg-white/15 flex items-center justify-center touch-manipulation"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-5 w-5 text-zinc-300" strokeWidth={2.5} />
                  </button>
                  <span className="font-bold text-zinc-100 min-w-[2.5rem] text-center text-lg">
                    {cartItem.qty}
                  </span>
                  <button
                    onClick={() => onAddItem(cartItem.item)}
                    className="w-10 h-10 bg-amber-500 text-zinc-950 rounded-xl hover:bg-amber-400 flex items-center justify-center touch-manipulation"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="px-5 py-4 border-t border-white/10">
            <textarea
              value={notes}
              onChange={onNotesChange}
              placeholder="Notes for kitchen"
              className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none"
              maxLength={500}
            />
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur border-t border-white/10 px-5 py-4 safe-area-inset-bottom">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-zinc-400">Total</span>
              <span className="text-3xl font-bold text-amber-400">${total.toFixed(2)}</span>
            </div>
            <button
              data-testid="place-order"
              onClick={() => onPlaceOrder()}
              disabled={disabled || isPlacingOrder}
              className="w-full h-14 bg-amber-500 text-zinc-950 font-bold text-lg rounded-xl hover:bg-amber-400 active:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              aria-label="Place order"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send to kitchen</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
