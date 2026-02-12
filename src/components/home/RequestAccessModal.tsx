"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { tokens, fadeIn } from "@/lib/home-design-tokens";

const OUTLET_OPTIONS = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "50+", label: "50+" },
] as const;

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RequestAccessModal({ isOpen, onClose }: RequestAccessModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    organizationName: "",
    district: "",
    outletScale: "" as string,
    technicalReadiness: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/beta/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          restaurant: formData.organizationName,
          district: formData.district,
          outletScale: formData.outletScale || null,
          technicalReadiness: formData.technicalReadiness,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setSuccess(false);
    setError("");
    setFormData({
      fullName: "",
      email: "",
      organizationName: "",
      district: "",
      outletScale: "",
      technicalReadiness: false,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-xl"
      style={{ backgroundColor: "rgba(11, 15, 20, 0.85)" }}
      onClick={handleClose}
    >
      <motion.div
        initial={fadeIn.hidden}
        animate={fadeIn.visible}
        transition={fadeIn.transition}
        className="w-full max-w-md max-h-[90vh] rounded-lg border overflow-hidden backdrop-blur-xl flex flex-col"
        style={{
          backgroundColor: tokens.colors.bgSoft,
          borderColor: tokens.colors.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0" style={{ borderColor: tokens.colors.border }}>
          <h2 className="text-lg font-semibold" style={{ color: tokens.colors.textPrimary }}>
            Request Access
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: tokens.colors.textSecondary }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={fadeIn.hidden}
                animate={fadeIn.visible}
                exit={fadeIn.hidden}
                transition={fadeIn.transition}
                className="rounded-lg border p-6 font-mono text-sm"
                style={{
                  backgroundColor: tokens.colors.bg,
                  borderColor: tokens.colors.border,
                }}
              >
                <p className="mb-2">
                  <span style={{ color: tokens.colors.accent }}>&gt; </span>
                  <span style={{ color: tokens.colors.textPrimary }}>INQUIRY_RECEIVED: [OK]</span>
                </p>
                <p className="mb-2">
                  <span style={{ color: tokens.colors.accent }}>&gt; </span>
                  <span style={{ color: tokens.colors.textPrimary }}>DISTRICT_VALIDATION: PENDING</span>
                </p>
                <p
                  className="mt-4 leading-relaxed"
                  style={{ color: tokens.colors.textSecondary }}
                >
                  Our team will contact you within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: tokens.colors.accent,
                    color: tokens.colors.bg,
                  }}
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={fadeIn.hidden}
                animate={fadeIn.visible}
                exit={fadeIn.hidden}
                transition={fadeIn.transition}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {error && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                      border: "1px solid",
                      color: "#FCA5A5",
                    }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    minLength={2}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 text-white placeholder:text-gray-400"
                    style={{
                      backgroundColor: tokens.colors.bg,
                      border: "1px solid #1F2733",
                      color: "#ffffff",
                    }}
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 text-white placeholder:text-gray-400"
                    style={{
                      backgroundColor: tokens.colors.bg,
                      border: "1px solid #1F2733",
                      color: "#ffffff",
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="organizationName"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    Organization Name
                  </label>
                  <input
                    id="organizationName"
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    required
                    minLength={2}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 text-white placeholder:text-gray-400"
                    style={{
                      backgroundColor: tokens.colors.bg,
                      border: "1px solid #1F2733",
                      color: "#ffffff",
                    }}
                    placeholder="Acme Restaurants"
                  />
                </div>

                <div>
                  <label
                    htmlFor="district"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    District / Region of Operation
                  </label>
                  <input
                    id="district"
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    minLength={2}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 text-white placeholder:text-gray-400"
                    style={{
                      backgroundColor: tokens.colors.bg,
                      border: "1px solid #1F2733",
                      color: "#ffffff",
                    }}
                    placeholder="Mumbai Central"
                  />
                </div>

                <div>
                  <label
                    htmlFor="outletScale"
                    className="block text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    Number of Outlets
                  </label>
                  <select
                    id="outletScale"
                    name="outletScale"
                    value={formData.outletScale}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 text-white"
                    style={{
                      backgroundColor: tokens.colors.bg,
                      border: "1px solid #1F2733",
                      color: "#ffffff",
                    }}
                  >
                    <option value="">Select scale</option>
                    {OUTLET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="technicalReadiness"
                    type="checkbox"
                    name="technicalReadiness"
                    checked={formData.technicalReadiness}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-1 h-4 w-4 rounded border-2"
                    style={{
                      accentColor: tokens.colors.accent,
                      borderColor: tokens.colors.border,
                    }}
                  />
                  <label
                    htmlFor="technicalReadiness"
                    className="text-sm leading-relaxed cursor-pointer"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    Existing Digital Infrastructure (POS/Stripe)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: tokens.colors.accent,
                    color: tokens.colors.bg,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
