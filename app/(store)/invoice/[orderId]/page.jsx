import { notFound, redirect } from "next/navigation";
import { findOrderById, findOrderItemsByOrderId } from "../../../../lib/server/repositories/orders.js";
import { findUserById } from "../../../../lib/server/repositories/users.js";
import { getSettingsPublic } from "../../../../lib/server/services/settings.js";
import { ensureInvoiceNumber } from "../../../../lib/server/services/invoices.js";
import { getAccessUserIdFromRsc } from "../../../../lib/server/auth/rsc-session.js";
import InvoicePrintButton from "./InvoicePrintButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice — InfixMart",
  robots: { index: false, follow: false },
};

const ADMIN_ROLES = new Set(["admin", "manager", "support"]);

function inr(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function inrPlain(value) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}

function settingsMap(arr) {
  if (!Array.isArray(arr)) return arr || {};
  return arr.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function numberToWordsInr(num) {
  // Simple Indian-numbering words for invoice "Amount in words" line.
  // Handles 0–999,99,99,999. Returns "Rupees X Y Only".
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function twoDigit(n) {
    n = Math.trunc(n);
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
  }
  function threeDigit(n) {
    return (Math.floor(n / 100) ? a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? twoDigit(n % 100) : "");
  }
  const rounded = Math.round(Number(num || 0) * 100);
  const rupees = Math.floor(rounded / 100);
  const paise = rounded % 100;
  if (rupees === 0 && paise === 0) return "Rupees Zero Only";

  let n = rupees;
  const parts = [];
  if (Math.floor(n / 10000000) > 0) { parts.push(twoDigit(Math.floor(n / 10000000)) + " Crore"); n %= 10000000; }
  if (Math.floor(n / 100000) > 0) { parts.push(twoDigit(Math.floor(n / 100000)) + " Lakh"); n %= 100000; }
  if (Math.floor(n / 1000) > 0) { parts.push(twoDigit(Math.floor(n / 1000)) + " Thousand"); n %= 1000; }
  if (n > 0) parts.push(threeDigit(n));

  let words = "Rupees " + parts.join(" ").trim();
  if (paise > 0) words += " and " + twoDigit(paise) + " Paise";
  return words + " Only";
}

export default async function InvoicePage({ params }) {
  const { orderId } = await params;
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const userId = await getAccessUserIdFromRsc();
  if (!userId) redirect(`/login?redirect=/invoice/${orderId}`);

  const order = await findOrderById(id);
  if (!order) notFound();

  // Auth: order owner OR any admin role can view.
  const viewer = await findUserById(userId);
  const isOwner = Number(order.userId) === Number(userId);
  const isAdmin = viewer && ADMIN_ROLES.has(viewer.role);
  if (!isOwner && !isAdmin) {
    redirect("/my-orders");
  }

  // Lazy-issue an invoice number for older orders that pre-date the feature.
  let invoiceNumber = order.invoiceNumber;
  if (!invoiceNumber) {
    invoiceNumber = await ensureInvoiceNumber(order, { paidAt: order.paidAt });
    if (invoiceNumber) order.invoiceNumber = invoiceNumber;
  }

  const items = await findOrderItemsByOrderId(id);
  const lineItems = items.length
    ? items
    : (Array.isArray(order.items) ? order.items : []);

  const { settings } = await getSettingsPublic();
  const cfg = settingsMap(settings);

  const seller = {
    name:    cfg.gst_seller_name    || cfg.store_name    || process.env.NEXT_PUBLIC_SITE_NAME || "InfixMart Wholesale",
    address: cfg.gst_seller_address || cfg.store_address || "",
    gstin:   cfg.gst_seller_gstin   || "",
    state:   cfg.gst_seller_state   || "Madhya Pradesh",
    email:   cfg.gst_seller_email   || cfg.store_email   || process.env.SUPPORT_EMAIL || "support@infixmart.com",
    phone:   cfg.gst_seller_phone   || cfg.store_phone   || "",
  };
  const defaultHsn = cfg.gst_default_hsn || "9999";
  const gstPercent = Number(order.itemsPrice) > 0
    ? Math.round((Number(order.gstAmount || 0) / Number(order.itemsPrice)) * 1000) / 10
    : Number(cfg.gst_percent || 0);

  // Intra-state vs inter-state determines CGST+SGST vs IGST.
  const ship = order.shippingAddress || {};
  const buyerState = String(ship.state || "").trim();
  const isIntraState = buyerState && seller.state &&
    buyerState.toLowerCase() === String(seller.state).toLowerCase();

  const taxableValue = Number(order.itemsPrice || 0);
  const taxAmount = Number(order.gstAmount || 0);
  const cgst = isIntraState ? taxAmount / 2 : 0;
  const sgst = isIntraState ? taxAmount / 2 : 0;
  const igst = isIntraState ? 0 : taxAmount;
  const halfRate = gstPercent / 2;

  const buyerLine1 = [ship.flatHouse, ship.areaStreet].filter(Boolean).join(", ") || ship.address || "";
  const buyerCity = ship.townCity || ship.city || "";
  const buyerPincode = ship.pincode || ship.postalCode || "";
  const buyer = {
    name: ship.name || ship.fullName || "",
    address: [buyerLine1, ship.landmark, buyerCity, ship.state, buyerPincode]
      .filter(Boolean)
      .join(", "),
    phone: ship.mobile || ship.phone || "",
  };

  const issueDate = order.invoiceNumber ? (order.paidAt || order.createdAt) : new Date();

  return (
    <main className="min-h-screen bg-[#f4f6f9] py-6 sm:py-10 print:bg-white print:py-0">
      <div className="container max-w-3xl">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-[18px] font-[700] text-gray-700">Tax Invoice</h1>
          <InvoicePrintButton />
        </div>

        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 print:shadow-none print:rounded-none print:border-0 print:p-6">
          {/* Header */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
            <div>
              <p className="text-[11px] font-[700] uppercase tracking-wide text-[#1565C0]">Tax Invoice</p>
              <h2 className="text-[18px] sm:text-[20px] font-[800] text-gray-800">{seller.name}</h2>
              {seller.address && <p className="text-[12px] text-gray-500 max-w-xs mt-1 leading-snug">{seller.address}</p>}
              <p className="text-[11px] text-gray-500 mt-1">
                {seller.gstin && <>GSTIN: <strong className="text-gray-700">{seller.gstin}</strong></>}
                {seller.email && <> · {seller.email}</>}
                {seller.phone && <> · {seller.phone}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400">Invoice No.</p>
              <p className="text-[14px] font-[800] text-gray-800">{order.invoiceNumber || "—"}</p>
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mt-2">Invoice Date</p>
              <p className="text-[12px] text-gray-700">{formatDate(issueDate)}</p>
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mt-2">Order Ref.</p>
              <p className="text-[12px] text-gray-700">#{order.id}</p>
            </div>
          </header>

          {/* Buyer */}
          <section className="grid grid-cols-2 gap-6 mt-4 text-[12px]">
            <div>
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mb-1">Bill To</p>
              <p className="text-[13px] font-[700] text-gray-800">{buyer.name || "—"}</p>
              <p className="text-gray-600 leading-snug">{buyer.address || "—"}</p>
              {buyer.phone && <p className="text-gray-500 mt-1">Phone: {buyer.phone}</p>}
            </div>
            <div>
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mb-1">Place of Supply</p>
              <p className="text-gray-700">{buyerState || "—"}</p>
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mt-2 mb-1">Payment Method</p>
              <p className="text-gray-700">{order.paymentMethod}{order.isPaid ? " · Paid" : " · COD"}</p>
            </div>
          </section>

          {/* Line items */}
          <section className="mt-5 -mx-1">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left  px-2 py-2">#</th>
                  <th className="text-left  px-2 py-2">Item</th>
                  <th className="text-left  px-2 py-2">HSN</th>
                  <th className="text-right px-2 py-2">Qty</th>
                  <th className="text-right px-2 py-2">Rate</th>
                  <th className="text-right px-2 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, i) => {
                  const price = Number(it.price || 0);
                  const qty = Number(it.qty || it.quantity || 1);
                  return (
                    <tr key={`${it.productId}-${i}`} className="border-b border-gray-100 align-top">
                      <td className="px-2 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-2 text-gray-800">
                        {it.name || "Product"}
                        {it.variantName && (
                          <span className="block text-[#1565C0] text-[10px] font-[600]">
                            {it.variantName}
                            {it.variantSku && (
                              <span className="text-gray-400 font-[400]"> · {it.variantSku}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-gray-500">{it.hsn || defaultHsn}</td>
                      <td className="px-2 py-2 text-right text-gray-700">{qty}</td>
                      <td className="px-2 py-2 text-right text-gray-700">{inrPlain(price)}</td>
                      <td className="px-2 py-2 text-right font-[600] text-gray-800">{inrPlain(price * qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Tax + totals */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 text-[12px]">
            <div className="text-gray-500 leading-relaxed">
              <p className="text-[11px] font-[700] uppercase tracking-wide text-gray-400 mb-1">Amount in words</p>
              <p className="text-gray-700">{numberToWordsInr(order.totalPrice)}</p>
            </div>
            <div>
              <table className="w-full text-[12px]">
                <tbody>
                  <tr><td className="py-1 text-gray-500">Taxable Value</td><td className="py-1 text-right text-gray-700">{inr(taxableValue)}</td></tr>
                  {Number(order.shippingPrice || 0) > 0 && (
                    <tr><td className="py-1 text-gray-500">Shipping</td><td className="py-1 text-right text-gray-700">{inr(order.shippingPrice)}</td></tr>
                  )}
                  {isIntraState ? (
                    <>
                      <tr><td className="py-1 text-gray-500">CGST {halfRate ? `(${halfRate}%)` : ""}</td><td className="py-1 text-right text-gray-700">{inr(cgst)}</td></tr>
                      <tr><td className="py-1 text-gray-500">SGST {halfRate ? `(${halfRate}%)` : ""}</td><td className="py-1 text-right text-gray-700">{inr(sgst)}</td></tr>
                    </>
                  ) : (
                    <tr><td className="py-1 text-gray-500">IGST {gstPercent ? `(${gstPercent}%)` : ""}</td><td className="py-1 text-right text-gray-700">{inr(igst)}</td></tr>
                  )}
                  <tr className="border-t border-gray-200">
                    <td className="pt-2 font-[800] text-[13px] text-gray-800">Grand Total</td>
                    <td className="pt-2 font-[800] text-[13px] text-right text-[#1565C0]">{inr(order.totalPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed">
            <p>This is a system-generated invoice. No signature required.</p>
            {seller.gstin
              ? <p className="mt-1">For tax-related queries, contact <strong>{seller.email}</strong> with GSTIN {seller.gstin}.</p>
              : <p className="mt-1">Seller GSTIN not configured. Configure it under Admin → Settings to display it on future invoices.</p>}
          </footer>
        </article>
      </div>
    </main>
  );
}
