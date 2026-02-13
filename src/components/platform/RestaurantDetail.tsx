"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  UtensilsCrossed,
  LayoutGrid,
  Loader2,
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  createdAt: Date;
  owner: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  district: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  } | null;
  subscription: {
    status: string;
    endDate: Date | null;
  } | null;
  _count: {
    categories: number;
    tables: number;
    orders: number;
  };
  categories: Array<{
    id: string;
    name: string;
    _count: { items: number };
  }>;
}

interface RestaurantDetailProps {
  restaurant: Restaurant;
}

const STATUS_OPTIONS = [
  { value: "TRIAL", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export default function RestaurantDetail({ restaurant }: RestaurantDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(
    restaurant.subscription?.status || "TRIAL"
  );
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = e.target.value as (typeof STATUS_OPTIONS)[number]["value"];
    setUpdating(true);
    try {
      const res = await fetch(`/api/platform/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/platform/restaurants"
          className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
          title="Back to Restaurants"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <p className="text-zinc-400 mt-1">Restaurant details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500" />
            Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-400">Owner</span>
              <div className="text-right">
                <p className="text-white">{restaurant.owner.name || "—"}</p>
                <p className="text-sm text-zinc-500">{restaurant.owner.email}</p>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">District</span>
              <span className="text-white">
                {restaurant.district
                  ? `${restaurant.district.name} (${restaurant.district.code})`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Created</span>
              <span className="text-white">
                {new Date(restaurant.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-zinc-400">Status</span>
              <div className="flex items-center gap-2">
                {updating && (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                )}
                <select
                  value={status}
                  onChange={handleStatusChange}
                  disabled={updating}
                  aria-label="Restaurant subscription status"
                  title="Change restaurant status"
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 ${
                    status === "ACTIVE"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : status === "SUSPENDED"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-zinc-600 bg-zinc-800/50 text-zinc-300"
                  }`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-amber-500" />
            Stats
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {restaurant._count.categories}
              </p>
              <p className="text-xs text-zinc-500">Categories</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {restaurant.categories.reduce(
                  (sum, c) => sum + c._count.items,
                  0
                )}
              </p>
              <p className="text-xs text-zinc-500">Menu Items</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-800/50">
              <p className="text-2xl font-bold text-white">
                {restaurant._count.tables}
              </p>
              <p className="text-xs text-zinc-500">Tables</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-amber-500" />
          Menu Categories
        </h2>
        {restaurant.categories.length === 0 ? (
          <p className="text-zinc-500">No categories yet</p>
        ) : (
          <div className="space-y-2">
            {restaurant.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0"
              >
                <span className="text-white">{cat.name}</span>
                <span className="text-zinc-500 text-sm">
                  {cat._count.items} items
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-zinc-500 text-sm">
        Menu is viewable via the restaurant&apos;s QR code. Owner can manage menu
        at Dashboard → Menu.
      </p>
    </div>
  );
}
