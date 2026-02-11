"use client";

import { useState } from "react";

interface District {
  id: string;
  name: string;
  code: string;
  customDomain: string | null;
  isDomainVerified: boolean;
  verificationCheckedAt: Date | null;
  verificationToken: string | null;
  admin: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface DomainManagementProps {
  districts: District[];
}

export default function DomainManagement({ districts: initialDistricts }: DomainManagementProps) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [txtRecord, setTxtRecord] = useState<{ name: string; value: string } | null>(null);

  const handleAddDomain = async (districtId: string, domain: string) => {
    setLoading(districtId);
    setError(null);
    setSuccess(null);
    setTxtRecord(null);

    try {
      const response = await fetch("/api/platform/domain/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId, customDomain: domain }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add domain");
      }

      setTxtRecord(result.txtRecord);
      setSuccess(result.message);
      
      // Refresh districts
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setLoading(null);
    }
  };

  const handleVerifyDomain = async (districtId: string) => {
    setLoading(districtId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/platform/domain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      setSuccess(result.message);
      
      // Refresh districts
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDistrict && domainInput.trim()) {
      handleAddDomain(editingDistrict.id, domainInput.trim());
      setShowAddModal(false);
      setEditingDistrict(null);
      setDomainInput("");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {txtRecord && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Add this TXT record to your DNS:</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Type:</span> TXT
            </p>
            <p>
              <span className="font-medium">Name:</span> <code className="bg-blue-100 px-2 py-1 rounded">{txtRecord.name}</code>
            </p>
            <p>
              <span className="font-medium">Value:</span> <code className="bg-blue-100 px-2 py-1 rounded break-all">{txtRecord.value}</code>
            </p>
            <p>
              <span className="font-medium">TTL:</span> 3600 (or your DNS provider's default)
            </p>
            <p className="text-blue-700 mt-2">
              After adding the record, wait a few minutes for DNS propagation, then click "Verify Now".
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                District
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custom Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Checked
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {districts.map((district) => (
              <tr key={district.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{district.name}</div>
                    <div className="text-sm text-gray-500">{district.code}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {district.customDomain ? (
                    <code className="text-sm text-gray-900">{district.customDomain}</code>
                  ) : (
                    <span className="text-sm text-gray-400">No domain</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {district.customDomain ? (
                    district.isDomainVerified ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending Verification
                      </span>
                    )
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      No Domain
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {district.verificationCheckedAt
                    ? new Date(district.verificationCheckedAt).toLocaleString()
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {district.customDomain && !district.isDomainVerified && (
                    <button
                      onClick={() => handleVerifyDomain(district.id)}
                      disabled={loading === district.id}
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading === district.id ? "Verifying..." : "Verify Now"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingDistrict(district);
                      setDomainInput(district.customDomain || "");
                      setShowAddModal(true);
                      setTxtRecord(null);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {district.customDomain ? "Update" : "Add Domain"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Update Domain Modal */}
      {showAddModal && editingDistrict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingDistrict.customDomain ? "Update Domain" : "Add Domain"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter domain without protocol (e.g., example.com)
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDistrict(null);
                    setDomainInput("");
                    setTxtRecord(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === editingDistrict.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === editingDistrict.id ? "Adding..." : "Add Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

