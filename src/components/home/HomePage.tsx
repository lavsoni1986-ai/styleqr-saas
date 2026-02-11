"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValue, useTransform } from "framer-motion";
import { QrCode, ArrowRight, ChevronDown, ArrowDown, Receipt, Database, CreditCard, Wallet, MapPin, Phone, Mail } from "lucide-react";
import { tokens, fadeIn } from "@/lib/home-design-tokens";
import { RequestAccessModal } from "./RequestAccessModal";
import { MouseSpotlight } from "./MouseSpotlight";

function Navbar({ onRequestAccess }: { onRequestAccess?: () => void }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setScrolled(v > 20));
    return () => unsub();
  }, [scrollY]);

  const scrollTo = (id: string) => () => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-[#0B0F14]/80 backdrop-blur-xl border-b border-[#1F2733]" : ""
      }`}
    >
      <nav className={`w-full ${tokens.spacing.container} py-3 flex items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2">
          <QrCode className="h-7 w-7" style={{ color: tokens.colors.accent }} />
          <span className="text-lg font-semibold" style={{ color: tokens.colors.textPrimary }}>
            StyleQR
          </span>
        </Link>
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={scrollTo("architecture")}
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: tokens.colors.textSecondary }}
          >
            Platform
          </button>
          <a
            href="#security"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: tokens.colors.textSecondary }}
          >
            Security
          </a>
          <a
            href="#district-os"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: tokens.colors.textSecondary }}
          >
            District OS
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: tokens.colors.textSecondary }}
          >
            Pricing
          </a>
          <a
            href="#contact"
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: tokens.colors.textSecondary }}
          >
            Contact
          </a>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: tokens.colors.textSecondary }}
            >
              Log in
            </Link>
            {onRequestAccess ? (
              <button
                type="button"
                onClick={onRequestAccess}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                style={{
                  backgroundColor: tokens.colors.accent,
                  color: "#0B0F14",
                }}
              >
                Build your district
              </button>
            ) : (
              <Link
                href="/request-access"
                className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                style={{
                  backgroundColor: tokens.colors.accent,
                  color: "#0B0F14",
                }}
              >
                Build your district
              </Link>
            )}
          </div>
        </div>
      </nav>
    </motion.header>
  );
}

