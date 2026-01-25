import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="p-5 bg-red-100 rounded-full w-fit mx-auto mb-6">
          <ShieldAlert className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Access Forbidden</h2>
        <p className="text-slate-600 mb-8">
          You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
