import { notFound } from "next/navigation";
import OrderTrackingClient from "./OrderTrackingClient";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    notFound();
  }

  return <OrderTrackingClient orderId={orderId.trim()} />;
}
