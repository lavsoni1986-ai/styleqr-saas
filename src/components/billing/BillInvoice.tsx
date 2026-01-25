"use client";

import { Printer, Download } from "lucide-react";
import { downloadInvoice } from "@/components/dashboard/InvoiceGenerator";

export interface BillInvoiceBill {
  id: string;
  billNumber: string;
  status: string;
  subtotal: number;
  taxRate?: number;
  cgst: number;
  sgst: number;
  discount: number;
  serviceCharge: number;
  total: number;
  paidAmount: number;
  balance: number;
  createdAt: string;
  closedAt: string | null;
  table?: { id?: string; name: string | null } | null;
  items: Array<{
    id: string;
    name?: string;
    quantity?: number;
    price?: number;
    total?: number;
    menuItem?: { name?: string; price?: number } | null;
  }>;
  payments: Array<{
    id?: string;
    method: string;
    amount: number;
    reference?: string | null;
  }>;
}

export interface BillInvoiceTotalsOverride {
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  serviceCharge: number;
  total: number;
  balance: number;
}

interface BillInvoiceProps {
  bill: BillInvoiceBill;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantGSTIN?: string;
  totalsOverride?: BillInvoiceTotalsOverride;
  showActions?: boolean;
}

function Divider() {
  return <div className="border-t border-dashed border-slate-300 my-2" />;
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-600">{left}</span>
      <span className="font-mono tabular-nums">{right}</span>
    </div>
  );
}

export default function BillInvoice({
  bill,
  restaurantName,
  restaurantAddress = "",
  restaurantPhone = "",
  restaurantGSTIN = "",
  totalsOverride,
  showActions = true,
}: BillInvoiceProps) {
  const subtotal = totalsOverride?.subtotal ?? bill.subtotal ?? 0;
  const cgst = totalsOverride?.cgst ?? bill.cgst ?? 0;
  const sgst = totalsOverride?.sgst ?? bill.sgst ?? 0;
  const discount = totalsOverride?.discount ?? bill.discount ?? 0;
  const serviceCharge = totalsOverride?.serviceCharge ?? bill.serviceCharge ?? 0;
  const total = totalsOverride?.total ?? bill.total ?? 0;
  const balance = totalsOverride?.balance ?? bill.balance ?? 0;
  const paidAmount = bill.paidAmount ?? 0;
  const taxRate = bill.taxRate ?? 18;
  const taxHalf = (taxRate / 2).toFixed(1);

  const isPaid = balance <= 0 && paidAmount > 0;
  const lastPayment = bill.payments?.length ? bill.payments[bill.payments.length - 1] : null;

  const billDate = bill.closedAt
    ? new Date(bill.closedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : new Date(bill.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    downloadInvoice({
      bill: {
        ...bill,
        subtotal,
        cgst,
        sgst,
        discount,
        serviceCharge,
        total,
        paidAmount,
        balance,
      },
      restaurantName,
      restaurantAddress: restaurantAddress || undefined,
      restaurantPhone: restaurantPhone || undefined,
      restaurantGSTIN: restaurantGSTIN || undefined,
    });
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #bill-invoice-print, #bill-invoice-print * { visibility: visible; }
              #bill-invoice-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                box-shadow: none !important;
                padding: 1rem !important;
              }
              #bill-invoice-print .no-print { display: none !important; }
            }
          `,
        }}
      />
      <div
        id="bill-invoice-print"
        className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 font-mono text-slate-900 max-w-[340px] print:max-w-none print:border-0"
      >
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-lg font-bold uppercase tracking-tight">{restaurantName}</h1>
          {restaurantAddress && <p className="text-xs text-slate-600 mt-1">{restaurantAddress}</p>}
          {restaurantPhone && <p className="text-xs text-slate-600">Phone: {restaurantPhone}</p>}
          {restaurantGSTIN && <p className="text-xs text-slate-500 mt-0.5">GSTIN: {restaurantGSTIN}</p>}
        </div>
        <Divider />

        {/* Table & Bill Info */}
        <div className="space-y-0.5 text-sm">
          {bill.table && <Row left="Table" right={bill.table.name || "—"} />}
          <Row left="Bill No" right={bill.billNumber} />
          <Row left="Date" right={billDate} />
        </div>
        <Divider />

        {/* Items */}
        <div className="space-y-2">
          {bill.items?.map((item) => {
            const name = item.name || item.menuItem?.name || "Item";
            const qty = item.quantity ?? 1;
            const price = item.price ?? item.menuItem?.price ?? 0;
            const lineTotal = item.total ?? price * qty;
            return (
              <div key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{name} x{qty}</span>
                <span className="font-mono tabular-nums shrink-0">₹{lineTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        <Divider />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <Row left="Subtotal" right={`₹${subtotal.toFixed(2)}`} />
          <Row left={`CGST (${taxHalf}%)`} right={`₹${cgst.toFixed(2)}`} />
          <Row left={`SGST (${taxHalf}%)`} right={`₹${sgst.toFixed(2)}`} />
          {discount > 0 && <Row left="Discount" right={`-₹${discount.toFixed(2)}`} />}
          {serviceCharge > 0 && <Row left="Service Charge" right={`₹${serviceCharge.toFixed(2)}`} />}
        </div>
        <Divider />

        {/* TOTAL */}
        <div className="flex justify-between items-center py-1">
          <span className="font-bold text-base">TOTAL</span>
          <span className="font-bold text-lg tabular-nums">₹{total.toFixed(2)}</span>
        </div>
        <Divider />

        {/* Payment */}
        <div className="space-y-1 text-sm">
          {lastPayment && <Row left="Paid via" right={lastPayment.method} />}
          <Row left="Paid" right={`₹${paidAmount.toFixed(2)}`} />
          <Row left="Balance" right={`₹${balance.toFixed(2)}`} />
          <div className="flex justify-between items-center gap-2 pt-1">
            <span className="text-slate-600">Status</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                isPaid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {isPaid ? "PAID" : "UNPAID"}
            </span>
          </div>
        </div>
        <Divider />

        {/* Footer */}
        <div className="text-center text-sm space-y-0.5">
          <p>Thank you for dining with us 🙏</p>
          <p>Visit again!</p>
          <p className="text-xs text-slate-500 mt-2">Powered by StyleQR</p>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 mt-4 no-print">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        )}
      </div>
    </>
  );
}
