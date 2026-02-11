import Link from "next/link";
import { tokens } from "@/lib/home-design-tokens";

export const metadata = {
  title: "Terms and Conditions",
  description: "StyleQR Terms and Conditions - Platform usage terms for district operators.",
};

export default function TermsAndConditionsPage() {
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
          Terms and Conditions
        </h1>
        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">
          <p>
            Last updated: {new Date().toLocaleDateString("en-IN")}
          </p>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              1. Legal Status and Acceptance of Terms
            </h2>
            <p>
              StyleQR is currently operating as an Individual Proprietorship under Indian law, managed by
              Lav Kumar Soni.
            </p>
            <p className="mt-4">
              By accessing or using StyleQR&apos;s platform and services, you agree to be bound by these Terms and
              Conditions. If you do not agree, do not use our services.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              2. Service Description
            </h2>
            <p>
              StyleQR provides a SaaS platform for district-level restaurant management, including menu
              management, ordering, billing, settlements, and revenue sharing. Access is granted based on
              your subscription tier and role.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              3. User Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials, ensuring
              accurate data, and complying with applicable laws. You must not misuse the platform, attempt
              unauthorized access, or infringe on others&apos; rights.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              4. Subscription and Payment
            </h2>
            <p>
              Subscription fees are billed in advance. Prices are in INR unless otherwise stated. Failure to
              pay may result in suspension of services. See our Refund Policy for details on cancellations.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              5. Limitation of Liability
            </h2>
            <p>
              StyleQR provides services &quot;as is.&quot; We are not liable for indirect, incidental, or
              consequential damages arising from use of the platform. Our liability is limited to the
              amount paid by you in the twelve months preceding the claim.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: tokens.colors.textPrimary }}>
              6. Jurisdiction and Contact
            </h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
              jurisdiction of the courts at Shahdol, Madhya Pradesh.
            </p>
            <p className="mt-4">
              For questions: lavsoni1986@gmail.com. StyleQR (by Lav Kumar Soni), Housing Board Colony,
              Shahdol, Madhya Pradesh, 484001. Phone: +91 9753239303.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
