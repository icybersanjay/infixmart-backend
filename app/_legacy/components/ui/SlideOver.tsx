"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SIDE_CLS = {
  left: { panel: "left-0", translateClosed: "-translate-x-full", translateOpen: "translate-x-0" },
  right: { panel: "right-0", translateClosed: "translate-x-full", translateOpen: "translate-x-0" },
};

interface SlideOverProps {
  open: boolean;
  onClose?: () => void;
  side?: "left" | "right";
  width?: string;
  className?: string;
  children: ReactNode;
}

// Slide-in panel replacing MUI <Drawer>.
// Side: "left" (default) | "right". Includes backdrop click + ESC + body scroll lock.
export default function SlideOver({
  open,
  onClose,
  side = "left",
  width = "w-[320px]",
  className = "",
  children,
}: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const sideCfg = SIDE_CLS[side] || SIDE_CLS.left;
  const translate = open ? sideCfg.translateOpen : sideCfg.translateClosed;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1300] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute top-0 bottom-0 ${sideCfg.panel} ${width} max-w-[90vw] bg-white shadow-2xl transform transition-transform duration-300 ${translate} ${className}`}
      >
        {children}
      </aside>
    </div>,
    document.body
  );
}
