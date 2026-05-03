"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaCheckCircle, FaBox, FaTruck, FaShippingFast, FaTimesCircle, FaClock } from "react-icons/fa";
import { MdOutlineSearch, MdReceiptLong } from "react-icons/md";
import { resolveTrackingUrl } from "../../../lib/shared/tracking-url.js";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",   icon: FaClock },
  { key: "processing", label: "Processing",     icon: FaBox },
  { key: "shipped",    label: "Shipped",        icon: FaShippingFast },
  { key: "delivered",  label: "Delivered",      icon: FaCheckCircle },
];

const TERMINAL_NEGATIVE = new Set(["cancelled", "refunded"]);

function statusIndex(status) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}


function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(d);
  }
}

export default function TrackOrderClient() {
  const params = useSearchParams();
  const initialOrderId = params?.get("orderId") || params?.get("id") || "";
  const initialEmail = params?.get("email") || "";

  const [orderId, setOrderId] = useState(initialOrderId);
  const [contact, setContact] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    setOrder(null);
    if (!orderId.trim() || !contact.trim()) {
      setError("Enter your order ID and the email or phone used at checkout.");
      return;
    }
    setLoading(true);
    try {
      const isEmail = contact.includes("@");
      const body = { orderId: orderId.trim() };
      if (isEmail) body.email = contact.trim();
      else body.phone = contact.trim();

      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setError(data?.message || "Order not found.");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  // Auto-submit if both query params are present (from SMS / email links).
  useEffect(() => {
    if (initialOrderId && initialEmail) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="py-8 sm:py-12 bg-[#F5F7FF] min-h-[60vh]">
      <div className="container max-w-3xl">
        <header className="mb-6 sm:mb-8 text-center">
          <h1 className="text-[22px] sm:text-[26px] font-[800] text-gray-800 mb-1">Track your order</h1>
          <p className="text-[13px] text-gray-500">
            Enter your order ID and the email or phone you used at checkout. No login needed.
          </p>
        </header>

        {/* ── Lookup form ── */}
        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.replace(/\D/g, ""))}
              className="h-11 px-4 text-[14px] border border-gray-200 rounded-xl focus:outline-none focus:border-[#1565C0]"
            />
            <input
              type="text"
              autoComplete="email"
              placeholder="Email or 10-digit phone"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="h-11 px-4 text-[14px] border border-gray-200 rounded-xl focus:outline-none focus:border-[#1565C0]"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-5 rounded-xl bg-[#1565C0] text-white text-[13px] font-[700] hover:bg-[#0D47A1] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              <MdOutlineSearch className="text-[18px]" />
              {loading ? "Looking up…" : "Track"}
            </button>
          </div>
          {error && (
            <p className="text-[12px] text-[#E53935] mt-3 font-[500]" role="alert">{error}</p>
          )}
        </form>

        {/* ── Result ── */}
        {order && <OrderStatus order={order} />}

        {/* ── Help ── */}
        <p className="text-[12px] text-gray-400 text-center mt-8">
          Can't find your order ID? Check the order confirmation email or SMS we sent.
          Need help? <Link href="/contact" className="text-[#1565C0] font-[600] hover:underline">Contact support</Link>.
        </p>
      </div>
    </section>
  );
}

function OrderStatus({ order }) {
  const cancelled = TERMINAL_NEGATIVE.has(order.status);
  const currentStep = cancelled ? -1 : statusIndex(order.status);

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400">Order ID</p>
          <h2 className="text-[16px] font-[800] text-gray-800">#{order.id}</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400">Total</p>
          <p className="text-[18px] font-[800] text-[#1565C0]">{formatINR(order.totalPrice)}</p>
          <p className="text-[11px] text-gray-500">{order.paymentMethod}{order.isPaid ? " · Paid" : " · Awaiting payment"}</p>
        </div>
      </header>

      {/* Status timeline */}
      <div className="px-5 py-5 sm:py-6">
        {cancelled ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <FaTimesCircle className="text-[#E53935] text-[20px] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[14px] font-[700] text-[#E53935] capitalize">{order.status}</p>
              {order.cancelReason && (
                <p className="text-[12px] text-red-700/80 truncate">{order.cancelReason}</p>
              )}
              {order.cancelledAt && (
                <p className="text-[11px] text-red-600/70 mt-0.5">{formatDate(order.cancelledAt)}</p>
              )}
            </div>
          </div>
        ) : (
          <ol className="grid grid-cols-4 gap-2 sm:gap-4">
            {STATUS_STEPS.map((step, i) => {
              const Icon = step.icon;
              const reached = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <li key={step.key} className="flex flex-col items-center text-center">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center mb-1.5 transition-colors ${
                      reached
                        ? "border-[#1565C0] bg-[#1565C0] text-white"
                        : "border-gray-200 bg-white text-gray-300"
                    } ${isCurrent ? "ring-4 ring-blue-100" : ""}`}
                  >
                    <Icon className="text-[14px] sm:text-[16px]" />
                  </div>
                  <span className={`text-[10px] sm:text-[12px] font-[600] ${reached ? "text-gray-800" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Tracking info */}
      {(order.trackingNumber || order.courierName || order.trackingUrl) && (() => {
        const trackUrl = resolveTrackingUrl({
          trackingUrl: order.trackingUrl,
          courierName: order.courierName,
          trackingNumber: order.trackingNumber,
        });
        return (
          <div className="px-5 py-4 border-t border-gray-100 bg-blue-50/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]">
            <FaTruck className="text-[#1565C0] text-[16px]" />
            {order.courierName && (
              <span><span className="text-gray-500">Courier:</span> <strong className="text-gray-800">{order.courierName}</strong></span>
            )}
            {order.trackingNumber && (
              <span><span className="text-gray-500">AWB:</span> <strong className="text-gray-800">{order.trackingNumber}</strong></span>
            )}
            {trackUrl && (
              <a
                href={trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1565C0] text-white font-[700] hover:bg-[#0D47A1] transition-colors"
              >
                Track on courier site →
              </a>
            )}
          </div>
        );
      })()}

      {/* Items */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mb-2">Items</p>
        <ul className="divide-y divide-gray-100">
          {order.items.map((it) => (
            <li key={it.productId} className="py-2 flex items-center gap-3">
              {it.image && (
                <img
                  src={it.image}
                  alt={it.name}
                  className="w-10 h-10 object-cover rounded-md border border-gray-100 flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-[500] text-gray-800 line-clamp-1">{it.name}</p>
                <p className="text-[11px] text-gray-400">Qty {it.qty} · {formatINR(it.price)}</p>
              </div>
              <p className="text-[13px] font-[700] text-gray-800 flex-shrink-0">
                {formatINR(it.price * it.qty)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Shipping summary (masked) */}
      {(order.shipping?.city || order.shipping?.pincode) && (
        <div className="px-5 py-3 border-t border-gray-100 text-[12px] text-gray-500 flex items-center gap-2">
          <MdReceiptLong className="text-[16px] text-gray-400" />
          Shipping to {order.shipping.city}{order.shipping.state ? `, ${order.shipping.state}` : ""}{order.shipping.pincode ? ` · ${order.shipping.pincode}` : ""}
        </div>
      )}
    </article>
  );
}
