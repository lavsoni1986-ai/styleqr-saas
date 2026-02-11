import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { tokens } from "@/lib/home-design-tokens";

export const metadata = {
  title: "Contact Us",
  description: "StyleQR Contact - Business details and how to reach us.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.colors.bg }}>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="text-sm mb-8 inline-block hover:opacity-80 transition-opacity leading-relaxed"
          style={{ color: tokens.colors.accent }}
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: tokens.colors.textPrimary }}>
          Contact Us
        </h1>
        <p className="text-sm mb-10" style={{ color: tokens.colors.textSecondary }}>
          Reach out to us for support, partnerships, or general inquiries.
        </p>
        <div
          className="rounded-lg border p-8 space-y-6"
          style={{
            backgroundColor: tokens.colors.card,
            borderColor: tokens.colors.border,
          }}
        >
          <p className="font-semibold text-lg" style={{ color: tokens.colors.textPrimary }}>
            StyleQR (by Lav Kumar Soni)
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5" style={{ color: tokens.colors.accent }} />
              <p className="text-sm leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                Housing Board Colony, Shahdol, Madhya Pradesh, 484001
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0" style={{ color: tokens.colors.accent }} />
              <a href="tel:+919753239303" className="text-sm hover:opacity-80 transition-opacity leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                +91 9753239303
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 shrink-0" style={{ color: tokens.colors.accent }} />
              <a href="mailto:lavsoni1986@gmail.com" className="text-sm hover:opacity-80 transition-opacity leading-relaxed" style={{ color: tokens.colors.accent }}>
                lavsoni1986@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
