"use client";

import { forwardRef } from "react";
import Spinner from "../../../_legacy/components/ui/Spinner";

/**
 * Branded button for the admin panel. Variants:
 *   primary     — main CTA (Save, Create, Submit)
 *   secondary   — alternative action (Cancel, Back)
 *   ghost       — quiet (table row actions, "More")
 *   destructive — irreversible (Delete, Archive)
 *   success     — positive confirm (Approve, Mark Delivered)
 *
 * Sizes: sm | md | lg. Default md.
 *
 *   <AdminButton variant="primary" loading={saving}>Save</AdminButton>
 */

const sizeMap = {
  sm: "h-8 px-3 text-[12px] gap-1.5",
  md: "h-10 px-4 text-[13px] gap-2",
  lg: "h-12 px-5 text-[14px] gap-2.5",
};

const variantMap = {
  primary:
    "bg-[#1565C0] text-white border border-[#1565C0] " +
    "hover:bg-[#0D47A1] hover:border-[#0D47A1] " +
    "active:bg-[#0a3a82] " +
    "shadow-sm hover:shadow",
  secondary:
    "bg-white text-gray-700 border border-gray-200 " +
    "hover:border-[#1565C0] hover:text-[#1565C0]",
  ghost:
    "bg-transparent text-gray-600 border border-transparent " +
    "hover:bg-gray-100 hover:text-gray-800",
  destructive:
    "bg-[#E53935] text-white border border-[#E53935] " +
    "hover:bg-[#C62828] hover:border-[#C62828] " +
    "shadow-sm",
  "destructive-soft":
    "bg-red-50 text-[#E53935] border border-red-100 " +
    "hover:bg-red-100 hover:border-red-200",
  success:
    "bg-[#00A651] text-white border border-[#00A651] " +
    "hover:bg-[#007a3d] hover:border-[#007a3d] " +
    "shadow-sm",
};

const baseCls =
  "inline-flex items-center justify-center font-[600] rounded-xl " +
  "transition-colors transition-shadow duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "focus-visible:outline-none";

const AdminButton = forwardRef(function AdminButton(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon = null,
    iconPosition = "left",
    className = "",
    type = "button",
    disabled = false,
    children,
    ...rest
  },
  ref
) {
  const variantCls = variantMap[variant] || variantMap.primary;
  const sizeCls = sizeMap[size] || sizeMap.md;
  const isDisabled = disabled || loading;

  // Spinner colour: brand on transparent buttons, currentColor on filled (which is white).
  const spinnerOnQuiet = variant === "secondary" || variant === "ghost";

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`${baseCls} ${sizeCls} ${variantCls} ${className}`}
      {...rest}
    >
      {loading
        ? <Spinner size={size === "lg" ? 18 : 14} className={spinnerOnQuiet ? "text-[#1565C0]" : "text-white"} />
        : icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
});

export default AdminButton;
