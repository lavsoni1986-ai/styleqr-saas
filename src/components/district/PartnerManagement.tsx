"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, User } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  owner: {
    id: string;
    email: string;
    name?: string | null;
  };
}

interface AvailableUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

interface PartnerManagementProps {
  districtId: string;
  partners: Partner[];
  availableUsers: AvailableUser[];
}

export default function PartnerManagement({
  districtId,
  partners: initialPartners,
  availableUsers,
}: PartnerManagementProps) {
  const [partners, setPartners] = useState(initialPartners);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    commissionRate: "10.0",
    ownerId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingPartner(null);
    setFormData({ name: "", email: "", commissionRate: "10.0", ownerId: "" });
    setShowModal(true);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      email: partner.email,
      commissionRate: partner.commissionRate.toString(),
      ownerId: partner.owner.id,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingPartner
        ? `/api/district/partners/${editingPartner.id}`
        : "/api/district/partners";
      const method = editingPartner ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          districtId,
          commissionRate: parseFloat(formData.commissionRate),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save partner");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save partner");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (partnerId: string) => {
    if (!confirm("Are you sure you want to delete this partner?")) return;

    try {
      const response = await fetch(`/api/district/partners/${partnerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete partner");
      }

      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete partner");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Partner Management</h1>
          <p className="text-slate-600 mt-1">Manage partners in your district</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Partner
        </button>
      </div>

      {/* Partners List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6">
          {partners.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No partners yet</p>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{partner.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{partner.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Owner: {partner.owner.name || partner.owner.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {partner.commissionRate}% Commission
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(partner)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Edit partner"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete partner"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingPartner ? "Edit Partner" : "Create Partner"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Partner Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., ABC Food Services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="partner@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Commission Rate (%) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Partner Owner *
                </label>
                <select
                  required
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select owner...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingPartner ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
