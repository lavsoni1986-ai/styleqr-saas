"use client";

import { useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, Loader2, CheckCircle } from "lucide-react";

export default function BetaRequestForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    restaurant: "",
    district: "",
    phone: "",
    monthlyOrders: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          ...formData,
          monthlyOrders: formData.monthlyOrders ? parseInt(formData.monthlyOrders, 10) : undefined,
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

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-zinc-100 text-center">
          <div className="inline-flex p-4 bg-amber-100 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Request received</h1>
          <p className="text-zinc-600 mb-8">
            We&apos;ll review your application and be in touch shortly. Manual onboarding only.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-zinc-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500 rounded-2xl">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900">StyleQR</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Request beta access</h1>
          <p className="text-zinc-600 mt-2">
            Limited spots. Manual onboarding. Stripe test mode.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Your name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              disabled={loading}
              className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
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
              className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="restaurant" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Restaurant name
            </label>
            <input
              id="restaurant"
              type="text"
              name="restaurant"
              value={formData.restaurant}
              onChange={handleChange}
              required
              minLength={2}
              disabled={loading}
              className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              placeholder="My Restaurant"
            />
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium text-zinc-700 mb-1.5">
              District / region
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
              className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              placeholder="Downtown"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Phone <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label htmlFor="monthlyOrders" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Estimated monthly orders <span className="text-zinc-400">(optional)</span>
            </label>
            <select
              id="monthlyOrders"
              name="monthlyOrders"
              value={formData.monthlyOrders}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 bg-white"
            >
              <option value="">Select range</option>
              <option value="100">Under 100</option>
              <option value="500">100–500</option>
              <option value="1000">500–1,000</option>
              <option value="2500">1,000–2,500</option>
              <option value="5000">2,500–5,000</option>
              <option value="10000">5,000+</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-zinc-900 text-white font-semibold rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request access"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-600 font-medium hover:text-amber-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
