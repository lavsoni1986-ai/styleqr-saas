"use client";

import { useState } from "react";
import { Star, X, Loader2, CheckCircle } from "lucide-react";

interface NpsBannerProps {
  show: boolean;
}

export function NpsBanner({ show }: NpsBannerProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed || submitted) return null;

  const handleSubmit = async () => {
    if (score === null) return;
    setLoading(true);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) setSubmitted(true);
      else setComment(data.error || "Failed to submit");
    } catch {
      setComment("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mb-8 p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
        <CheckCircle className="h-8 w-8 text-emerald-400 flex-shrink-0" />
        <p className="text-emerald-200 font-medium">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="mb-8 p-6 rounded-xl bg-zinc-800/80 border border-zinc-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">
            How likely are you to recommend StyleQR?
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Your feedback helps us improve. (0 = not likely, 10 = very likely)
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`w-10 h-10 rounded-lg font-semibold text-sm transition-colors ${
                  score === n
                    ? "bg-amber-500 text-zinc-900"
                    : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Optional comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What could we improve?"
              rows={2}
              className="w-full max-w-md px-4 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={score === null || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-900 font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star className="h-4 w-4" />
            )}
            Submit feedback
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-2 text-zinc-500 hover:text-zinc-400 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
