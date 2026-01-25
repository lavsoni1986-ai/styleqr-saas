"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Plus, QrCode, Loader2, Download, Trash2 } from "lucide-react";
import { generateQRCode, getTableQRUrl } from "@/lib/qr";
import { Modal } from "@/components/ui/Modal";

interface Table {
  id: string;
  name: string | null;
  qrToken: string;
}

interface QRGeneratorTablesProps {
  restaurantId: string;
  initialTables: Table[];
}

export default function QRGeneratorTables({ restaurantId, initialTables }: QRGeneratorTablesProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const [isCreating, setIsCreating] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateQR = useCallback(async (token: string) => {
    if (qrCodes.has(token)) return qrCodes.get(token)!;

    const url = getTableQRUrl(token);
    const qrDataURL = await generateQRCode(url);
    setQrCodes((prev) => new Map(prev).set(token, qrDataURL));
    return qrDataURL;
  }, [qrCodes]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          name: newTableName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create table");
        return;
      }

      setTables((prev) => [...prev, data.table]);
      setNewTableName("");
      setIsModalOpen(false);
    } catch (err) {
      setError("Failed to create table");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tables/${tableId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to delete table");
        return;
      }

      setTables((prev) => prev.filter((t) => t.id !== tableId));
      setQrCodes((prev) => {
        const next = new Map(prev);
        const table = tables.find((t) => t.id === tableId);
        if (table) next.delete(table.qrToken);
        return next;
      });
    } catch (err) {
      setError("Failed to delete table");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async (token: string, tableName: string) => {
    const qrDataURL = await generateQR(token);
    const link = document.createElement("a");
    link.download = `qr-${tableName || "table"}.png`;
    link.href = qrDataURL;
    link.click();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <p className="text-zinc-400">Manage QR codes for your restaurant tables</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary-admin px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Table
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="card-glass p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">No tables yet</h2>
          <p className="text-zinc-400 mb-6">Create your first table to generate QR codes.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary-admin px-6 py-3"
          >
            Create Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div key={table.id} className="card-glass p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">{table.name || "Unnamed Table"}</h3>
                <div className="flex justify-center mb-4">
                  <div className="w-48 h-48 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                    {qrCodes.has(table.qrToken) ? (
                      <div className="relative w-full h-full p-4">
                        <Image
                          src={qrCodes.get(table.qrToken)!}
                          alt="QR Code"
                          fill
                          className="object-contain"
                          sizes="192px"
                          priority
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => generateQR(table.qrToken)}
                        className="btn-primary-admin px-4 py-2 flex items-center gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        Generate QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadQR(table.qrToken, table.name || "table")}
                  className="flex-1 px-3 py-2 btn-secondary-admin text-sm flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => handleDeleteTable(table.id)}
                  disabled={loading}
                  className="px-3 py-2 bg-red-500/20 text-red-400 text-sm font-semibold rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Table">
        <form onSubmit={handleCreateTable} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Table Name</label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
              placeholder="e.g., Table 1, Window Seat"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 btn-secondary-admin"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 btn-primary-admin disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Table"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
