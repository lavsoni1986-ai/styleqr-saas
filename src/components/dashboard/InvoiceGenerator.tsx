"use client";

interface Bill {
  id?: string;
  billNumber: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  serviceCharge: number;
  total: number;
  paidAmount?: number;
  balance?: number;
  status?: string;
  createdAt: string;
  closedAt: string | null;
  table?: { name: string | null } | null;
  items: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    total?: number;
    menuItem?: { name?: string; price?: number } | null;
  }>;
  payments: Array<{
    method: string;
    amount: number;
    reference?: string | null;
  }>;
}

interface InvoiceGeneratorProps {
  bill: Bill;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantGSTIN?: string;
}

export async function generateInvoicePDF({
  bill,
  restaurantName,
  restaurantAddress = "",
  restaurantPhone = "",
  restaurantGSTIN = "",
}: InvoiceGeneratorProps) {
  const { default: jsPDF } = await import("jspdf");
  // 80mm thermal printer width (approximately 226px at 72 DPI)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [226, 600], // 80mm width, variable height
  });

  let yPos = 20;
  const margin = 15;
  const maxWidth = 226 - margin * 2;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number, isBold = false, align: "left" | "center" | "right" = "left") => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (align === "center") {
        doc.text(line, 226 / 2, yPos, { align: "center" });
      } else if (align === "right") {
        doc.text(line, 226 - margin, yPos, { align: "right" });
      } else {
        doc.text(line, margin, yPos);
      }
      yPos += fontSize * 0.6;
    });
  };

  // Header
  addText(restaurantName, 14, true, "center");
  yPos += 5;
  if (restaurantAddress) {
    addText(restaurantAddress, 8, false, "center");
    yPos += 3;
  }
  if (restaurantPhone) {
    addText(`Phone: ${restaurantPhone}`, 8, false, "center");
    yPos += 3;
  }
  if (restaurantGSTIN) {
    addText(`GSTIN: ${restaurantGSTIN}`, 8, false, "center");
    yPos += 3;
  }
  addText("─".repeat(30), 8, false, "center");
  yPos += 8;

  // Bill Info
  addText(`Bill No: ${bill.billNumber}`, 10, true);
  yPos += 2;
  const billDate = bill.closedAt
    ? new Date(bill.closedAt).toLocaleString("en-IN")
    : new Date(bill.createdAt).toLocaleString("en-IN");
  addText(`Date: ${billDate}`, 8);
  yPos += 2;
  if (bill.table) {
    addText(`Table: ${bill.table.name || "N/A"}`, 8);
    yPos += 2;
  }
  addText("─".repeat(30), 8);
  yPos += 5;

  // Items
  addText("Items", 10, true);
  yPos += 3;
  (bill.items || []).forEach((item) => {
    const name = item.name || (item.menuItem as { name?: string })?.name || "Item";
    const qty = item.quantity ?? 1;
    const price = item.price ?? (item.menuItem as { price?: number })?.price ?? 0;
    const total = item.total ?? price * qty;
    addText(`${name}`, 9, true);
    yPos += 2;
    addText(`${qty} × ₹${price.toFixed(2)} = ₹${total.toFixed(2)}`, 8);
    yPos += 4;
  });
  yPos += 2;
  addText("─".repeat(30), 8);
  yPos += 5;

  // Totals
  addText(`Subtotal:        ₹${bill.subtotal.toFixed(2)}`, 9);
  yPos += 3;
  if ((bill.discount || 0) > 0) {
    addText(`Discount:        -₹${bill.discount!.toFixed(2)}`, 9);
    yPos += 3;
  }
  if ((bill.serviceCharge || 0) > 0) {
    addText(`Service Charge:  ₹${bill.serviceCharge!.toFixed(2)}`, 9);
    yPos += 3;
  }
  addText(`CGST (9%):       ₹${bill.cgst.toFixed(2)}`, 9);
  yPos += 3;
  addText(`SGST (9%):       ₹${bill.sgst.toFixed(2)}`, 9);
  yPos += 3;
  addText("─".repeat(30), 8);
  yPos += 3;
  addText(`TOTAL:           ₹${bill.total.toFixed(2)}`, 11, true);
  yPos += 5;

  // Payment status
  const paid = bill.paidAmount ?? 0;
  const balance = bill.balance ?? bill.total - paid;
  const isPaid = balance <= 0 && paid > 0;
  addText("─".repeat(30), 8);
  yPos += 3;
  addText("Payment", 10, true);
  yPos += 3;
  if (bill.payments && bill.payments.length > 0) {
    const last = bill.payments[bill.payments.length - 1];
    addText(`Paid via: ${last.method}`, 9);
    yPos += 3;
  }
  addText(`Paid:    ₹${paid.toFixed(2)}`, 9);
  yPos += 3;
  addText(`Balance: ₹${balance.toFixed(2)}`, 9);
  yPos += 3;
  addText(`Status:  ${isPaid ? "PAID" : "UNPAID"}`, 9, true);
  yPos += 3;
  addText("─".repeat(30), 8);
  yPos += 3;
  if (bill.payments && bill.payments.length > 1) {
    addText("All payments", 8);
    yPos += 2;
    bill.payments.forEach((payment) => {
      addText(`${payment.method}: ₹${payment.amount.toFixed(2)}`, 8);
      if (payment.reference) {
        addText(`Ref: ${payment.reference}`, 7);
      }
      yPos += 3;
    });
    yPos += 2;
  }

  // Footer
  addText("─".repeat(30), 8);
  yPos += 5;
  addText("Thank you for your visit!", 9, false, "center");
  yPos += 3;
  addText("Visit again soon!", 8, false, "center");

  return doc;
}

export async function downloadInvoice(props: InvoiceGeneratorProps) {
  const doc = await generateInvoicePDF(props);
  doc.save(`Invoice-${props.bill.billNumber}.pdf`);
}

export async function printInvoice(props: InvoiceGeneratorProps) {
  const doc = await generateInvoicePDF(props);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
