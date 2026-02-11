"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { UtensilsCrossed, Loader2 } from "lucide-react";

export default function Signup() {
  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // Sign in with NextAuth to create session
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign in failed. Please try logging in.");
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500 rounded-2xl">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                StyleQR
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
            <p className="text-slate-600 mt-2">Start managing your restaurant</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="restaurantName" className="block text-sm font-medium text-slate-700 mb-2">
                Restaurant Name
              </label>
              <input
                id="restaurantName"
                type="text"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                disabled={loading}
                readOnly={false}
                autoComplete="off"
                required
                minLength={2}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 [color:rgb(17,24,39)] [-webkit-text-fill-color:rgb(17,24,39)] dark:[-webkit-text-fill-color:rgb(243,244,246)]"
                placeholder="My Restaurant"
              />
            </div>

            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-slate-700 mb-2">
                Owner Name
              </label>
              <input
                id="ownerName"
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                disabled={loading}
                readOnly={false}
                autoComplete="off"
                required
                minLength={2}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 [color:rgb(17,24,39)] [-webkit-text-fill-color:rgb(17,24,39)] dark:[-webkit-text-fill-color:rgb(243,244,246)]"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                readOnly={false}
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 [color:rgb(17,24,39)] [-webkit-text-fill-color:rgb(17,24,39)] dark:[-webkit-text-fill-color:rgb(243,244,246)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                readOnly={false}
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 [color:rgb(17,24,39)] [-webkit-text-fill-color:rgb(17,24,39)] dark:[-webkit-text-fill-color:rgb(243,244,246)]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
