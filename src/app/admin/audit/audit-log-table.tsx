"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AuditLog {
  id: string;
  districtId: string;
  userId: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  district: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuditLogTableProps {
  auditLogs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  currentAction?: string;
  currentUserId?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  currentDistrictId?: string;
  availableActions: string[];
  availableUsers: Array<{ id: string; email: string; name: string | null }>;
  availableDistricts: Array<{ id: string; name: string; code: string }>;
  isSuperAdmin: boolean;
}

export default function AuditLogTable({
  auditLogs,
  total,
  page,
  limit,
  currentAction,
  currentUserId,
  currentStartDate,
  currentEndDate,
  currentDistrictId,
  availableActions,
  availableUsers,
  availableDistricts,
  isSuperAdmin,
}: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page on filter change
    router.push(`/admin/audit?${params.toString()}`);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card-glass p-4 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                District
              </label>
              <select
                value={currentDistrictId || ""}
                onChange={(e) => updateFilter("districtId", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Districts</option>
                {availableDistricts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name} ({district.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Action
            </label>
            <select
              value={currentAction || ""}
              onChange={(e) => updateFilter("action", e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Actions</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              User
            </label>
            <select
              value={currentUserId || ""}
              onChange={(e) => updateFilter("userId", e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Users</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={currentStartDate || ""}
              onChange={(e) => updateFilter("startDate", e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={currentEndDate || ""}
              onChange={(e) => updateFilter("endDate", e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-glass overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Date
              </th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  District
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                IP
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {auditLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={isSuperAdmin ? 8 : 7}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  No audit logs found
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-800/50 cursor-pointer"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {formatDate(log.createdAt)}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {log.district.name}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {log.user ? log.user.name || log.user.email : "System"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {log.userRole || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-zinc-500 ml-1">
                          ({log.entityId.substring(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {log.ipAddress || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      <button className="text-amber-400 hover:text-amber-300">
                        {expandedRows.has(log.id) ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(log.id) && (
                    <tr key={`${log.id}-details`}>
                      <td
                        colSpan={isSuperAdmin ? 8 : 7}
                        className="px-4 py-3 bg-zinc-900/50"
                      >
                        <div className="space-y-2">
                          {log.metadata && (
                            <div>
                              <p className="text-xs font-medium text-zinc-400 mb-1">
                                Metadata:
                              </p>
                              <pre className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.userAgent && (
                            <div>
                              <p className="text-xs font-medium text-zinc-400 mb-1">
                                User Agent:
                              </p>
                              <p className="text-xs text-zinc-300">{log.userAgent}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{" "}
            results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, page - 1)));
                router.push(`/admin/audit?${params.toString()}`);
              }}
              disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(totalPages, page + 1)));
                router.push(`/admin/audit?${params.toString()}`);
              }}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