function Hero({ onRequestAccess }: { onRequestAccess?: () => void }) {
  return (
    <section
      id="hero"
      className={`${tokens.spacing.section} min-h-screen flex flex-col items-center justify-center pt-24 relative overflow-hidden`}
      style={{ backgroundColor: tokens.colors.bg }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${tokens.colors.border} 1px, transparent 1px),
            linear-gradient(90deg, ${tokens.colors.border} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      {/* Subtle animated mesh gradient / light beam behind headline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 40%, rgba(245, 158, 11, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 60%, rgba(245, 158, 11, 0.04) 0%, transparent 45%),
            radial-gradient(ellipse 50% 30% at 30% 50%, rgba(245, 158, 11, 0.03) 0%, transparent 40%)
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 60% at 50% 30%, rgba(245, 158, 11, 0.04) 0%, transparent 60%)`,
          animation: "hero-beam 8s ease-in-out infinite",
        }}
      />
      <div className={`w-full ${tokens.spacing.container} relative`}>
        <motion.div
          initial={fadeIn.hidden}
          animate={fadeIn.visible}
          transition={fadeIn.transition}
          className="max-w-4xl mx-auto text-center"
        >
          <p
            className="text-sm font-medium uppercase tracking-widest mb-6 flex items-center justify-center gap-2"
            style={{ color: tokens.colors.textSecondary }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: tokens.colors.accent }}
            />
            India&apos;s District Operating System
          </p>
          <h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-8 max-w-4xl mx-auto whitespace-pre-wrap"
            style={{ color: tokens.colors.textPrimary }}
          >
            <span className="block">
              {"Restaurant infrastructure"
                .split(" ")
                .map((word, i, arr) => (
                  <motion.span
                    key={`line1-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                    className={`inline-block ${i < arr.length - 1 ? "mr-2" : ""}`}
                  >
                    {word}{"\u00A0"}
                  </motion.span>
                ))}
            </span>
            <span className="block">
              {"for multi-location operators."
                .split(" ")
                .map((word, i, arr) => (
                  <motion.span
                    key={`line2-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + (3 + i) * 0.05 }}
                    className={`inline-block ${i < arr.length - 1 ? "mr-2" : ""}`}
                  >
                    {word}{"\u00A0"}
                  </motion.span>
                ))}
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
            style={{ color: tokens.colors.textSecondary }}
          >
            One platform to govern districts, restaurants, and partners.
            Control. Compliance. Automated revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onRequestAccess ? (
              <button
                type="button"
                onClick={onRequestAccess}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: tokens.colors.accent,
                  color: "#0B0F14",
                }}
              >
                Build your district
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/request-access"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: tokens.colors.accent,
                  color: "#0B0F14",
                }}
              >
                Build your district
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={() =>
                document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-lg border transition-colors hover:bg-white/5"
              style={{
                borderColor: tokens.colors.border,
                color: tokens.colors.textPrimary,
              }}
            >
              View architecture
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const items = [
    "Manual reconciliation",
    "Cross-outlet confusion",
    "Commission leakage",
  ];

  return (
    <section
      id="problem"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bgSoft }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true }}
        transition={fadeIn.transition}
      >
        <h2
          className="text-2xl font-extrabold tracking-tight mb-12 text-center"
          style={{ color: tokens.colors.textPrimary }}
        >
          Fragmented multi-outlet systems create risk.
        </h2>
        <div className={`grid md:grid-cols-3 ${tokens.spacing.gridGap}`}>
          {items.map((item) => (
            <motion.div
              key={item}
              initial={{ ...fadeIn.hidden, boxShadow: "0 0 8px rgba(245, 158, 11, 0.02)" }}
              whileInView={{
                opacity: 1,
                y: 0,
                boxShadow: "0 0 28px rgba(245, 158, 11, 0.07)",
              }}
              viewport={{ once: true, margin: "-20px" }}
              transition={fadeIn.transition}
              className={`${tokens.spacing.card} rounded-lg border relative`}
              style={{ backgroundColor: tokens.colors.card, borderColor: tokens.colors.border }}
            >
              <span
                className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tokens.colors.accent }}
              />
              <p className="font-medium pr-6" style={{ color: tokens.colors.textPrimary }}>
                {item}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function DistrictOSSection() {
  const points = [
    "A district governs multiple restaurants.",
    "Menus, orders, billing, and revenue share flow through district scope.",
    "Database-level isolation ensures no cross-tenant leakage.",
    "Stripe automates payout distribution.",
  ];

  return (
    <section
      id="district-os"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bg }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true }}
        transition={fadeIn.transition}
        className="max-w-2xl mx-auto"
      >
        <h3
          className="text-xl font-semibold mb-8"
          style={{ color: tokens.colors.textPrimary }}
        >
          What is a District Operating System?
        </h3>
        <ul className="space-y-4">
          {points.map((point) => (
            <li
              key={point}
              className="pl-6 border-l-2"
              style={{ borderColor: tokens.colors.accent, color: tokens.colors.textSecondary }}
            >
              {point}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

const ARCHITECTURE_MODULES = [
  {
    id: "M01",
    title: "District Governance",
    desc: "Multi-tenant hierarchy. Districts own restaurants. Database-scoped queries enforce isolation.",
  },
  {
    id: "M02",
    title: "Restaurant Scope Isolation",
    desc: "Menus, orders, billing, and partners scoped to restaurant. No cross-tenant data leakage.",
  },
  {
    id: "M03",
    title: "Role Hierarchy",
    desc: "SUPER_ADMIN → DISTRICT_ADMIN → RESTAURANT_OWNER. RBAC enforced at API and UI layers.",
  },
  {
    id: "M04",
    title: "Stripe Connect Ledger",
    desc: "Invoice-based idempotency. Transfer verification before marking paid. No manual override.",
  },
  {
    id: "M05",
    title: "Fail-closed Proxy Enforcement",
    desc: "Subscription validation, domain verification, and webhook signatures. Unverified payload rejected.",
  },
] as const;

function ArchitectureCard({ mod }: { mod: (typeof ARCHITECTURE_MODULES)[number] }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [2, -2]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-2, 2]);

  return (
    <motion.div
      initial={{ ...fadeIn.hidden, boxShadow: "0 0 8px rgba(245, 158, 11, 0.03)" }}
      whileInView={{
        ...fadeIn.visible,
        boxShadow: "0 0 36px rgba(245, 158, 11, 0.1)",
      }}
      viewport={{ once: true, margin: "-40px" }}
      transition={fadeIn.transition}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((e.clientX - centerX) / rect.width);
        y.set((e.clientY - centerY) / rect.height);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{
        backgroundColor: tokens.colors.card,
        borderColor: tokens.colors.border,
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
      className="rounded-lg border p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <span
            className="inline-block text-xs font-mono tracking-wider mb-3"
            style={{ color: tokens.colors.accent }}
          >
            {mod.id}
          </span>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: tokens.colors.textPrimary }}
          >
            {mod.title}
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: tokens.colors.textSecondary }}
          >
            {mod.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ArchitectureSection() {
  return (
    <section
      id="architecture"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bgSoft }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
        className="max-w-4xl mx-auto"
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          Platform
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-16"
          style={{ color: tokens.colors.textPrimary }}
        >
          System architecture
        </h2>
        <div className="space-y-4" style={{ perspective: 1000 }}>
          {ARCHITECTURE_MODULES.map((mod) => (
            <ArchitectureCard key={mod.id} mod={mod} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

const REVENUE_FLOW = [
  { label: "Order", icon: Receipt },
  { label: "District Ledger", icon: Database },
  { label: "Stripe Connect", icon: CreditCard },
  { label: "Payout", icon: Wallet },
] as const;

function RevenueAutomationSection() {
  return (
    <section
      id="revenue"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bg }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
        className="max-w-2xl mx-auto"
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          Revenue
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-12"
          style={{ color: tokens.colors.textPrimary }}
        >
          Revenue Automation
        </h2>
        <div className="flex flex-col items-center gap-0">
          {REVENUE_FLOW.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center w-full">
              <motion.div
                initial={{ ...fadeIn.hidden, boxShadow: "0 0 6px rgba(245, 158, 11, 0.02)" }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  boxShadow: "0 0 24px rgba(245, 158, 11, 0.07)",
                }}
                viewport={{ once: true, margin: "-20px" }}
                transition={fadeIn.transition}
                className="flex items-center gap-4 w-full max-w-[280px] rounded-lg border px-6 py-4"
                style={{
                  backgroundColor: tokens.colors.card,
                  borderColor: tokens.colors.border,
                }}
              >
                <step.icon className="h-5 w-5 shrink-0" style={{ color: tokens.colors.accent }} />
                <span className="font-medium" style={{ color: tokens.colors.textPrimary }}>
                  {step.label}
                </span>
              </motion.div>
              {i < REVENUE_FLOW.length - 1 && (
                <div className="py-2 flex justify-center">
                  <ArrowDown className="h-5 w-5" style={{ color: tokens.colors.border }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <motion.div
          initial={{ ...fadeIn.hidden, boxShadow: "0 0 8px rgba(245, 158, 11, 0.02)" }}
          whileInView={{
            opacity: 1,
            y: 0,
            boxShadow: "0 0 32px rgba(245, 158, 11, 0.06)",
          }}
          viewport={{ once: true, margin: "-20px" }}
          transition={fadeIn.transition}
          className="mt-10 rounded-lg border p-6 font-mono text-sm relative"
          style={{
            backgroundColor: tokens.colors.bgSoft,
            borderColor: tokens.colors.border,
            color: tokens.colors.textSecondary,
          }}
        >
          <p className="mb-2">
            <span style={{ color: tokens.colors.accent }}>$ </span>
            Idempotency Keys
          </p>
          <p className="leading-relaxed">
            All revenue operations use idempotency keys to ensure transaction integrity. Duplicate
            requests are rejected at the ledger layer. No duplicate payouts.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

const ROLE_TIERS = [
  {
    role: "SUPER_ADMIN",
    scope: "Platform-wide",
    desc: "Platform control. All districts. Audit access. System configuration.",
  },
  {
    role: "DISTRICT_ADMIN",
    scope: "District scope",
    desc: "District scope. All restaurants in district. Partner management. Settlements.",
  },
  {
    role: "RESTAURANT_OWNER",
    scope: "Restaurant scope",
    desc: "Restaurant scope. Menus, orders, billing. No cross-tenant access.",
  },
] as const;

function RoleHierarchySection() {
  return (
    <section
      id="roles"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bgSoft }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
        className="max-w-4xl mx-auto"
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          RBAC
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-12"
          style={{ color: tokens.colors.textPrimary }}
        >
          Role Hierarchy
        </h2>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: tokens.colors.border }}
        >
          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: tokens.colors.card, borderColor: tokens.colors.border }}>
                <th
                  className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: tokens.colors.textSecondary, borderColor: tokens.colors.border }}
                >
                  Tier
                </th>
                <th
                  className="px-6 py-4 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
                  style={{ color: tokens.colors.textSecondary, borderColor: tokens.colors.border }}
                >
                  Scope
                </th>
                <th
                  className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: tokens.colors.textSecondary, borderColor: tokens.colors.border }}
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLE_TIERS.map((r) => (
                <tr
                  key={r.role}
                  className="border-t"
                  style={{
                    backgroundColor: tokens.colors.card,
                    borderColor: tokens.colors.border,
                  }}
                >
                  <td
                    className="px-6 py-4 font-mono font-semibold text-sm"
                    style={{ color: tokens.colors.textPrimary }}
                  >
                    {r.role}
                  </td>
                  <td
                    className="px-6 py-4 text-sm hidden sm:table-cell"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    {r.scope}
                  </td>
                  <td
                    className="px-6 py-4 text-sm"
                    style={{ color: tokens.colors.textSecondary }}
                  >
                    {r.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}

const PRICING_TIERS = [
  {
    name: "District Starter",
    price: "₹1,999",
    period: "/month",
    currency: "INR",
    features: ["Up to 5 restaurants", "Basic analytics", "Email support"],
  },
  {
    name: "District Pro",
    price: "₹2,999",
    period: "/month",
    currency: "INR",
    features: ["Unlimited restaurants", "Advanced analytics", "Priority support", "Audit logs"],
  },
  {
    name: "District Enterprise",
    price: "₹9,999",
    period: "/month",
    currency: "INR",
    features: ["Everything in Pro", "Custom domain", "Dedicated support", "SLA guarantee"],
  },
] as const;

function PricingSection() {
  return (
    <section
      id="pricing"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bgSoft }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          Pricing
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-12"
          style={{ color: tokens.colors.textPrimary }}
        >
          Simple, transparent pricing
        </h2>
        <div className={`grid md:grid-cols-3 ${tokens.spacing.gridGap}`}>
          {PRICING_TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              initial={{ ...fadeIn.hidden, boxShadow: "0 0 8px rgba(245, 158, 11, 0.03)" }}
              whileInView={{
                opacity: 1,
                y: 0,
                boxShadow: "0 0 30px rgba(245, 158, 11, 0.08)",
              }}
              viewport={{ once: true, margin: "-20px" }}
              transition={fadeIn.transition}
              className="rounded-lg border p-6 sm:p-8 relative"
              style={{
                backgroundColor: tokens.colors.card,
                borderColor: tokens.colors.border,
              }}
            >
              <span
                className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tokens.colors.accent }}
              />
              <h3 className="font-semibold mb-2 pr-6" style={{ color: tokens.colors.textPrimary }}>
                {tier.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold" style={{ color: tokens.colors.accent }}>
                  {tier.price}
                </span>
                <span className="text-sm" style={{ color: tokens.colors.textSecondary }}>
                  {tier.period}
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: tokens.colors.textSecondary }}>
                All prices in INR (₹)
              </p>
              <ul className="space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: tokens.colors.textSecondary }}>
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: tokens.colors.accent }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function ContactSection() {
  return (
    <section
      id="contact"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bg }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
        className="max-w-2xl mx-auto"
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          Contact
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-10"
          style={{ color: tokens.colors.textPrimary }}
        >
          Contact Us
        </h2>
        <div
          className="rounded-lg border p-6 sm:p-8 space-y-6"
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
              <p className="text-sm" style={{ color: tokens.colors.textSecondary }}>
                Housing Board Colony, Shahdol, Madhya Pradesh, 484001
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0" style={{ color: tokens.colors.accent }} />
              <a href="tel:+919753239303" className="text-sm hover:opacity-80 transition-opacity" style={{ color: tokens.colors.textSecondary }}>
                +91 9753239303
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 shrink-0" style={{ color: tokens.colors.accent }} />
              <a href="mailto:lavsoni1986@gmail.com" className="text-sm hover:opacity-80 transition-opacity" style={{ color: tokens.colors.textSecondary }}>
                lavsoni1986@gmail.com
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

const USE_CASES = [
  {
    title: "Tier-2 Operator",
    desc: "5–20 outlets across a city or region. One dashboard. Centralized control over menus, orders, and settlements. Built for scalability without operational sprawl.",
  },
  {
    title: "Franchise Network",
    desc: "Franchisee onboarding with standardized menus and automated royalty flows. District-level control across the network. Scales with your partner base.",
  },
  {
    title: "Multi-brand Group",
    desc: "Different brands, one platform. District-level reporting and partner revenue share. Control and visibility without silos.",
  },
] as const;

function UseCaseSection() {
  return (
    <section
      id="use-cases"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bg }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          The Tiers
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-12"
          style={{ color: tokens.colors.textPrimary }}
        >
          Use cases
        </h2>
        <div className={`grid md:grid-cols-3 ${tokens.spacing.gridGap}`}>
          {USE_CASES.map((uc) => (
            <motion.div
              key={uc.title}
              initial={{ ...fadeIn.hidden, boxShadow: "0 0 8px rgba(245, 158, 11, 0.03)" }}
              whileInView={{
                opacity: 1,
                y: 0,
                boxShadow: "0 0 30px rgba(245, 158, 11, 0.08)",
              }}
              viewport={{ once: true, margin: "-20px" }}
              transition={fadeIn.transition}
              className="rounded-lg border p-6 sm:p-8 relative"
              style={{
                backgroundColor: "#11161D",
                borderColor: "#1F2733",
              }}
            >
              <span
                className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tokens.colors.accent }}
              />
              <h3 className="font-semibold mb-3 pr-6" style={{ color: tokens.colors.textPrimary }}>
                {uc.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                {uc.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

const SECURITY_SPECS = [
  { spec: "Tenant isolation", desc: "Database-level tenant isolation. No cross-tenant queries." },
  { spec: "Secure protocol", desc: "Enterprise-grade encryption. Token validation before any API access." },
  { spec: "Fail-closed proxies", desc: "Subscription validation, domain verification, webhook signatures. Unverified payload rejected." },
] as const;

function SecuritySection() {
  return (
    <section
      id="security"
      className={`${tokens.spacing.section} ${tokens.spacing.container}`}
      style={{ backgroundColor: tokens.colors.bgSoft }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
        className="max-w-2xl mx-auto"
      >
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: tokens.colors.textSecondary }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          Security
        </p>
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-12"
          style={{ color: tokens.colors.textPrimary }}
        >
          Security Guarantees
        </h2>
        <motion.div
          initial={{ ...fadeIn.hidden, boxShadow: "0 0 8px rgba(245, 158, 11, 0.02)" }}
          whileInView={{
            opacity: 1,
            y: 0,
            boxShadow: "0 0 36px rgba(245, 158, 11, 0.08)",
          }}
          viewport={{ once: true, margin: "-20px" }}
          transition={fadeIn.transition}
          className="rounded-lg border p-6 font-mono text-sm"
          style={{
            backgroundColor: "#0B0F14",
            borderColor: tokens.colors.border,
          }}
        >
          <div className="space-y-4">
            {SECURITY_SPECS.map((item) => (
              <div key={item.spec}>
                <p>
                  <span style={{ color: tokens.colors.accent }}>&gt; </span>
                  <span style={{ color: tokens.colors.textPrimary }}>{item.spec}</span>
                </p>
                <p
                  className="pl-4 text-sm leading-relaxed"
                  style={{ color: tokens.colors.textSecondary }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function CTASection({ onRequestAccess }: { onRequestAccess?: () => void }) {
  return (
    <section
      id="cta"
      className={`${tokens.spacing.section} ${tokens.spacing.container} text-center`}
      style={{ backgroundColor: tokens.colors.bg }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true, margin: "-80px" }}
        transition={fadeIn.transition}
        className="max-w-2xl mx-auto"
      >
        <span
          className="inline-flex items-center gap-2 mb-4 px-3 py-1 text-xs font-mono rounded border"
          style={{
            color: tokens.colors.textSecondary,
            borderColor: tokens.colors.border,
          }}
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: tokens.colors.accent }}
          />
          Beta Notice
        </span>
        <h2
          className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6"
          style={{ color: tokens.colors.textPrimary }}
        >
          Build your district network.
        </h2>
        <p
          className="text-base mb-10 leading-relaxed"
          style={{ color: tokens.colors.textSecondary }}
        >
          The infrastructure for regional hospitality governance is here. Currently in private beta for select operators.
        </p>
        {onRequestAccess ? (
          <button
            type="button"
            onClick={onRequestAccess}
            className="inline-flex items-center justify-center gap-2 px-10 py-4 font-semibold rounded-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: tokens.colors.accent,
              color: "#0B0F14",
            }}
          >
            Request Access
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <Link
            href="/request-access"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 font-semibold rounded-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: tokens.colors.accent,
              color: "#0B0F14",
            }}
          >
            Request Access
            <ArrowRight className="h-5 w-5" />
          </Link>
        )}
      </motion.div>
    </section>
  );
}

const FOOTER_COLUMNS = [
  {
    label: "Platform",
    links: [
      { href: "#architecture", label: "Architecture" },
      { href: "#pricing", label: "Pricing" },
      { href: "#revenue", label: "Revenue" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-and-conditions", label: "Terms & Conditions" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/shipping-policy", label: "Shipping Policy" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/contact", label: "Contact Us" },
      { href: "/request-access", label: "Request Access" },
      { href: "/login", label: "Log in" },
    ],
  },
] as const;

function Footer() {
  return (
    <footer
      className={`${tokens.spacing.container} py-20 border-t`}
      style={{ backgroundColor: tokens.colors.bg, borderColor: tokens.colors.border }}
    >
      <motion.div
        initial={fadeIn.hidden}
        whileInView={fadeIn.visible}
        viewport={{ once: true }}
        transition={fadeIn.transition}
        className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-16"
      >
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.label}>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: tokens.colors.textPrimary }}
            >
              {col.label}
            </p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("#") ? (
                    <a
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:opacity-90"
                      style={{ color: tokens.colors.textSecondary }}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:opacity-90"
                      style={{ color: tokens.colors.textSecondary }}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </motion.div>
      <p
        className="text-center text-sm max-w-xl mx-auto"
        style={{ color: tokens.colors.textSecondary }}
      >
        Engineered for regional sovereignty and revenue integrity.
      </p>
    </footer>
  );
}

export function HomePage() {
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const onRequestAccess = () => setRequestModalOpen(true);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: tokens.colors.bg }}>
      <MouseSpotlight />
      <RequestAccessModal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} />
      <Navbar onRequestAccess={onRequestAccess} />
      <main className="relative z-[1]">
        <Hero onRequestAccess={onRequestAccess} />
        <ProblemSection />
        <DistrictOSSection />
        <ArchitectureSection />
        <RevenueAutomationSection />
        <RoleHierarchySection />
        <PricingSection />
        <UseCaseSection />
        <ContactSection />
        <SecuritySection />
        <CTASection onRequestAccess={onRequestAccess} />
        <Footer />
      </main>
    </div>
  );
}
