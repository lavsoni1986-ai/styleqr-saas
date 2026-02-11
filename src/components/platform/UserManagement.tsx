"use client";

import { Users, Mail, Shield, Building2, MapPin } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  restaurant: {
    id: string;
    name: string | null;
  } | null;
  ownedDistrict: {
    id: string;
    name: string;
    code: string;
  } | null;
  ownedPartner: {
    id: string;
    name: string;
  } | null;
}

interface UserManagementProps {
  users: User[];
}

const roleBadgeStyles: Record<string, string> = {
  SUPER_ADMIN: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DISTRICT_ADMIN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  RESTAURANT_ADMIN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  RESTAURANT_OWNER: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PARTNER: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  WHITE_LABEL_ADMIN: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export default function UserManagement({ users }: UserManagementProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-gray-400 mt-1">
          Manage all platform users across districts and restaurants
        </p>
      </div>

      <div className="bg-[#0B0F14] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400">
                  User
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400">
                  Restaurant
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400">
                  District / Partner
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                          <Users className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {u.name || "—"}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                          roleBadgeStyles[u.role] ||
                          "bg-zinc-800 text-gray-400 border-zinc-700"
                        }`}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.restaurant ? (
                        <span className="text-white flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          {u.restaurant.name || u.restaurant.id.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.ownedDistrict ? (
                        <span className="text-white flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          {u.ownedDistrict.name} ({u.ownedDistrict.code})
                        </span>
                      ) : u.ownedPartner ? (
                        <span className="text-white flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          {u.ownedPartner.name}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
