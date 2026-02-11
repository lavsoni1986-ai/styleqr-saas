"use client";

import { useState, useMemo, useCallback } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Loader2,
  Percent,
  CreditCard,
  CheckCircle,
  Calculator,
} from "lucide-react";
import BillInvoice from "@/components/billing/BillInvoice";
import { BillStatus } from "@prisma/client";
import { offlineQueue } from "@/lib/offline/queue.engine";
import { networkMonitor } from "@/lib/offline/network.monitor";
import { logOrder, logError } from "@/lib/observability/logger";

interface BillItem {
  id: string;
  name: string;
  quantity?: number;
  price?: number;
  total?: number;
  menuItem?: {
    id: string;
    name: string;
    price?: number;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface Bill {
  id: string;
  billNumber: string;
  status: BillStatus;
  subtotal: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  discount: number;
  serviceCharge: number;
  total: number;
  paidAmount: number;
  balance: number;
  createdAt: string;
  closedAt: string | null;
  table?: { id: string; name: string | null } | null;
  items: BillItem[];
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    reference: string | null;
  }>;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: { id: string; name: string } | null;
}

interface BillDetailEditorProps {
  bill: Bill;
  menuItems: MenuItem[];
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  onClose: () => void;
  onUpdate: () => void;
  onPayment: () => void;
  onCloseBill: () => void;
  loading?: boolean;
}

export default function BillDetailEditor({
  bill,
  menuItems,
  restaurantName,
  restaurantAddress,
  restaurantPhone,
  onClose,
  onUpdate,
  onPayment,
  onCloseBill,
  loading = false,
}: BillDetailEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(bill.discount.toString());
  const [serviceCharge, setServiceCharge] = useState(bill.serviceCharge.toString());
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = bill.status === "OPEN";

  // Filter menu items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const query = searchQuery.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.category?.name ?? "").toLowerCase().includes(query)
    );
  }, [menuItems, searchQuery]);

  // Calculate live totals with POS-safe math
  const calculatedTotals = useMemo(() => {
    const subtotal = bill.items.reduce((sum, item) => {
      const safePrice = item.price ?? item.menuItem?.price ?? 0;
      const safeQty = item.quantity ?? 1;
      return sum + safePrice * safeQty;
    }, 0);

    const discountAmount =
      discountType === "flat"
        ? parseFloat(discountValue) || 0
        : (subtotal * (parseFloat(discountValue) || 0)) / 100;

    const safeTaxRate = bill.taxRate ?? 18;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const serviceChargeAmount = parseFloat(serviceCharge) || 0;
    const tax = (taxableAmount * safeTaxRate) / 100;
    const cgst = tax / 2;
    const sgst = tax / 2;
    const total = taxableAmount + serviceChargeAmount + tax;

    return {
      subtotal,
      discountAmount,
      serviceChargeAmount,
      cgst,
      sgst,
      tax,
      total,
      balance: total - (bill.paidAmount ?? 0),
    };
  }, [bill.items, bill.taxRate ?? 18, bill.paidAmount ?? 0, discountType, discountValue, serviceCharge]);

  // Add item to bill
  const handleAddItem = useCallback(async () => {
    if (!selectedItem || quantity < 1) {
      setError("Please select an item and quantity");
      return;
    }

    setUpdating(true);
    setError(null);

    const isOnline = networkMonitor.isOnline();

    try {
      if (isOnline) {
        // Try API call first
        const res = await fetch(`/api/billing/${bill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addItem",
            menuItemId: selectedItem,
            quantity,
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok) {
          // Success
          setSelectedItem("");
          setQuantity(1);
          setSearchQuery("");
          onUpdate();
          setUpdating(false);
          return;
        }
        
        // API failed - queue it
        // API call failed, queueing add item action (silent in production)
      }

      // Queue action (offline or API failed)
      await offlineQueue.enqueue({
        type: "ADD_BILL_ITEM",
        data: {
          billId: bill.id,
          menuItemId: selectedItem,
          quantity,
        },
      });

      // Reset form optimistically
      setSelectedItem("");
      setQuantity(1);
      setSearchQuery("");
      
      // Try to update UI immediately
      onUpdate();
      
      if (!isOnline) {
        setError(null); // Clear error, action queued
      }
    } catch (err) {
      console.error("Add item error:", err);
      setError("Failed to add item. Action has been queued for retry.");
      
      // Still queue it
      try {
        await offlineQueue.enqueue({
          type: "ADD_BILL_ITEM",
          data: {
            billId: bill.id,
            menuItemId: selectedItem,
            quantity,
          },
        });
      } catch (queueErr) {
        console.error("Queue failed:", queueErr);
      }
    } finally {
      setUpdating(false);
    }
  }, [selectedItem, quantity, bill.id, onUpdate]);

  // Update quantity (remove + re-add)
  const handleUpdateQuantity = useCallback(
    async (itemId: string, newQuantity: number) => {
      if (newQuantity < 1) {
        handleRemoveItem(itemId);
        return;
      }

      const item = bill.items.find((i) => i.id === itemId);
      if (!item || !item.menuItem?.id) {
        setError("Cannot update quantity: menu item not found");
        return;
      }

      setUpdating(true);
      setError(null);

      try {
        // Remove old item
        await fetch(`/api/billing/${bill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "removeItem",
            itemId,
          }),
        });

        // Add with new quantity
        const res = await fetch(`/api/billing/${bill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addItem",
            menuItemId: item.menuItem.id,
            quantity: newQuantity,
          }),
        });

        if (!res.ok) {
          setError("Failed to update quantity");
          return;
        }

        onUpdate();
      } catch (err) {
        setError("Failed to update quantity");
      } finally {
        setUpdating(false);
      }
    },
    [bill.id, bill.items, onUpdate]
  );

  // Remove item
  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      setUpdating(true);
      setError(null);

      try {
        const res = await fetch(`/api/billing/${bill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "removeItem",
            itemId,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError((data as any)?.error || "Failed to remove item");
          return;
        }

        onUpdate();
      } catch (err) {
        setError("Failed to remove item");
      } finally {
        setUpdating(false);
      }
    },
    [bill.id, onUpdate]
  );

  // Update discount
  const handleUpdateDiscount = useCallback(async () => {
    setUpdating(true);
    setError(null);

    try {
      const discountAmount =
        discountType === "flat"
          ? parseFloat(discountValue) || 0
          : (calculatedTotals.subtotal * (parseFloat(discountValue) || 0)) / 100;

      const res = await fetch(`/api/billing/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateDiscount",
          discount: discountAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to update discount");
        return;
      }

      onUpdate();
    } catch (err) {
      setError("Failed to update discount");
    } finally {
      setUpdating(false);
    }
  }, [bill.id, discountType, discountValue, calculatedTotals.subtotal, onUpdate]);

  // Update service charge
  const handleUpdateServiceCharge = useCallback(async () => {
    setUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/billing/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateServiceCharge",
          serviceCharge: parseFloat(serviceCharge) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to update service charge");
        return;
      }

      onUpdate();
    } catch (err) {
      setError("Failed to update service charge");
    } finally {
      setUpdating(false);
    }
  }, [bill.id, serviceCharge, onUpdate]);

  const selectedMenuItem = menuItems.find((item) => item.id === selectedItem);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="dark-modal bg-[#0B0F14] rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div data-testid="bill-editor" className="sticky top-0 bg-[#0B0F14] border-b border-gray-800 px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">{bill.billNumber}</h2>
            {bill.table && (
              <p className="text-sm text-gray-400">Table: {bill.table.name || bill.table.id.slice(-4)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            disabled={updating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 md:mx-6 mt-4 p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Add Items */}
            {isOpen && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Add Items</h3>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu items..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1A1F26] border border-gray-800 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Item Selector */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Select Item</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-800 rounded-lg bg-[#1A1F26]">
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No items found</div>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setQuantity(1);
                          }}
                          className={`w-full text-left px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors ${
                            selectedItem === item.id ? "bg-amber-500/20 border-amber-500/50" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.category?.name ?? "Uncategorized"}</p>
                            </div>
                              <p className="font-bold text-amber-500">₹{(item.price ?? 0).toFixed(2)}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Quantity & Add */}
                {selectedMenuItem && (
                  <div className="space-y-3 p-4 bg-[#1A1F26] rounded-lg border border-gray-800">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors text-white"
                          disabled={updating}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-white text-center font-semibold placeholder:text-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors text-white"
                          disabled={updating}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Price:</span>
                      <span className="font-semibold text-white">₹{(selectedMenuItem?.price ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-gray-800">
                      <span className="text-white">Subtotal:</span>
                      <span className="text-amber-500">₹{((selectedMenuItem?.price ?? 0) * quantity).toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={updating || !selectedItem}
                      className="w-full px-4 py-3 bg-amber-500 text-zinc-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add to Bill
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Right Side: Bill Items (editable when OPEN), Discount & Service, Receipt */}
            <div className={`space-y-4 ${!isOpen ? "lg:col-span-2" : ""}`}>
              {isOpen && (
                <>
                  <h3 className="text-lg font-semibold text-white">Bill Items</h3>
                  <div className="border border-gray-800 rounded-lg overflow-hidden font-mono text-sm bg-[#1A1F26]">
                    {bill.items.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No items in bill</div>
                    ) : (
                      <div className="divide-y divide-gray-800">
                        {bill.items.map((item) => (
                          <div key={item.id} className="p-3 flex items-center justify-between gap-2 hover:bg-gray-800/50">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white truncate">
                                {item.name || item.menuItem?.name || "Deleted Item"}
                              </p>
                              <p className="text-xs text-gray-500">
                                ₹{(item.price ?? item.menuItem?.price ?? 0).toFixed(2)} × {item.quantity ?? 1}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-gray-800 rounded bg-gray-900">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, (item.quantity ?? 1) - 1)}
                                  disabled={updating}
                                  className="p-1.5 hover:bg-gray-800 disabled:opacity-50 text-white"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="px-2 py-1 text-sm font-mono min-w-[2rem] text-center text-white">{item.quantity ?? 1}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, (item.quantity ?? 1) + 1)}
                                  disabled={updating}
                                  className="p-1.5 hover:bg-gray-800 disabled:opacity-50 text-white"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={updating}
                                className="p-1.5 text-red-400 hover:bg-red-900/30 rounded disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="font-mono font-semibold tabular-nums w-16 text-right text-amber-500">
                              ₹{((item.price ?? item.menuItem?.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Discount & Service Charge */}
                  <div className="space-y-3 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Discount</label>
                      <div className="flex gap-2">
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white disabled:opacity-50"
                          disabled={updating}
                        >
                          <option value="flat">₹ Flat</option>
                          <option value="percent">% Percent</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step={discountType === "percent" ? "1" : "0.01"}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === "percent" ? "0" : "0.00"}
                          className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white font-semibold placeholder:text-gray-500 caret-amber-500 disabled:opacity-50"
                          disabled={updating}
                        />
                        <button
                          type="button"
                          onClick={handleUpdateDiscount}
                          disabled={updating || discountValue === bill.discount.toString()}
                          className="px-4 py-2 bg-amber-500 text-zinc-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Service Charge</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={serviceCharge}
                          onChange={(e) => setServiceCharge(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white font-semibold placeholder:text-gray-500 caret-amber-500 disabled:opacity-50"
                          disabled={updating}
                        />
                        <button
                          type="button"
                          onClick={handleUpdateServiceCharge}
                          disabled={updating || serviceCharge === bill.serviceCharge.toString()}
                          className="px-4 py-2 bg-amber-500 text-zinc-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Receipt / Invoice */}
              <div className={isOpen ? "" : "flex justify-center lg:justify-start"}>
                <BillInvoice
                  bill={bill}
                  restaurantName={restaurantName}
                  restaurantAddress={restaurantAddress}
                  restaurantPhone={restaurantPhone}
                  totalsOverride={isOpen ? {
                    subtotal: calculatedTotals.subtotal,
                    cgst: calculatedTotals.cgst,
                    sgst: calculatedTotals.sgst,
                    discount: calculatedTotals.discountAmount,
                    serviceCharge: calculatedTotals.serviceChargeAmount,
                    total: calculatedTotals.total,
                    balance: calculatedTotals.balance,
                  } : undefined}
                  showActions={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#0B0F14] border-t border-gray-800 px-4 md:px-6 py-4 flex flex-col sm:flex-row gap-2">
          {isOpen ? (
            <>
              <button
                data-testid="add-payment"
                type="button"
                onClick={onPayment}
                disabled={updating || loading}
                className="flex-1 px-4 py-3 bg-amber-500 text-zinc-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Add Payment
              </button>
              {(calculatedTotals.balance ?? 0) <= 0 && (
                <button
                  data-testid="close-bill"
                  type="button"
                  onClick={onCloseBill}
                  disabled={updating || loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Close Bill
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
