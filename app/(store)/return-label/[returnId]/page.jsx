// Server component — printable return shipping label.
// Pattern mirrors app/(store)/invoice/[orderId]/page.jsx: print-to-PDF via the
// browser, no server-side PDF library (avoids puppeteer/chromium on Hostinger).
// Auth: order owner OR any admin role can view.
import { notFound, redirect } from "next/navigation";
import { findReturnById } from "../../../../lib/server/repositories/returns.js";
import {
  findOrderById,
  findOrderItemsByOrderId,
} from "../../../../lib/server/repositories/orders.js";
import { findUserById } from "../../../../lib/server/repositories/users.js";
import { getSettingsPublic } from "../../../../lib/server/services/settings.js";
import { getAccessUserIdFromRsc } from "../../../../lib/server/auth/rsc-session.js";
import ReturnLabelPrintButton from "./ReturnLabelPrintButton.jsx";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Return Shipping Label — InfixMart",
  robots: { index: false, follow: false },
};

const ADMIN_ROLES = new Set(["admin", "manager", "support"]);
const PRINTABLE_STATUSES = new Set(["approved", "completed"]);

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

export default async function ReturnLabelPage({ params }) {
  const { returnId } = await params;
  const id = Number(returnId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const userId = await getAccessUserIdFromRsc();
  if (!userId) redirect(`/login?redirect=/return-label/${returnId}`);

  const ret = await findReturnById(id);
  if (!ret) notFound();

  const viewer = await findUserById(userId);
  const isOwner = Number(ret.userId) === Number(userId);
  const isAdmin = viewer && ADMIN_ROLES.has(viewer.role);
  if (!isOwner && !isAdmin) {
    redirect("/my-orders");
  }

  // Labels are only meaningful once the return is approved. Block earlier
  // states so customers don't print one and ship before we accept the request.
  if (!PRINTABLE_STATUSES.has(ret.status)) {
    redirect(isAdmin ? "/admin/returns" : "/my-orders");
  }

  const order = await findOrderById(Number(ret.orderId));
  if (!order) notFound();

  const items = await findOrderItemsByOrderId(Number(ret.orderId));
  const lineItems = items.length
    ? items
    : Array.isArray(order.items)
      ? order.items
      : [];

  const { settings } = await getSettingsPublic();
  const cfg = settingsMap(settings);

  // Warehouse address ("To"). Falls back to the GST seller address from
  // settings, then to env, so a fresh install still produces a usable label.
  const warehouseName =
    cfg.return_warehouse_name ||
    cfg.gst_seller_name ||
    cfg.store_name ||
    process.env.NEXT_PUBLIC_SITE_NAME ||
    "InfixMart Wholesale";
  const warehouseAddress =
    cfg.return_warehouse_address ||
    cfg.gst_seller_address ||
    cfg.store_address ||
    "";
  const warehousePhone =
    cfg.return_warehouse_phone ||
    cfg.gst_seller_phone ||
    cfg.store_phone ||
    "";

  // Pickup ("From") — the customer's shipping address, which is also where
  // the courier picks the parcel up from for a return.
  const ship = order.shippingAddress || {};
  const fromName = ship.name || ship.fullName || "—";
  const fromPhone = ship.mobile || ship.phone || "";
  const fromLine1 =
    [ship.flatHouse, ship.areaStreet].filter(Boolean).join(", ") ||
    ship.address ||
    "";
  const fromCity = ship.townCity || ship.city || "";
  const fromState = ship.state || "";
  const fromPincode = ship.pincode || ship.postalCode || "";
  const fromLandmark = ship.landmark || "";

  const refLabel = `RTN-${String(ret.id).padStart(6, "0")}`;

  return (
    <main className="min-h-screen bg-[#f4f6f9] py-6 sm:py-10 print:bg-white print:py-0">
      <div className="container max-w-[680px]">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-[18px] font-[700] text-gray-700">
            Return Shipping Label
          </h1>
          <ReturnLabelPrintButton />
        </div>

        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 print:shadow-none print:rounded-none print:border-0 print:p-6">
          {/* Header band */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b-2 border-dashed border-gray-300">
            <div>
              <p className="text-[11px] font-[700] uppercase tracking-wide text-[#1565C0]">
                Return Shipping Label
              </p>
              <h2 className="text-[20px] font-[800] text-gray-800 mt-1">
                {refLabel}
              </h2>
              <p className="text-[12px] text-gray-500 mt-1">
                Order #{order.id} · Approved {formatDate(ret.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400">
                Issued
              </p>
              <p className="text-[12px] text-gray-700">
                {formatDate(new Date())}
              </p>
              <p className="text-[11px] font-[600] uppercase tracking-wide text-gray-400 mt-2">
                Status
              </p>
              <p className="text-[12px] font-[700] text-emerald-700 uppercase">
                {ret.status}
              </p>
            </div>
          </header>

          {/* Big readable reference for warehouse staff */}
          <section className="mt-5 mb-2 px-4 py-4 bg-gray-50 rounded-lg border border-gray-200 text-center print:bg-white">
            <p className="text-[10px] font-[700] uppercase tracking-widest text-gray-500">
              Quote this reference on the parcel
            </p>
            <p className="text-[28px] font-[800] tracking-[0.2em] text-gray-800 mt-1 font-mono">
              {refLabel}
            </p>
          </section>

          {/* From / To blocks */}
          <section className="grid grid-cols-2 gap-4 mt-5 text-[12px]">
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] font-[700] uppercase tracking-wide text-gray-400 mb-1">
                From (Pickup)
              </p>
              <p className="text-[13px] font-[700] text-gray-800">{fromName}</p>
              <p className="text-gray-700 leading-snug mt-1">
                {fromLine1 || "—"}
                {fromLandmark && (
                  <>
                    <br />
                    Landmark: {fromLandmark}
                  </>
                )}
                <br />
                {[fromCity, fromState].filter(Boolean).join(", ")}
                {fromPincode && (
                  <>
                    {" "}
                    <strong>{fromPincode}</strong>
                  </>
                )}
              </p>
              {fromPhone && (
                <p className="text-gray-600 mt-2 text-[11px]">
                  Phone: {fromPhone}
                </p>
              )}
            </div>

            <div className="border-2 border-[#1565C0] rounded-lg p-3 bg-[#E3F2FD]/30 print:bg-white">
              <p className="text-[10px] font-[700] uppercase tracking-wide text-[#1565C0] mb-1">
                To (Warehouse)
              </p>
              <p className="text-[13px] font-[700] text-gray-800">
                {warehouseName}
              </p>
              <p className="text-gray-700 leading-snug mt-1 whitespace-pre-line">
                {warehouseAddress || "Address not configured"}
              </p>
              {warehousePhone && (
                <p className="text-gray-600 mt-2 text-[11px]">
                  Phone: {warehousePhone}
                </p>
              )}
            </div>
          </section>

          {/* Items being returned */}
          <section className="mt-5">
            <p className="text-[10px] font-[700] uppercase tracking-wide text-gray-400 mb-2">
              Items in this return
            </p>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wide">
                  <th className="text-left px-2 py-1.5">#</th>
                  <th className="text-left px-2 py-1.5">Item</th>
                  <th className="text-right px-2 py-1.5">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-3 text-center text-gray-400 italic"
                    >
                      No items recorded for this order.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((it, i) => {
                    const qty = Number(it.qty || it.quantity || 1);
                    return (
                      <tr
                        key={`${it.productId || i}-${i}`}
                        className="border-b border-gray-100 align-top"
                      >
                        <td className="px-2 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-2 py-2 text-gray-800">
                          {it.name || "Product"}
                          {it.variantName && (
                            <span className="block text-[#1565C0] text-[10px] font-[600]">
                              {it.variantName}
                              {it.variantSku && (
                                <span className="text-gray-400 font-[400]">
                                  {" "}
                                  · {it.variantSku}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-700">
                          {qty}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          {/* Reason + admin note */}
          <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] font-[700] uppercase tracking-wide text-gray-400 mb-1">
                Reason
              </p>
              <p className="text-gray-700 leading-snug">{ret.reason || "—"}</p>
            </div>
            {ret.adminNote && (
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-[700] uppercase tracking-wide text-gray-400 mb-1">
                  Admin Note
                </p>
                <p className="text-gray-700 leading-snug">{ret.adminNote}</p>
              </div>
            )}
          </section>

          {/* Pack-and-ship instructions for the customer */}
          <section className="mt-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed print:bg-white">
            <p className="font-[700] mb-1">Packing instructions</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Pack the items securely in the original packaging.</li>
              <li>
                Cut out and stick this label on the parcel so the{" "}
                <strong>To</strong> address is visible.
              </li>
              <li>
                Write <strong>{refLabel}</strong> clearly on the parcel as a
                backup reference.
              </li>
              <li>
                Hand it to the courier on pickup. Keep a photo of the parcel
                for your records.
              </li>
            </ol>
          </section>

          <footer className="mt-6 pt-3 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed">
            <p>
              This is a system-generated return label. Refunds are processed
              once the warehouse confirms receipt of the items.
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
}
