"use client";

import {
  FaCheck, FaClock, FaBoxOpen, FaTruck, FaTimes,
  FaUndo, FaPause, FaShieldAlt, FaQuestion,
  FaUserCheck, FaUserSlash, FaPenFancy, FaArchive,
} from "react-icons/fa";

/**
 * Single source of truth for status visual treatment in the admin.
 *
 * Use:
 *   <StatusPill kind="order" value={order.status} />
 *   <StatusPill kind="product" value={product.status} />
 *   <StatusPill kind="user" value={user.status} />
 *   <StatusPill kind="return" value={r.status} />
 *
 * Falls back to a neutral gray pill if `value` is unknown for that kind —
 * never crashes on user-supplied / future status strings.
 */

const ORDER_STATUS = {
  pending:    { label: "Pending",    bg: "bg-gray-100",   text: "text-gray-600",  ring: "ring-gray-200",  icon: FaClock },
  processing: { label: "Processing", bg: "bg-blue-50",    text: "text-blue-700",  ring: "ring-blue-100",  icon: FaBoxOpen },
  shipped:    { label: "Shipped",    bg: "bg-amber-50",   text: "text-amber-700", ring: "ring-amber-100", icon: FaTruck },
  delivered:  { label: "Delivered",  bg: "bg-green-50",   text: "text-green-700", ring: "ring-green-100", icon: FaCheck },
  cancelled:  { label: "Cancelled",  bg: "bg-red-50",     text: "text-red-700",   ring: "ring-red-100",   icon: FaTimes },
  refunded:   { label: "Refunded",   bg: "bg-purple-50",  text: "text-purple-700",ring: "ring-purple-100",icon: FaUndo },
  returned:   { label: "Returned",   bg: "bg-purple-50",  text: "text-purple-700",ring: "ring-purple-100",icon: FaUndo },
};

const PRODUCT_STATUS = {
  active:    { label: "Active",    bg: "bg-green-50",  text: "text-green-700",  ring: "ring-green-100",  icon: FaCheck },
  draft:     { label: "Draft",     bg: "bg-gray-100",  text: "text-gray-600",   ring: "ring-gray-200",   icon: FaPenFancy },
  archived:  { label: "Archived",  bg: "bg-amber-50",  text: "text-amber-700",  ring: "ring-amber-100",  icon: FaArchive },
};

const USER_STATUS = {
  active:    { label: "Active",    bg: "bg-green-50",  text: "text-green-700",  ring: "ring-green-100",  icon: FaUserCheck },
  Suspended: { label: "Suspended", bg: "bg-red-50",    text: "text-red-700",    ring: "ring-red-100",    icon: FaUserSlash },
  suspended: { label: "Suspended", bg: "bg-red-50",    text: "text-red-700",    ring: "ring-red-100",    icon: FaUserSlash },
  deleted:   { label: "Deleted",   bg: "bg-gray-100",  text: "text-gray-500",   ring: "ring-gray-200",   icon: FaUserSlash },
};

const RETURN_STATUS = {
  pending:   { label: "Pending",   bg: "bg-amber-50",  text: "text-amber-700",  ring: "ring-amber-100",  icon: FaClock },
  approved:  { label: "Approved",  bg: "bg-blue-50",   text: "text-blue-700",   ring: "ring-blue-100",   icon: FaShieldAlt },
  rejected:  { label: "Rejected",  bg: "bg-red-50",    text: "text-red-700",    ring: "ring-red-100",    icon: FaTimes },
  completed: { label: "Completed", bg: "bg-green-50",  text: "text-green-700",  ring: "ring-green-100",  icon: FaCheck },
};

const REFUND_STATUS = {
  pending:    { label: "Pending",    bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-100", icon: FaClock },
  processing: { label: "Processing", bg: "bg-blue-50",  text: "text-blue-700",  ring: "ring-blue-100",  icon: FaPause },
  completed:  { label: "Completed",  bg: "bg-green-50", text: "text-green-700", ring: "ring-green-100", icon: FaCheck },
  failed:     { label: "Failed",     bg: "bg-red-50",   text: "text-red-700",   ring: "ring-red-100",   icon: FaTimes },
};

const KIND_TO_MAP = {
  order:   ORDER_STATUS,
  product: PRODUCT_STATUS,
  user:    USER_STATUS,
  return:  RETURN_STATUS,
  refund:  REFUND_STATUS,
};

const FALLBACK = {
  bg: "bg-gray-100",
  text: "text-gray-600",
  ring: "ring-gray-200",
  icon: FaQuestion,
};

const sizeMap = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-0.5 text-[11px] gap-1.5",
  lg: "px-3 py-1 text-[12px] gap-2",
};

const iconSizeMap = { sm: 9, md: 10, lg: 12 };

export default function StatusPill({
  kind = "order",
  value,
  size = "md",
  showIcon = true,
  className = "",
}) {
  const map = KIND_TO_MAP[kind] || ORDER_STATUS;
  const cfg = map[value] || FALLBACK;
  const label = cfg.label || (value ? String(value) : "—");
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center font-[700] capitalize rounded-full ring-1 ${sizeMap[size]} ${cfg.bg} ${cfg.text} ${cfg.ring || "ring-transparent"} ${className}`}
    >
      {showIcon && Icon && (
        <Icon style={{ fontSize: iconSizeMap[size], opacity: 0.85 }} aria-hidden="true" />
      )}
      <span>{label}</span>
    </span>
  );
}

export { ORDER_STATUS, PRODUCT_STATUS, USER_STATUS, RETURN_STATUS, REFUND_STATUS };
