import Link from "next/link";
import { getDistrictFromHost } from "@/lib/get-district-from-host";

/**
 * Billing Required Page
 * 
 * Displayed when district subscription is not active.
 * Shows subscription inactive message and payment button.
 * 
 * Security:
 * - Does not expose internal state
 * - Generic error messages
 */
export const dynamic = "force-dynamic";

export default async function BillingRequiredPage() {
  const district = await getDistrictFromHost();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="card-glass p-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-500"
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
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">
              Subscription Required
            </h1>
            <p className="text-zinc-400">
              {district
                ? `This district's subscription is currently inactive. Please activate your subscription to continue using ${district.name}.`
                : "This district's subscription is currently inactive. Please activate your subscription to continue."}
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/upgrade"
              className="inline-block w-full py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
            >
              Activate Subscription
            </Link>

            <Link
              href="mailto:support@stylerqrestaurant.in"
              className="inline-block w-full py-3 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-xl transition-colors"
            >
              Contact Support
            </Link>
          </div>

          <p className="text-sm text-zinc-500 mt-6">
            Need help? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

