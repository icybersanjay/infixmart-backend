"use client";

import { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";

/**
 * Branded admin modal with overlay, esc-to-close, body-scroll lock,
 * focus trap (basic), and optional header / footer slots.
 *
 *   <AdminModal open={open} onClose={close} title="Edit category" maxWidth="md">
 *     <div className="space-y-4">…</div>
 *     <AdminModal.Footer>
 *       <AdminButton variant="secondary" onClick={close}>Cancel</AdminButton>
 *       <AdminButton variant="primary" onClick={save}>Save</AdminButton>
 *     </AdminModal.Footer>
 *   </AdminModal>
 *
 * `Footer` is detected as a child to keep call-sites flat. Anything else
 * goes inside the body.
 */

const widthMap = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[96vw]",
};

function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  closeOnOverlay = true,
  hideClose = false,
}) {
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first focusable element inside the dialog.
    const node = dialogRef.current;
    if (node) {
      const focusable = node.querySelector(
        "button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      (focusable || node).focus({ preventScroll: true });
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to the trigger element.
      const last = lastFocusedRef.current;
      if (last && typeof last.focus === "function") {
        try { last.focus({ preventScroll: true }); } catch {}
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  // Split out a Footer child if one was passed.
  const childArray = Array.isArray(children) ? children : [children];
  const footer = childArray.find((c) => c?.type === Footer);
  const body = childArray.filter((c) => c?.type !== Footer);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={() => closeOnOverlay && onClose?.()}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] cursor-default"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 w-full ${widthMap[maxWidth] || widthMap.md} max-h-[92vh] flex flex-col animate-slideUp sm:animate-fadeIn`}
      >
        {/* Mobile drag handle (visual only) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <span className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        {(title || !hideClose) && (
          <header className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100">
            <div className="min-w-0">
              {title && <h2 className="text-[15px] sm:text-[16px] font-[700] text-gray-800">{title}</h2>}
              {description && <p className="text-[12px] text-gray-500 mt-0.5">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0"
              >
                <IoClose className="text-[20px]" />
              </button>
            )}
          </header>
        )}

        {/* Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1">
          {body}
        </div>

        {/* Footer */}
        {footer}
      </div>
    </div>
  );
}

function Footer({ children, className = "" }) {
  return (
    <footer
      className={`px-5 sm:px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex flex-wrap items-center justify-end gap-2 ${className}`}
    >
      {children}
    </footer>
  );
}

AdminModal.Footer = Footer;

export default AdminModal;
