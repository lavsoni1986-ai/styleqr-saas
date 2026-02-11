/**
 * Design tokens for enterprise homepage.
 * MUST remain pure: static constants only. No React, next/image, or runtime imports.
 * Used by HomePage.tsx — keep this file side-effect free to avoid HMR issues.
 */

export const tokens = {
  colors: {
    bg: "#0B0F14",
    bgSoft: "#11161D",
    card: "#141A22",
    border: "#1F2733",
    accent: "#F59E0B",
    accentSoft: "#FBBF24",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
  spacing: {
    section: "py-32",
    container: "max-w-7xl mx-auto px-8",
    card: "p-8",
    gridGap: "gap-8",
  },
} as const;

/** Framer Motion variants — opacity 0→1, y 20→0, 0.4s. Safe for SSR. */
export const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
} as const;
