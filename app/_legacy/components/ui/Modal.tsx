"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";

const MAX_WIDTHS = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTHS;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
}

// Portal-based modal replacing MUI <Dialog>/<DialogContent>.
// Supports: ESC to close, backdrop click to close, body scroll lock,
// max-width control, optional initial focus.
export default function Modal({
  open,
  onClose,
  children,
  maxWidth = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = "",
  contentClassName = "",
  ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => dialogRef.current?.focus?.());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, closeOnEscape]);

  if (typeof document === "undefined" || !open) return null;

  const widthCls = MAX_WIDTHS[maxWidth] || MAX_WIDTHS.md;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1300] flex items-center justify-center p-4 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${widthCls} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl outline-none ${contentClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
