"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Loader2, RefreshCcw, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { ShiftStatus } from "@prisma/client";

interface ShiftsContentProps {
  restaurantId: string;
}

interface Shift {
  id: string;
  status: ShiftStatus;
  openingCash: number;
  expectedCash: number | null;
  actualCash: number | null;
  cashDifference: number | null;
  openedAt: string;
  closedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function ShiftsContent({ restaurantId }: ShiftsContentProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [updating, setUpdating] = useState(false);
  const [openShiftElapsed, setOpenShiftElapsed] = useState<string>("0h");

  useEffect(() => {
    const open = shifts.find((s) => s.status === "OPEN");
    if (!open) {
      setOpenShiftElapsed("0h");
      return;
    }
    const compute = () =>
      setOpenShiftElapsed(
        Math.floor((Date.now() - new Date(open.openedAt).getTime()) / 3600000) + "h"
      );
    compute();
    const t = setInterval(compute, 60000);
    return () => clearInterval(t);
  }, [shifts]);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to load shifts");
        setShifts([]);
        return;
      }
      setShifts(data.shifts || []);
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
    const interval = setInterval(fetchShifts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchShifts]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: parseFloat(openingCash) || 0,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to open shift");
        return;
      }

      setIsOpenModalOpen(false);
      setOpeningCash("0");
      await fetchShifts();
    } catch (err) {
      setError("Failed to open shift");
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;

    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/shifts/${selectedShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualCash: parseFloat(actualCash) || 0,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to close shift");
        return;
      }

      setIsCloseModalOpen(false);
      setSelectedShift(null);
      setActualCash("");
      await fetchShifts();
    } catch (err) {
      setError("Failed to close shift");
    } finally {
      setUpdating(false);
    }
  };

  const openShift = shifts.find((s) => s.status === "OPEN");

  if (loading && shifts.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Shifts</h1>
          <p className="text-slate-600 mt-1">Manage cash drawer and shifts</p>
        </div>
        <div className="flex gap-2">
          {!openShift && (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Open Shift
            </button>
          )}
          <button
            onClick={fetchShifts}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Current Open Shift */}
      {openShift && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-sm font-semibold">
                  OPEN
                </span>
                <span className="text-sm text-slate-600">
                  Opened: {new Date(openShift.openedAt).toLocaleString()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Current Shift</h2>
              <p className="text-sm text-slate-600 mt-1">
                Opened by: {openShift.user.name || openShift.user.email}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedShift(openShift);
                setActualCash(openShift.expectedCash?.toFixed(2) || "");
                setIsCloseModalOpen(true);
              }}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Close Shift
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-sm text-slate-600">Opening Cash</p>
              <p className="text-2xl font-bold text-slate-900">₹{openShift.openingCash.toFixed(2)}</p>
            </div>
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-sm text-slate-600">Expected Cash</p>
              <p className="text-2xl font-bold text-slate-900">
                ₹{openShift.expectedCash?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-sm text-slate-600">Duration</p>
              <p className="text-2xl font-bold text-slate-900">
                {openShiftElapsed}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="space-y-4">
        {shifts.filter((s) => s.status === "CLOSED").map((shift) => (
          <div
            key={shift.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    CLOSED
                  </span>
                  <span className="text-sm text-slate-600">
                    {new Date(shift.openedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Opened: {new Date(shift.openedAt).toLocaleTimeString()} • Closed:{" "}
                  {shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString() : "N/A"}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  By: {shift.user.name || shift.user.email}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-600">Opening Cash</p>
                <p className="text-lg font-bold text-slate-900">₹{shift.openingCash.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Expected Cash</p>
                <p className="text-lg font-bold text-slate-900">
                  ₹{shift.expectedCash?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Actual Cash</p>
                <p className="text-lg font-bold text-slate-900">
                  ₹{shift.actualCash?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Difference</p>
                <p
                  className={`text-lg font-bold ${
                    shift.cashDifference === 0
                      ? "text-green-600"
                      : shift.cashDifference && shift.cashDifference > 0
                      ? "text-blue-600"
                      : "text-red-600"
                  }`}
                >
                  {shift.cashDifference !== null
                    ? shift.cashDifference >= 0
                      ? `+₹${shift.cashDifference.toFixed(2)}`
                      : `-₹${Math.abs(shift.cashDifference).toFixed(2)}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Open Shift Modal */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="dark-theme-inputs bg-[#0B0F14] border border-gray-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Open Shift</h2>
            </div>
            <form onSubmit={handleOpenShift} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Opening Cash (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="input-dark w-full px-4 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount of cash in the drawer at shift start
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpenModalOpen(false);
                    setOpeningCash("0");
                  }}
                  className="flex-1 px-4 py-2 btn-secondary-admin"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 btn-primary-admin disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    "Open Shift"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseModalOpen && selectedShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="dark-theme-inputs bg-[#0B0F14] border border-gray-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Close Shift</h2>
            </div>
            <form onSubmit={handleCloseShift} className="p-6 space-y-4">
              <div className="bg-[#1A1F26] border border-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Opening Cash:</span>
                  <span className="font-semibold text-white">₹{selectedShift.openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected Cash:</span>
                  <span className="font-semibold text-white">
                    ₹{selectedShift.expectedCash?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Actual Cash Count (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="input-dark w-full px-4 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Count the actual cash in the drawer
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCloseModalOpen(false);
                    setSelectedShift(null);
                    setActualCash("");
                  }}
                  className="flex-1 px-4 py-2 btn-secondary-admin"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    "Close Shift"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
