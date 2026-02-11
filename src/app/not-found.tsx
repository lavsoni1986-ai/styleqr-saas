import Link from "next/link";

/**
 * Custom 404 Page
 * 
 * Standard not found page.
 * District-specific handling happens in getDistrictFromHost() which returns null for inactive domains.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="card-glass p-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-zinc-300 mb-4">Page Not Found</h2>
          <p className="text-zinc-400 mb-6">
            The page you're looking for doesn't exist.
          </p>
          <Link
            href="/"
            className="inline-block py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
