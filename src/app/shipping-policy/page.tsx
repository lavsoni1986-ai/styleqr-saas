import Link from "next/link";
import { tokens } from "@/lib/home-design-tokens";

export const metadata = {
  title: "Shipping Policy",
  description: "StyleQR Shipping Policy - Delivery of digital software services.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.colors.bg }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="text-sm mb-8 inline-block hover:opacity-80 transition-opacity leading-relaxed"
          style={{ color: tokens.colors.accent }}
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight mb-8" style={{ color: tokens.colors.textPrimary }}>
          Shipping Policy
        </h1>
        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">
          <p>
            Last updated: {new Date().toLocaleDateString("en-IN")}
          </p>
          <section>
            <p className="text-base">
              StyleQR provides digital software services. Access is delivered instantly via email/dashboard
              upon successful payment. No physical shipping is involved.
            </p>
            <p className="mt-4">
              Once your payment is confirmed, you will receive account access credentials and platform
              login details through email. You can access the dashboard immediately at no additional
              delivery charge.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              Contact
            </h2>
            <p>
              For delivery or access issues: lavsoni1986@gmail.com. Phone: +91 9753239303. StyleQR (by Lav
              Kumar Soni), Housing Board Colony, Shahdol, Madhya Pradesh, 484001.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
