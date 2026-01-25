"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="card-glass p-8 max-w-md text-center">
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Something went wrong</h1>
        <p className="text-zinc-400 text-sm mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="btn-primary-admin"
        >
          Try again
        </button>
        <p className="text-zinc-500 text-xs mt-4">
          <a href="/" className="hover:text-zinc-300">Go to home</a>
          {" · "}
          <a href="/login" className="hover:text-zinc-300">Sign in</a>
        </p>
      </div>
    </div>
  );
}
