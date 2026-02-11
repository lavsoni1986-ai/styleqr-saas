import Link from "next/link";
import { tokens } from "@/lib/home-design-tokens";

export const metadata = {
  title: "Privacy Policy",
  description: "StyleQR Privacy Policy - How we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">
          <p>
            Last updated: {new Date().toLocaleDateString("en-IN")}
          </p>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              1. Information We Collect
            </h2>
            <p>
              StyleQR collects information you provide directly, including name, email address, phone number,
              restaurant and business details, and payment information when you subscribe to our services.
              We also collect usage data, device information, and logs when you access our platform.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              2. How We Use Your Information
            </h2>
            <p>
              We use your information to provide, maintain, and improve our services; process transactions;
              send administrative communications; detect and prevent fraud; and comply with legal obligations.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              3. Data Sharing and Disclosure
            </h2>
            <p>
              We do not sell your personal information. We may share data with service providers (e.g., payment
              processors, hosting) who assist our operations under strict confidentiality. We may disclose
              information when required by law or to protect our rights.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              4. Data Security
            </h2>
            <p>
              We implement industry-standard security measures including encryption, access controls, and
              regular audits to protect your data against unauthorized access, alteration, or destruction.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              5. Your Rights
            </h2>
            <p>
              You may access, correct, or delete your personal data. You may also withdraw consent or
              object to processing where applicable. Contact us at lavsoni1986@gmail.com to exercise these rights.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              6. Contact
            </h2>
            <p>
              For privacy-related inquiries: lavsoni1986@gmail.com. Phone: +91 9753239303. StyleQR (by Lav Kumar
              Soni), Housing Board Colony, Shahdol, Madhya Pradesh, 484001.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
