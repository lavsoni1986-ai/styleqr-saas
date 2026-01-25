"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";

interface District {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  createdAt: Date;
  admin: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
  };
  _count: {
    partners: number;
    restaurants: number;
    whiteLabels: number;
  };
}

interface AvailableAdmin {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

interface DistrictManagementProps {
  districts: District[];
  availableAdmins: AvailableAdmin[];
}

export default function DistrictManagement({
  districts: initialDistricts,
  availableAdmins,
}: DistrictManagementProps) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [showModal, setShowModal] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    region: "",
    adminId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingDistrict(null);
    setFormData({ name: "", code: "", region: "", adminId: "" });
    setShowModal(true);
  };

  const handleEdit = (district: District) => {
    setEditingDistrict(district);
    setFormData({
      name: district.name,
      code: district.code,
      region: district.region || "",
      adminId: district.admin.id,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingDistrict
        ? `/api/platform/districts/${editingDistrict.id}`
        : "/api/platform/districts";
      const method = editingDistrict ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save district");
      }

      // Refresh page to reload districts
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save district");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (districtId: string) => {
    if (!confirm("Are you sure you want to delete this district?")) return;

    try {
      const response = await fetch(`/api/platform/districts/${districtId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete district");
      }

      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete district");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">District Management</h1>
          <p className="text-slate-600 mt-1">Manage districts and assign admins</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create District
        </button>
      </div>

      {/* Districts List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6">
          {districts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No districts yet</p>
          ) : (
            <div className="space-y-4">
              {districts.map((district) => (
                <div
                  key={district.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <MapPin className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{district.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Code: {district.code} • Region: {district.region || "N/A"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Admin: {district.admin.name || district.admin.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {district._count.partners} Partners
                      </p>
                      <p className="text-sm text-slate-600">
                        {district._count.restaurants} Restaurants
                      </p>
                      <p className="text-sm text-slate-600">
                        {district._count.whiteLabels} White Labels
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(district)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Edit district"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(district.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete district"
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
              {editingDistrict ? "Edit District" : "Create District"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  District Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Delhi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  District Code * (unique, e.g., DELHI)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="DELHI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Region (optional)
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., North"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  District Admin *
                </label>
                <select
                  required
                  value={formData.adminId}
                  onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select admin...</option>
                  {availableAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name || admin.email} ({admin.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingDistrict ? "Update" : "Create"}
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
