"use client";

import { useState, useEffect, useCallback } from "react";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import {
  Receipt,
  Plus,
  Loader2,
  RefreshCcw,
  X,
  Trash2,
  CreditCard,
  Split,
  CheckCircle,
  Filter,
  Download,
  Printer,
} from "lucide-react";
import { BillStatus, PaymentMethod } from "@prisma/client";
import PaymentModal from "./PaymentModal";
import { downloadInvoice, printInvoice } from "./InvoiceGenerator";
import BillDetailEditor from "./BillDetailEditor";

interface BillingContentProps {
  restaurantId: string;
  restaurantName: string;
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
  table?: { id: string; name: string | null } | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    menuItem?: {
      id: string;
      name: string;
      price?: number;
      category?: {
        id: string;
        name: string;
      } | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    amount: number;
    reference: string | null;
  }>;
  createdAt: string;
  closedAt: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: { id: string; name: string };
}

export default function BillingContent({ restaurantId, restaurantName }: BillingContentProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<BillStatus | "ALL">("ALL");
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }
      const res = await fetch(`/api/billing?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to load bills");
        setBills([]);
        return;
      }
      setBills(data.bills || []);
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/menu-items", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setMenuItems(data);
      }
    } catch (err) {
      console.error("Failed to load menu items:", err);
    }
  }, []);

  useEffect(() => {
    fetchBills();
    fetchMenuItems();
    const isTest =
      typeof window !== "undefined" &&
      (window.location.search.includes("test=true") || process.env.NODE_ENV === "test");
    if (!isTest) {
      const interval = setInterval(fetchBills, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchBills, fetchMenuItems]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleCreateBill = async (tableId?: string) => {
    setUpdating((prev) => new Set(prev).add("new"));
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: tableId || null,
          taxRate: 18,
          items: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to create bill");
        return;
      }

      await fetchBills();
    } catch (err) {
      setError("Failed to create bill");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete("new");
        return next;
      });
    }
  };

  const handleBillUpdate = useCallback(async () => {
    // Refresh bills list
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") {
      params.append("status", statusFilter);
    }
    try {
      const res = await fetch(`/api/billing?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data.bills) {
        setBills(data.bills);
        // Update selected bill if it still exists
        if (selectedBill) {
          const updatedBill = data.bills.find((b: Bill) => b.id === selectedBill.id);
          if (updatedBill) {
            setSelectedBill(updatedBill);
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh bills:", err);
    }
  }, [selectedBill, statusFilter]);

  const handleCloseBill = async (billId: string) => {
    if (!confirm("Are you sure you want to close this bill?")) {
      return;
    }

    setUpdating((prev) => new Set(prev).add(billId));
    try {
      const res = await fetch(`/api/billing/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to close bill");
        return;
      }

      await fetchBills();
      setSelectedBill(null);
    } catch (err) {
      setError("Failed to close bill");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    setUpdating((prev) => new Set(prev).add(billId));
    try {
      const res = await fetch(`/api/billing/${billId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to delete bill");
        return;
      }
      await fetchBills();
      if (selectedBill?.id === billId) setSelectedBill(null);
      setSuccessMessage("Bill deleted successfully");
    } catch (err) {
      setError("Failed to delete bill");
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: BillStatus) => {
    const styles = {
      OPEN: "bg-yellow-100 text-yellow-800",
      CLOSED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-slate-100 text-slate-800";
  };

  if (loading && bills.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <OfflineIndicator />
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-600 mt-1">Manage bills and payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleCreateBill()}
            disabled={updating.has("new")}
            className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {updating.has("new") ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Bill
          </button>
          <button
            onClick={() => {
              // Refresh action (silent in production)
              fetchBills();
            }}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            statusFilter === "ALL"
              ? "bg-orange-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter("OPEN")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            statusFilter === "OPEN"
              ? "bg-orange-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setStatusFilter("CLOSED")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            statusFilter === "CLOSED"
              ? "bg-orange-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Closed
        </button>
      </div>

      {/* Bills Grid */}
      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Receipt className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <div data-testid="empty-state">
            <h2 className="text-xl font-bold text-slate-900 mb-2">No bills yet</h2>
            <p className="text-slate-600 mb-4">Create a new bill to get started</p>
          </div>
          <button
            onClick={() => handleCreateBill()}
            className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Create Bill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              data-testid="bill-card"
              className={`bg-white rounded-2xl border-2 shadow-sm p-6 cursor-pointer transition-all ${
                selectedBill?.id === bill.id
                  ? "border-orange-500 ring-2 ring-orange-200"
                  : "border-slate-100 hover:border-slate-200"
              }`}
              onClick={() => setSelectedBill(bill)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(bill.status)}`}>
                      {bill.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{bill.billNumber}</h3>
                  {bill.table && (
                    <p className="text-sm text-slate-600 mt-1">Table: {bill.table.name || bill.table.id.slice(-4)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">₹{(bill.total ?? 0).toFixed(2)}</p>
                  {(bill.balance ?? 0) > 0 && (
                    <p className="text-xs text-red-600 mt-1">Balance: ₹{(bill.balance ?? 0).toFixed(2)}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mb-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">₹{(bill.subtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">GST ({(bill.taxRate ?? 18)}%):</span>
                    <span className="font-semibold">₹{((bill.cgst ?? 0) + (bill.sgst ?? 0)).toFixed(2)}</span>
                  </div>
                  {(bill.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-₹{(bill.discount ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(bill.serviceCharge ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Service:</span>
                      <span>₹{(bill.serviceCharge ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {bill.status === "OPEN" && (
                  <button
                    data-testid="add-payment"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBill(bill);
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay
                  </button>
                )}
                {bill.status === "CLOSED" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadInvoice({
                        bill: bill as any,
                        restaurantName,
                      });
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Invoice
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBill(bill.id);
                  }}
                  disabled={updating.has(bill.id)}
                  className="px-3 py-2 border-2 border-red-500 text-red-600 bg-white font-semibold rounded-lg hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {updating.has(bill.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill Detail Editor */}
      {selectedBill && (
        <BillDetailEditor
          bill={selectedBill}
          menuItems={menuItems}
          restaurantName={restaurantName}
          onClose={() => setSelectedBill(null)}
          onUpdate={handleBillUpdate}
          onPayment={() => setIsPaymentModalOpen(true)}
          onCloseBill={() => handleCloseBill(selectedBill.id)}
          loading={updating.has(selectedBill.id)}
        />
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bill={selectedBill}
          onPaymentSuccess={() => {
            handleBillUpdate();
            setIsPaymentModalOpen(false);
            setSuccessMessage("Payment successful");
          }}
        />
      )}
    </div>
  );
}

