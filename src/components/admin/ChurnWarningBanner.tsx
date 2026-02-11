"use client";

import Link from "next/link";

interface ChurnWarningBannerProps {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}

/**
 * Churn Warning Banner Component
 * 
 * Displays retention warning when district has high churn risk.
 * 
 * Security:
 * - No client-side risk evaluation
 * - Server-provided data only
 */
export default function ChurnWarningBanner({
  riskScore,
  riskLevel,
  reasons,
}: ChurnWarningBannerProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-red-500 border-red-600";
      case "MEDIUM":
        return "bg-yellow-500 border-yellow-600";
      case "LOW":
        return "bg-blue-500 border-blue-600";
      default:
        return "bg-gray-500 border-gray-600";
    }
  };

  return (
    <div
      className={`${getRiskColor(
        riskLevel
      )} border rounded-lg p-4 mb-6 shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-white font-semibold">
              Churn Risk Alert ({riskLevel})
            </span>
            <span className="text-white/80 text-sm">Risk Score: {riskScore}/100</span>
          </div>
          <p className="text-white font-medium mb-2">
            Your activity is dropping. Upgrade support or optimize your operations.
          </p>
          {reasons.length > 0 && (
            <div className="mb-2">
              <p className="text-white/90 text-sm font-medium mb-1">Key Issues:</p>
              <ul className="list-disc list-inside text-white/90 text-sm space-y-1">
                {reasons.slice(0, 3).map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-white/90 text-sm">
            Contact our support team for personalized assistance and retention offers.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
          <Link
            href="/upgrade"
            className="inline-flex items-center px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-100 transition-colors shadow-md"
          >
            View Plans
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <a
            href="mailto:support@styleqr.com"
            className="inline-flex items-center px-4 py-2 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

