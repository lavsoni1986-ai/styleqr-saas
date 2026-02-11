"use client";

import { useState } from "react";
import Link from "next/link";
import { PlanType } from "@prisma/client";

interface UpsellRecommendation {
  plan: PlanType;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  ctaText: string;
}

interface UpsellBannerProps {
  recommendation: UpsellRecommendation;
}

/**
 * Upsell Banner Component
 * 
 * Displays smart upsell recommendations based on district usage.
 * Server-rendered component.
 * 
 * Security:
 * - No client-side plan evaluation
 * - No sensitive data exposure
 */
export default function UpsellBanner({ recommendation }: UpsellBannerProps) {
  const [isTracking, setIsTracking] = useState(false);

  const handleUpgradeClick = async () => {
    if (isTracking) return;

    try {
      setIsTracking(true);
      // Track upgrade intent (non-blocking)
      await fetch("/api/upgrade-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: recommendation.plan }),
      }).catch(() => {
        // Fail silently - don't block navigation
      });
    } catch (error) {
      // Fail silently - don't block navigation
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-amber-500 border-amber-600";
      case "MEDIUM":
        return "bg-blue-500 border-blue-600";
      case "LOW":
        return "bg-zinc-600 border-zinc-700";
      default:
        return "bg-zinc-600 border-zinc-700";
    }
  };

  const getPlanBadgeColor = (plan: PlanType) => {
    switch (plan) {
      case PlanType.PRO:
        return "bg-purple-100 text-purple-800";
      case PlanType.ENTERPRISE:
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className={`${getPriorityColor(
        recommendation.priority
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(
                recommendation.plan
              )}`}
            >
              {recommendation.plan} Plan
            </span>
          </div>
          <p className="text-white font-medium mb-1">{recommendation.reason}</p>
          <p className="text-white/90 text-sm">
            Unlock more features and scale your business with our {recommendation.plan} plan.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <Link
            href="/upgrade"
            onClick={handleUpgradeClick}
            className="inline-flex items-center px-4 py-2 bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-100 transition-colors shadow-md"
          >
            {recommendation.ctaText}
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
        </div>
      </div>
    </div>
  );
}

