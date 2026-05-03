"use client";

import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

interface DropdownMenuProps {
  open: boolean;
  onClose?: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  align?: "start" | "end";
  offsetY?: number;
  className?: string;
  children: ReactNode;
}

// Click-outside dropdown replacing MUI <Menu>/<MenuItem>.
export default function DropdownMenu({
  open,
  onClose,
  anchorRef,
  align = "end",
  offsetY = 8,
  className = "",
  children,
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      const target = e.target as Node;
      if (menuRef.current.contains(target)) return;
      if (anchorRef?.current && anchorRef.current.contains(target)) return;
      onClose?.();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const rect = anchorRef?.current?.getBoundingClientRect();
  const style: CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.bottom + offsetY,
        left: align === "end" ? "auto" : rect.left,
        right: align === "end" ? Math.max(8, window.innerWidth - rect.right) : "auto",
        minWidth: rect.width,
      }
    : { position: "fixed", top: 60, right: 8 };

  return (
    <div
      ref={menuRef}
      style={style}
      role="menu"
      className={`z-[1200] bg-white rounded-xl shadow-xl border border-gray-100 py-1 ${className}`}
    >
      {children}
    </div>
  );
}

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function MenuItem({ onClick, children, className = "", ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-blue-50 hover:text-[#1565C0] transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
