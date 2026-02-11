"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Amber radial gradient follows cursor at 5% opacity.
 * Very subtle spotlight effect for depth.
 */
export function MouseSpotlight() {
  const [mounted, setMounted] = useState(false);
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const springConfig = { damping: 30, stiffness: 100 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);
  const left = useTransform(xSpring, (v) => `${v}px`);
  const top = useTransform(ySpring, (v) => `${v}px`);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const handleMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mounted, x, y]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[10] overflow-hidden" aria-hidden>
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          left,
          top,
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
