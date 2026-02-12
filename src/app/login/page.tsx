"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { UtensilsCrossed } from "lucide-react";
import { Role } from "@prisma/client";

function getRedirectForRole(role: string): string {
  if (role === Role.SUPER_ADMIN) return "/platform";
  if (role === Role.DISTRICT_ADMIN) return "/district";
  if (role === Role.WHITE_LABEL_ADMIN || role === Role.PARTNER) return "/partner/dashboard";
  return "/dashboard";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
        return;
      }

      if (!result?.ok) {
        setError("Login failed");
        return;
      }

      // Fetch session to get role for redirect
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const redirectTo = session?.user?.role
        ? getRedirectForRole(session.user.role)
        : "/dashboard";

      window.location.href = redirectTo;
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div className="w-full max-w-md card-glass border border-white/5 rounded-2xl shadow-2xl shadow-black/50 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-400/20 mb-4">
            <UtensilsCrossed className="w-8 h-8 text-amber-400" aria-hidden />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">StyleQR</h1>
          <p className="text-zinc-400 mt-1 text-sm">Sign in to your admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 auth-dark-inputs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5 sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-dark w-full px-4 py-3"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5 sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-dark w-full px-4 py-3"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        </div>
      </div>

      <footer className="relative z-10 py-6 text-center shrink-0">
        <p className="text-sm text-zinc-400">
          Powered by{" "}
          <a
            href="https://lav-digital-site-git-main-lavsoni1986-ais-projects.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-amber-500 transition-colors underline-offset-2 hover:underline"
          >
            LavDigital
          </a>
        </p>
      </footer>
    </div>
  );
}
