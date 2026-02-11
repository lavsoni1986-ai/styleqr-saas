import { redirect } from "next/navigation";
import { requireDistrictAdmin } from "@/lib/require-role";
import { getUserDistrict } from "@/lib/auth";
import { prisma } from "@/lib/prisma.server";
import { getPlanFeatures } from "@/lib/feature-gate";
import { PlanType } from "@prisma/client";
import UpgradePageContent from "@/components/upgrade/UpgradePageContent";

export const dynamic = "force-dynamic";

/**
 * Upgrade Page
 * 
 * Shows current plan, plan comparison, and upgrade options.
 * 
 * Security:
 * - Requires DISTRICT_ADMIN authentication
 * - Server-side rendered
 * - No client-side plan logic
 */
export default async function UpgradePage() {
  try {
    const user = await requireDistrictAdmin();
    const district = await getUserDistrict(user.id);

    if (!district) {
      redirect("/login");
    }

    // Get current plan features
    const currentFeatures = getPlanFeatures(district.planType);

    // Define plan details
    const plans = [
      {
        type: PlanType.BASIC,
        name: "Basic",
        price: "$29",
        period: "month",
        features: [
          "Up to 5 restaurants",
          "Basic features",
          "Email support",
        ],
        current: district.planType === PlanType.BASIC,
      },
      {
        type: PlanType.PRO,
        name: "Pro",
        price: "$99",
        period: "month",
        features: [
          "Unlimited restaurants",
          "Analytics dashboard",
          "Audit logs",
          "Priority support",
        ],
        current: district.planType === PlanType.PRO,
      },
      {
        type: PlanType.ENTERPRISE,
        name: "Enterprise",
        price: "Custom",
        period: "month",
        features: [
          "Unlimited restaurants",
          "Analytics dashboard",
          "Audit logs",
          "Custom domain",
          "Dedicated support",
          "Custom integrations",
        ],
        current: district.planType === PlanType.ENTERPRISE,
      },
    ];

    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Upgrade Your Plan</h1>
            <p className="text-zinc-400">
              Choose the plan that best fits your district's needs
            </p>
          </div>

          <UpgradePageContent
            currentPlan={district.planType}
            currentFeatures={currentFeatures}
            subscriptionStatus={district.subscriptionStatus}
            plans={plans}
          />
        </div>
      </div>
    );
  } catch (error) {
    redirect("/login");
  }
}

