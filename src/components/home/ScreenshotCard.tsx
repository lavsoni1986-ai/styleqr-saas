"use client";

import Link from "next/link";
import { QrCode, ChevronRight } from "lucide-react";

/**
 * Dashboard screenshot card. Uses real image when available; falls back to placeholder.
 * Add images to public/screenshots/: dashboard.png, orders.png, billing.png
 */
export function ScreenshotCard({
  label,
  path,
  img,
}: {
  label: string;
  path: string;
  img: string;
}) {
  // Use img with onError for client-side fallback when file missing
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 shadow-lg bg-white">
      <div className="aspect-video bg-zinc-100 relative">
        <img
          src={img}
          alt={`${label} dashboard`}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const placeholder = e.currentTarget.nextElementSibling;
            if (placeholder) (placeholder as HTMLElement).style.display = "flex";
          }}
        />
        <div
          className="absolute inset-0 hidden flex-col items-center justify-center bg-zinc-100"
          style={{ display: "none" }}
        >
          <QrCode className="h-16 w-16 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">{label}</p>
          <p className="text-sm text-zinc-400 mt-1">Add {img} for real screenshot</p>
        </div>
      </div>
      <Link
        href={path}
        className="absolute inset-0 flex items-end justify-center p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <span className="text-white font-medium flex items-center gap-2">
          View {label}
          <ChevronRight className="h-5 w-5" />
        </span>
      </Link>
    </div>
  );
}
