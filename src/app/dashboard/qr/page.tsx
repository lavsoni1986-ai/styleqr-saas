import { QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma.server";
import { requireAuth, getUserRestaurant } from "@/lib/auth";
import QRGeneratorTables from "@/components/dashboard/QRGeneratorTables";

export const dynamic = "force-dynamic";

export default async function QRGeneratorPage() {
  const user = await requireAuth();
  const restaurant = await getUserRestaurant(user.id);

  if (!restaurant) {
    return (
      <div className="p-6 md:p-8">
        <div className="card-glass p-6">
          <h1 className="text-xl font-bold text-zinc-100">QR Code Generator</h1>
          <p className="text-zinc-400 mt-1">Restaurant not found. Please contact support.</p>
        </div>
      </div>
    );
  }

  const restaurantId = restaurant.id;
  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, qrToken: true },
  });

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/20">
            <QrCode className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">QR Code Generator</h1>
            <p className="text-zinc-400 mt-1">Generate QR codes for your restaurant tables</p>
          </div>
        </div>
      </div>

      <QRGeneratorTables restaurantId={restaurantId} initialTables={tables} />
    </div>
  );
}
