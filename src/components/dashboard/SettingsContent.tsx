"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsContent() {
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (res.ok) {
        setRestaurantName(data.restaurantName ?? "");
        setOwnerEmail(data.ownerEmail ?? "");
        setRestaurantId(data.restaurantId ?? "");
      } else {
        setError(data.error ?? "Failed to load settings");
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleSave = async () => {
    const name = restaurantName.trim();
    const email = ownerEmail.trim();

    if (!name) {
      setError("Restaurant name is required");
      return;
    }
    if (!email) {
      setError("Owner email is required");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Invalid email format");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName: name, ownerEmail: email }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Settings updated successfully");
        setRestaurantName(data.restaurantName ?? name);
        setOwnerEmail(data.ownerEmail ?? email);
        await fetchSettings();
      } else {
        setError(data.error ?? "Failed to update settings");
      }
    } catch {
      setError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card-glass p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass p-6">
      <h2 className="text-xl font-semibold text-zinc-100 mb-4">Restaurant Information</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-400/30 rounded-xl text-emerald-300 text-sm">
          {successMessage}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Restaurant Name</label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="input-dark w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Owner Email</label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="input-dark w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Restaurant ID</label>
          <p className="text-zinc-400 font-mono text-sm">{restaurantId || "—"}</p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary-admin px-4 py-2 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}
