"use client";

import { useState } from "react";
import { PlanType, DistrictSubscriptionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

interface Plan {
  type: PlanType;
  name: string;
  price: string;
  period: string;
  features: string[];
  current: boolean;
}

interface UpgradePageContentProps {
  currentPlan: PlanType;
  currentFeatures: string[];
  subscriptionStatus: DistrictSubscriptionStatus;
  plans: Plan[];
}

export default function UpgradePageContent({
  currentPlan,
  currentFeatures,
  subscriptionStatus,
  plans,
}: UpgradePageContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planType: PlanType) => {
    // Don't allow downgrading or same plan
    if (planType === currentPlan) {
      return;
    }

    // Check if it's actually an upgrade
    const planOrder = { BASIC: 1, PRO: 2, ENTERPRISE: 3 };
    if (planOrder[planType] < planOrder[currentPlan]) {
      setError("Please contact support to downgrade your plan");
      return;
    }

    setLoading(planType);
    setError(null);

    try {
      const response = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payment order");
      }

      if (result.payment_session_id) {
        // Redirect to Cashfree checkout page (Web SDK can also be embedded)
        window.location.href = `https://payments.cashfree.com/merchant/pay?session_id=${result.payment_session_id}`;
      } else {
        throw new Error("No payment session received");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upgrade");
      setLoading(null);
    }
  };

  const getPlanBadge = (plan: Plan) => {
    if (plan.current) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Current Plan
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Current Plan Status */}
      <div className="card-glass p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Current Plan</h2>
        <div className="space-y-2">
          <p className="text-zinc-300">
            <span className="font-medium">Plan:</span> {currentPlan}
          </p>
          <p className="text-zinc-300">
            <span className="font-medium">Status:</span>{" "}
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                subscriptionStatus === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : subscriptionStatus === "SUSPENDED"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {subscriptionStatus}
            </span>
          </p>
          {currentFeatures.length > 0 && (
            <div>
              <p className="font-medium text-zinc-300 mb-2">Your Features:</p>
              <ul className="list-disc list-inside text-zinc-400 space-y-1">
                {currentFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.type}
            className={`card-glass p-6 ${
              plan.current ? "ring-2 ring-amber-500" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-zinc-100">{plan.name}</h3>
              {getPlanBadge(plan)}
            </div>

            <div className="mb-6">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-zinc-100">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className="text-zinc-400 ml-2">/{plan.period}</span>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.type)}
              disabled={plan.current || loading !== null}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                plan.current
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : plan.type === PlanType.ENTERPRISE
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading === plan.type
                ? "Processing..."
                : plan.current
                ? "Current Plan"
                : plan.type === PlanType.ENTERPRISE
                ? "Contact Sales"
                : "Upgrade"}
            </button>
          </div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="card-glass p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Feature</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">Basic</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">Pro</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              <tr>
                <td className="px-4 py-3 text-sm text-zinc-300">Restaurants</td>
                <td className="px-4 py-3 text-sm text-zinc-300 text-center">Up to 5</td>
                <td className="px-4 py-3 text-sm text-zinc-300 text-center">Unlimited</td>
                <td className="px-4 py-3 text-sm text-zinc-300 text-center">Unlimited</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-zinc-300">Analytics Dashboard</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-zinc-500">✗</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-400">✓</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-400">✓</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-zinc-300">Audit Logs</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-zinc-500">✗</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-400">✓</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-400">✓</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-zinc-300">Custom Domain</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-zinc-500">✗</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-zinc-500">✗</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-green-400">✓</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-zinc-300">Support</td>
                <td className="px-4 py-3 text-sm text-zinc-300 text-center">Email</td>
                <td className="px-4 py-3 text-sm text-zinc-300 text-center">Priority</td>
                <td className="px-4 py-3 text-sm text-zinc-300 text-center">Dedicated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

