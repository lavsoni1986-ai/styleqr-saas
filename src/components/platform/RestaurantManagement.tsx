"use client";

import Link from "next/link";
import {
  Plus,
  Building2,
  User,
  MapPin,
  Calendar,
  Edit,
  UtensilsCrossed,
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  createdAt: Date;
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
  district: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  } | null;
  subscription: {
    status: string;
  } | null;
  _count: {
    categories: number;
    tables: number;
  };
}

interface RestaurantManagementProps {
  restaurants: Restaurant[];
}

export default function RestaurantManagement({
  restaurants,
}: RestaurantManagementProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurants</h1>
          <p className="text-zinc-400 mt-1">
            Manage all restaurants across the platform
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Restaurant
        </Link>
      </div>

      <div className="bg-[#0B0F14] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">
                  Restaurant Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">
                  Owner
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">
                  District
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">
                  Created Date
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {restaurants.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    No restaurants found
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                          <Building2 className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{r.name}</p>
                          <p className="text-xs text-zinc-500">
                            {r._count.categories} categories · {r._count.tables}{" "}
                            tables
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="text-white">
                            {r.owner.name || "—"}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {r.owner.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.district ? (
                        <span className="flex items-center gap-2 text-white">
                          <MapPin className="h-4 w-4 text-zinc-500" />
                          {r.district.name} ({r.district.code})
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-zinc-400 text-sm">
                        <Calendar className="h-4 w-4" />
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/restaurants/${r.id}`}
                        title="Click to change status"
                        className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-80 ${
                          r.subscription?.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : r.district?.isActive === false
                              ? "bg-zinc-500/20 text-zinc-400 border border-zinc-600"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {r.subscription?.status === "ACTIVE"
                          ? "Active"
                          : r.district?.isActive === false
                            ? "Inactive"
                            : "Pending"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/platform/restaurants/${r.id}`}
                          className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-amber-500 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/platform/restaurants/${r.id}`}
                          className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-amber-500 transition-colors"
                          title="View Menu"
                        >
                          <UtensilsCrossed className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
