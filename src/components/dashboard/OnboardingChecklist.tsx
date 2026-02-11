"use client";

import Link from "next/link";
import { Check, ChevronRight, UtensilsCrossed, CreditCard, QrCode, ShoppingCart } from "lucide-react";

export interface OnboardingProgress {
  hasMenu: boolean;
  hasPayments: boolean;
  hasQr: boolean;
  hasOrder: boolean;
}

const steps: Array<{
  id: keyof OnboardingProgress;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "hasMenu", label: "Add menu", href: "/dashboard/menu", icon: UtensilsCrossed },
  { id: "hasPayments", label: "Configure payments", href: "/dashboard/settings", icon: CreditCard },
  { id: "hasQr", label: "Create first QR", href: "/dashboard/qr", icon: QrCode },
  { id: "hasOrder", label: "Test first order", href: "/dashboard/orders", icon: ShoppingCart },
];

interface OnboardingChecklistProps {
  progress: OnboardingProgress;
}

export function OnboardingChecklist({ progress }: OnboardingChecklistProps) {
  const completed = Object.values(progress).filter(Boolean).length;
  const allDone = completed === steps.length;

  if (allDone) return null;

  return (
    <div className="mb-8 p-6 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <h2 className="text-lg font-semibold text-zinc-100 mb-2">Setup checklist</h2>
      <p className="text-sm text-zinc-400 mb-4">
        {completed} of {steps.length} complete. Finish setup to start taking orders.
      </p>
      <div className="space-y-3">
        {steps.map(({ id, label, href, icon: Icon }) => {
          const done = progress[id];
          return (
            <Link
              key={id}
              href={href}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                done ? "bg-zinc-800/50 text-zinc-400" : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    done ? "bg-emerald-500/20" : "bg-amber-500/20"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Icon className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <span className={done ? "line-through" : ""}>{label}</span>
              </div>
              {!done && <ChevronRight className="h-4 w-4 text-zinc-500" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
