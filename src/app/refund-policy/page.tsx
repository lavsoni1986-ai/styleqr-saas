import Link from "next/link";
import { tokens } from "@/lib/home-design-tokens";

export const metadata = {
  title: "Refund Policy",
  description: "StyleQR Refund Policy - Policy for digital SaaS subscriptions.",
};

export default function RefundPolicyPage() {
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
          Refund Policy
        </h1>
        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">
          <p>
            Last updated: {new Date().toLocaleDateString("en-IN")}
          </p>
          <section>
            <p className="text-base">
              This is a non-refundable SaaS subscription unless mandated by law. Access to the digital
              infrastructure is provided immediately upon payment.
            </p>
            <p className="mt-4">
              StyleQR provides software-as-a-service (SaaS) access. Upon successful payment, you receive
              immediate access to the platform. Due to the digital nature of the service, we do not offer
              refunds once an order has been placed and payment has been processed, except where required
              by applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              Contact
            </h2>
            <p>
              For exceptional circumstances or billing inquiries: lavsoni1986@gmail.com. Phone: +91 9753239303.
              StyleQR (by Lav Kumar Soni), Housing Board Colony, Shahdol, Madhya Pradesh, 484001.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
