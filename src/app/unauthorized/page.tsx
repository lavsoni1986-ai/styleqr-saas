import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Unauthorized Page (403)
 * 
 * Displayed when user is authenticated but lacks required role/permissions.
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="card-glass p-8">
          <div className="mb-6">
            <div className="inline-flex p-4 rounded-full bg-red-500/20 border border-red-400/30 mb-4">
              <svg
                className="w-12 h-12 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">403</h1>
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">
              Access Forbidden
            </h2>
            <p className="text-zinc-400">
              You don't have permission to access this resource.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/dashboard"
              className="block w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 font-medium rounded-xl transition-colors border border-white/10"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

