/**
 * Settlement helpers - upsert daily settlement when payments are finalized
 */

import { prisma } from "@/lib/prisma.server";
import { PaymentMethod } from "@prisma/client";

type PaymentForSettlement = { method: PaymentMethod | string; amount: number; id: string };

/**
 * Map payment method to Settlement column. EMI/CREDIT go to card.
 */
function methodToSettlementField(method: string): "cash" | "upi" | "card" | "wallet" | "qr" | "netbanking" {
  switch (method) {
    case "CASH": return "cash";
    case "UPI": return "upi";
    case "CARD":
    case "EMI":
    case "CREDIT": return "card";
    case "WALLET": return "wallet";
    case "QR": return "qr";
    case "NETBANKING": return "netbanking";
    default: return "card";
  }
}

/** For use inside Prisma.$transaction; accepts tx. */
export type SettlementUpdateClient = { settlement: { update: (args: unknown) => Promise<unknown> } };

/**
 * Remove the given payments from their linked settlements: decrement totalSales, method totals, transactionCount.
 * When incrementRefunds is true (refund flow), also increases settlement.refunds by the same amounts.
 * Only payments with settlementId are adjusted. Use before deleting payments/bill or when refunding.
 * @param db - Prisma or transaction client; when omitted uses prisma
 * @param incrementRefunds - when true, also increment settlement.refunds (use for refunds, not for bill delete)
 */
export async function removePaymentsFromSettlement(
  payments: { id: string; method: string; amount: number; settlementId: string | null }[],
  db?: SettlementUpdateClient,
  incrementRefunds?: boolean
): Promise<void> {
  const withSettlement = payments.filter((p) => p.settlementId != null);
  if (withSettlement.length === 0) return;

  const client = db ?? prisma;
  const bySettlement = new Map<string, { method: string; amount: number }[]>();
  for (const p of withSettlement) {
    const list = bySettlement.get(p.settlementId!) ?? [];
    list.push({ method: p.method, amount: p.amount });
    bySettlement.set(p.settlementId!, list);
  }

  for (const [sid, list] of bySettlement) {
    const dec: Record<string, number> = { cash: 0, upi: 0, card: 0, wallet: 0, qr: 0, netbanking: 0 };
    let totalSales = 0;
    for (const p of list) {
      const f = methodToSettlementField(p.method);
      dec[f] += p.amount;
      totalSales += p.amount;
    }
    const data: Record<string, unknown> = {
      totalSales: { decrement: totalSales },
      cash: { decrement: dec.cash },
      upi: { decrement: dec.upi },
      card: { decrement: dec.card },
      wallet: { decrement: dec.wallet },
      qr: { decrement: dec.qr },
      netbanking: { decrement: dec.netbanking },
      transactionCount: { decrement: list.length },
    };
    if (incrementRefunds) {
      data.refunds = { increment: totalSales };
    }
    await client.settlement.update({
      where: { id: sid },
      data,
    });
  }
}

/**
 * Upsert daily settlement and add the given payments. Links each payment to the settlement.
 * Call this when payments are marked SUCCEEDED (bill close or manual confirm).
 */
export async function upsertSettlementForPayments(
  restaurantId: string,
  payments: PaymentForSettlement[],
  date: Date = new Date()
): Promise<void> {
  if (payments.length === 0) return;

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const increments: Record<string, number> = {
    cash: 0,
    upi: 0,
    card: 0,
    wallet: 0,
    qr: 0,
    netbanking: 0,
  };
  let totalSales = 0;

  for (const p of payments) {
    const field = methodToSettlementField(p.method);
    increments[field] += p.amount;
    totalSales += p.amount;
  }

  const settlement = await prisma.settlement.upsert({
    where: {
      restaurantId_date: { restaurantId, date: day },
    },
    create: {
      restaurantId,
      date: day,
      status: "PENDING",
      totalSales,
      cash: increments.cash,
      upi: increments.upi,
      card: increments.card,
      wallet: increments.wallet,
      qr: increments.qr,
      netbanking: increments.netbanking,
      transactionCount: payments.length,
    },
    update: {
      totalSales: { increment: totalSales },
      cash: { increment: increments.cash },
      upi: { increment: increments.upi },
      card: { increment: increments.card },
      wallet: { increment: increments.wallet },
      qr: { increment: increments.qr },
      netbanking: { increment: increments.netbanking },
      transactionCount: { increment: payments.length },
    },
  });

  // Link payments to this settlement
  await prisma.payment.updateMany({
    where: { id: { in: payments.map((p) => p.id) } },
    data: { settlementId: settlement.id },
  });
}
