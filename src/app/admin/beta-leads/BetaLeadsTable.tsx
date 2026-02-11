"use client";

import { useState, useEffect } from "react";
import {
  Check,
  X,
  UserPlus,
  Loader2,
  RefreshCw,
  Clock,
  Mail,
  Phone,
  Building2,
} from "lucide-react";

type BetaLeadStatus = "PENDING" | "APPROVED" | "REJECTED" | "CONVERTED";

interface BetaLead {
  id: string;
  name: string;
  email: string;
  restaurant: string;
  district: string;
  phone: string | null;
  monthlyOrders: number | null;
  status: BetaLeadStatus;
  notes: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  convertedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<BetaLeadStatus, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  CONVERTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function BetaLeadsTable() {
  const [leads, setLeads] = useState<BetaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [convertModal, setConvertModal] = useState<BetaLead | null>(null);
  const [convertPassword, setConvertPassword] = useState("");
  const [convertNotes, setConvertNotes] = useState("");
  const [rejectModal, setRejectModal] = useState<BetaLead | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/beta-leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setLeads(data.leads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleAction = async (
    leadId: string,
    action: "approve" | "reject" | "convert",
    body?: Record<string, string | undefined>
  ) => {
    setActionLoading(leadId);
    try {
      const res = await fetch(`/api/admin/beta-leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await fetchLeads();
      setConvertModal(null);
      setRejectModal(null);
      setConvertPassword("");
      setConvertNotes("");
      setRejectNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "short" }) : "—";

  if (loading) {
    return (
      <div className="card-glass p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="card-glass overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400 text-sm">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Lead</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Restaurant</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">District</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Est. Orders</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Date</th>
                <th className="text-right p-4 text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    No beta leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-4">
                      <div className="font-medium text-zinc-100">{lead.name}</div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 mt-0.5">
                        <Mail className="h-3.5 w-3.5" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-sm text-zinc-500 mt-0.5">
                          <Phone className="h-3.5 w-3.5" />
                          {lead.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Building2 className="h-4 w-4 text-zinc-500" />
                        {lead.restaurant}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400">{lead.district}</td>
                    <td className="p-4 text-zinc-400">
                      {lead.monthlyOrders != null ? lead.monthlyOrders.toLocaleString() : "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border ${STATUS_COLORS[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(lead.createdAt)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {lead.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(lead.id, "approve")}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === lead.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal(lead)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={() => setConvertModal(lead)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm font-medium disabled:opacity-50"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Convert
                          </button>
                        </div>
                      )}
                      {lead.status === "APPROVED" && (
                        <button
                          onClick={() => setConvertModal(lead)}
                          disabled={!!actionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading === lead.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          Convert
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convert Modal */}
      {convertModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Convert to District + Restaurant</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Creates User, District, Restaurant and Table 1. Sends onboarding email.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Temporary password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={convertPassword}
                  onChange={(e) => setConvertPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  placeholder="Internal notes"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setConvertModal(null);
                  setConvertPassword("");
                  setConvertNotes("");
                }}
                className="flex-1 px-4 py-2.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(convertModal.id, "convert", {
                    password: convertPassword,
                    notes: convertNotes || undefined,
                  })
                }
                disabled={convertPassword.length < 6 || !!actionLoading}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-zinc-900 font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Reject lead</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Decline this beta request. Optionally add a note.
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Notes (optional)
              </label>
              <input
                type="text"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for rejection"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectNotes("");
                }}
                className="flex-1 px-4 py-2.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(rejectModal.id, "reject", { notes: rejectNotes || undefined })
                }
                disabled={!!actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-400 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
