import Link from "next/link";

const BG = "#0B0F14";
const BORDER = "#1F2733";
const LAV_DIGITAL_URL = "https://lav-digital-site-git-main-lavsoni1986-ais-projects.vercel.app/";

export function GlobalFooter() {
  return (
    <footer
      className="border-t py-8"
      style={{ backgroundColor: BG, borderColor: BORDER }}
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <p className="text-sm text-zinc-500 tracking-wide">
            © {new Date().getFullYear()} StyleQR. All rights reserved.
          </p>
          <p className="text-sm text-zinc-500">
            Digital Partner:{" "}
            <a
              href={LAV_DIGITAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-amber-500 transition-colors"
            >
              LavDigital
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/privacy-policy"
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors tracking-wide"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-and-conditions"
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors tracking-wide"
          >
            Terms & Conditions
          </Link>
          <Link
            href="/refund-policy"
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors tracking-wide"
          >
            Refund Policy
          </Link>
          <Link
            href="/shipping-policy"
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors tracking-wide"
          >
            Shipping Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
