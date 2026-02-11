import Link from "next/link";
import { ShieldAlert } from "lucide-react";

interface DistrictRestrictedStateProps {
  district: {
    name: string;
    code: string;
    subscriptionStatus: string;
    isActive: boolean;
  };
}

/**
 * Fail-closed: shown when subscription is inactive or district is disabled.
 * Prevents access to revenue/order data until subscription is healthy.
 */
export default function DistrictRestrictedState({ district }: DistrictRestrictedStateProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-lg">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <ShieldAlert className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-amber-900">
            Restricted access
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Your district subscription is not active. Revenue and order data are
            unavailable until your subscription is renewed.
          </p>
          <p className="mt-2 text-xs text-amber-700 font-mono">
            Status: {district.subscriptionStatus} | Active: {district.isActive ? "Yes" : "No"}
          </p>
          <Link
            href="/upgrade"
            className="mt-4 inline-block px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Renew subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
