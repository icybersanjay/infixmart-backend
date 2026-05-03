"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  locale?: string;
  className?: string;
  tabular?: boolean;
}

/**
 * Smoothly tweens between numeric values when `value` changes.
 *
 * Locale-aware (defaults to en-IN), tweens via rAF, eases with ease-out.
 *   <AnimatedNumber value={total} prefix="₹" />
 */
export default function AnimatedNumber({
  value = 0,
  prefix = "",
  suffix = "",
  duration = 380,
  decimals = 0,
  locale = "en-IN",
  className = "",
  tabular = true,
}: AnimatedNumberProps) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(target);
  const startRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = startRef.current;
    const to = target;
    if (from === to) return;

    if (typeof window !== "undefined") {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        startRef.current = to;
        setDisplay(to);
        return;
      }
    }

    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <span className={`${tabular ? "tabular-nums" : ""} ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
