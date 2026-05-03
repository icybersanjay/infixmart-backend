"use client";

import React, { useEffect, useState } from 'react';
import AccountSidebar from '../../../_legacy/components/AccountSidebar';
import AccountMobileNav from '../../../_legacy/components/AccountMobileNav';
import { LuClipboardCheck } from 'react-icons/lu';
import EmptyState from '../../../_legacy/components/EmptyState';
import { FaAngleDown, FaAngleUp, FaUndo, FaCheck, FaPrint } from 'react-icons/fa';
import Link from 'next/link';
import { MdReceiptLong } from 'react-icons/md';
import { MdLocalShipping, MdCheckCircle, MdInventory, MdCancel, MdOpenInNew } from 'react-icons/md';
import { getData, postData } from '../../../_legacy/utils/api';
import { imgUrl } from '../../../_legacy/utils/imageUrl';
import OrderCardSkeleton from '../../../_legacy/components/skeletons/OrderCardSkeleton';
import Invoice from '../../../_legacy/components/Invoice';
import toast from 'react-hot-toast';

const statusConfig = {
  pending:    { label: 'Pending',    cls: 'bg-gray-100 text-gray-600' },
  processing: { label: 'Processing', cls: 'bg-[#1565C0] text-white' },
  shipped:    { label: 'Shipped',    cls: 'border border-[#1565C0] text-[#1565C0] bg-white' },
  delivered:  { label: 'Delivered',  cls: 'bg-[#00A651] text-white' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-100 text-red-600' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`text-[11px] font-[600] px-3 py-1 rounded-full capitalize inline-block ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const TIMELINE_STEPS = [
  { key: 'pending',    label: 'Ordered',    icon: MdInventory },
  { key: 'processing', label: 'Processing', icon: MdInventory },
  { key: 'shipped',    label: 'Shipped',    icon: MdLocalShipping },
  { key: 'delivered',  label: 'Delivered',  icon: MdCheckCircle },
];

const stepIndex = { pending: 0, processing: 1, shipped: 2, delivered: 3 };

const OrderTimeline = ({ status, createdAt }) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 border border-red-100 rounded-xl mb-4">
        <MdCancel className="text-red-500 text-[20px] flex-shrink-0" />
        <div>
          <p className="text-[13px] font-[700] text-red-600">Order Cancelled</p>
          <p className="text-[11px] text-red-400 mt-0.5">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const current = stepIndex[status] ?? 0;

  return (
    <div className="mb-4 bg-[#F0F6FF] rounded-xl px-4 py-4 border border-[#DBEAFE]">
      <p className="text-[11px] font-[700] text-[#1565C0] uppercase tracking-wider mb-3">Order Progress</p>
      <div className="relative flex items-start justify-between">
        {/* Connecting line behind the circles */}
        <div className="absolute top-[18px] left-0 right-0 h-[2px] bg-gray-200 z-0 mx-[calc(12.5%)] hidden sm:block" />
        <div
          className="absolute top-[18px] left-0 h-[2px] bg-[#1565C0] z-0 mx-[calc(12.5%)] hidden sm:block transition-all duration-500"
          style={{ right: `calc(${(3 - current) * 25}% + 12.5%)` }}
        />

        {TIMELINE_STEPS.map((step, idx) => {
          const done = idx < current;
          const active = idx === current;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative flex flex-col items-center flex-1 z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${done
                    ? 'bg-[#1565C0] border-[#1565C0]'
                    : active
                    ? 'bg-white border-[#1565C0] shadow-md shadow-blue-100'
                    : 'bg-white border-gray-300'
                  }`}
              >
                {done ? (
                  <FaCheck className="text-white text-[12px]" />
                ) : (
                  <Icon className={`text-[17px] ${active ? 'text-[#1565C0]' : 'text-gray-400'}`} />
                )}
              </div>
              <p className={`text-[11px] font-[600] mt-1.5 text-center leading-tight
                ${done || active ? 'text-[#1565C0]' : 'text-gray-400'}`}
              >
                {step.label}
              </p>
              {idx === 0 && createdAt && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const COURIER_TRACKING = {
  delhivery:   (n) => `https://www.delhivery.com/track/package/${n}`,
  bluedart:    (n) => `https://www.bluedart.com/tracking?trackFor=0&trackNum=${n}`,
  ekart:       (n) => `https://ekartlogistics.com/shipmenttrack/${n}`,
  dtdc:        (n) => `https://tracking.dtdc.com/ctbs-tracking/customerInterface.tr?submitName=Tracking&cnNo=${n}`,
  fedex:       (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  xpressbees:  (n) => `https://www.xpressbees.com/shipment/tracking?awb=${n}`,
  shadowfax:   (n) => `https://track.shadowfax.in/?awb=${n}`,
  ecom:        (n) => `https://ecomexpress.in/tracking/?awb_field=${n}`,
};

function getCourierTrackingUrl(courierName, trackingNumber) {
  if (!courierName || !trackingNumber) return '#';
  const key = courierName.toLowerCase().replace(/\s+/g, '');
  const match = Object.entries(COURIER_TRACKING).find(([k]) => key.includes(k));
  return match ? match[1](trackingNumber) : `https://www.google.com/search?q=${encodeURIComponent(courierName + ' tracking ' + trackingNumber)}`;
}

// `initialOrders` is seeded by the parent server component (page.jsx) — when
// present we skip the client `useEffect` fetch entirely so first paint shows
// hydrated content. Pass null/undefined and the existing fetch path runs.
const Orders = ({ initialOrders = null }) => {
  const [orders, setOrders] = useState(initialOrders || []);
  const [loading, setLoading] = useState(initialOrders == null);
  const [expandedId, setExpandedId] = useState(null);
  const [invoiceOrder, setInvoiceOrder]   = useState(null);
  const [returnOrderId, setReturnOrderId] = useState(null); // order id for return modal
  const [returnReason, setReturnReason]   = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  // Map of orderId → most recent return record so the row can show
  // "Print Return Label" once the request is approved.
  const [returnsByOrderId, setReturnsByOrderId] = useState({});

  useEffect(() => {
    if (initialOrders != null) return; // server already hydrated us
    const fetchOrders = async () => {
      const res = await getData('/api/order/myorders');
      if (res && !res.error) setOrders(res.orders || []);
      setLoading(false);
    };
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull the user's returns alongside their orders so we can decorate each
  // row with a "Print Label" link when an approved/completed return exists.
  // Independent fetch — failure here must never break the orders list.
  useEffect(() => {
    let cancelled = false;
    const loadReturns = async () => {
      try {
        const res = await getData('/api/returns/my');
        if (cancelled || !res || res.error || !Array.isArray(res.data)) return;
        const map = {};
        for (const ret of res.data) {
          // If multiple returns exist for the same order (rare — only if a
          // prior was rejected), keep the most recent.
          const existing = map[ret.orderId];
          if (!existing || new Date(ret.updatedAt) > new Date(existing.updatedAt)) {
            map[ret.orderId] = ret;
          }
        }
        setReturnsByOrderId(map);
      } catch {
        // swallow — labels are a nice-to-have
      }
    };
    loadReturns();
    return () => { cancelled = true; };
  }, []);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) { toast.error('Please describe the reason for return'); return; }
    setReturnLoading(true);
    const res = await postData('/api/returns', { orderId: returnOrderId, reason: returnReason });
    setReturnLoading(false);
    if (res && !res.error) {
      toast.success('Return request submitted successfully!');
      setReturnOrderId(null);
      setReturnReason('');
      // Optimistically reflect the new return so the action column updates
      // without a page refresh — server will overwrite this on next fetch.
      const newRet = res.data || res;
      if (newRet?.id && newRet?.orderId) {
        setReturnsByOrderId((prev) => ({ ...prev, [newRet.orderId]: newRet }));
      }
    } else {
      toast.error(res?.message || 'Failed to submit return request');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
  <>
    <section className="w-full py-8 bg-[#F5F7FF] min-h-screen">
      <div className="container">
        <AccountMobileNav />
        <div className="flex flex-col md:flex-row gap-6">
        <div className="hidden md:block w-64 flex-shrink-0">
          <AccountSidebar />
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-[600] text-gray-800">My Orders</h2>
                <p className="text-[13px] text-gray-500 mb-0 mt-0">
                  <span className="font-[600] text-[#1565C0]">{orders.length}</span>{' '}
                  {orders.length === 1 ? 'order' : 'orders'} placed
                </p>
              </div>
              <LuClipboardCheck className="text-[#1565C0] text-[22px]" />
            </div>

            {loading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => <OrderCardSkeleton key={i} />)}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<LuClipboardCheck />}
                title="No orders yet"
                subtitle="Your placed orders will appear here."
                actionLabel="Start Shopping"
                onAction={() => window.location.href = '/productListing'}
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const addr = order.shippingAddress || {};
                  const isOpen = expandedId === order.id;
                  const previewItems = items.slice(0, 3);
                  const extraCount = items.length - 3;

                  return (
                    <div key={order.id} className="p-5">
                      {/* Order header row */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-[12px] text-gray-400 font-[500]">Order ID:</span>
                            <span className="text-[12px] font-[600] text-[#1565C0] break-all">
                              #{order.id}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>

                          <div className="flex flex-wrap gap-4 text-[12px] text-gray-500 mb-3">
                            <span>
                              <span className="font-[500]">Date:</span> {formatDate(order.createdAt)}
                            </span>
                            <span>
                              <span className="font-[500]">Total:</span>{' '}
                              <span className="font-[700] text-gray-800">
                                ₹{Number(order.totalPrice || 0).toLocaleString('en-IN')}
                              </span>
                            </span>
                            <span>
                              <span className="font-[500]">Payment:</span>{' '}
                              <span className="capitalize">{order.paymentMethod || 'COD'}</span>
                            </span>
                          </div>

                          {/* Thumbnail strip */}
                          <div className="flex items-center gap-2">
                            {previewItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="w-10 h-10 rounded-md overflow-hidden border border-gray-200 flex-shrink-0"
                              >
                                <img
                                  src={imgUrl(item.image) || 'https://via.placeholder.com/40'}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {extraCount > 0 && (
                              <span className="text-[11px] font-[600] text-gray-500">
                                +{extraCount} more
                              </span>
                            )}
                          </div>

                          {(() => {
                            const line1 = [addr.flatHouse, addr.areaStreet].filter(Boolean).join(', ') || addr.address;
                            const cityLine = [addr.townCity || addr.city, addr.state].filter(Boolean).join(', ');
                            const pincode = addr.pincode || addr.postalCode;
                            if (!line1 && !cityLine) return null;
                            return (
                              <p className="text-[11px] text-gray-400 mt-2">
                                Ship to: {line1}{line1 && cityLine ? ', ' : ''}{cityLine}{pincode ? ` — ${pincode}` : ''}
                              </p>
                            );
                          })()}
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0 mt-1">
                          <button
                            onClick={() => toggleExpand(order.id)}
                            className="flex items-center gap-1 text-[12px] font-[600] text-[#1565C0] hover:text-[#0D47A1] transition-colors"
                          >
                            {isOpen ? (
                              <><FaAngleUp className="text-[11px]" /> Hide Details</>
                            ) : (
                              <><FaAngleDown className="text-[11px]" /> View Details</>
                            )}
                          </button>
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="flex items-center gap-1 text-[12px] font-[600] text-gray-500 hover:text-[#1565C0] transition-colors"
                          >
                            <MdReceiptLong className="text-[13px]" /> Invoice
                          </button>
                          {(() => {
                            const ret = returnsByOrderId[order.id];
                            const labelHref = ret ? `/return-label/${ret.id}` : null;

                            // No return yet, but order is delivered → offer Return
                            if (!ret && order.status === 'delivered') {
                              return (
                                <button
                                  onClick={() => { setReturnOrderId(order.id); setReturnReason(''); }}
                                  className="flex items-center gap-1 text-[12px] font-[600] text-gray-500 hover:text-red-500 transition-colors"
                                >
                                  <FaUndo className="text-[11px]" /> Return
                                </button>
                              );
                            }
                            // Return approved/completed → offer Print Label
                            if (ret && (ret.status === 'approved' || ret.status === 'completed')) {
                              return (
                                <Link
                                  href={labelHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[12px] font-[600] text-gray-500 hover:text-[#1565C0] transition-colors"
                                >
                                  <FaPrint className="text-[11px]" />
                                  {ret.status === 'completed' ? 'Reprint Label' : 'Print Label'}
                                </Link>
                              );
                            }
                            // Pending or rejected — show status text instead of an action
                            if (ret && ret.status === 'pending') {
                              return (
                                <span className="text-[12px] font-[600] text-amber-600">
                                  Return Pending
                                </span>
                              );
                            }
                            if (ret && ret.status === 'rejected') {
                              return (
                                <span className="text-[12px] font-[600] text-red-500">
                                  Return Rejected
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Expanded items */}
                      {isOpen && (
                        <div className="mt-4">
                          {/* Tracking banner — only when shipped + tracking info available */}
                          {order.status === 'shipped' && order.trackingNumber && (
                            <div className="mb-3 flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <MdLocalShipping className="text-[#1565C0] text-[20px] flex-shrink-0" />
                                <div>
                                  <p className="text-[12px] font-[700] text-[#1565C0]">
                                    {order.courierName || 'Courier'} — {order.trackingNumber}
                                  </p>
                                  <p className="text-[11px] text-gray-500">Your order is on its way</p>
                                </div>
                              </div>
                              <a
                                href={order.trackingUrl || getCourierTrackingUrl(order.courierName, order.trackingNumber)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[12px] font-[700] text-[#1565C0] hover:underline whitespace-nowrap"
                              >
                                Track Shipment <MdOpenInNew className="text-[13px]" />
                              </a>
                            </div>
                          )}
                          <OrderTimeline status={order.status} createdAt={order.createdAt} />
                        </div>
                      )}
                      {isOpen && (
                        <div className="rounded-md border border-gray-100 overflow-hidden overflow-x-auto">
                          <table className="w-full min-w-[480px] text-[12px] text-left text-gray-600">
                            <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                              <tr>
                                <th className="px-4 py-2">Product</th>
                                <th className="px-4 py-2 text-center">Qty</th>
                                <th className="px-4 py-2 text-right">Price</th>
                                <th className="px-4 py-2 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {items.map((item, idx) => (
                                <tr key={idx} className="bg-white hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                                        <img
                                          src={imgUrl(item.image) || 'https://via.placeholder.com/36'}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-[500] text-gray-700 line-clamp-2 max-w-[240px] block">
                                          {item.name}
                                        </span>
                                        {(item.variantName || item.variantSku) && (
                                          <span className="text-[11px] text-[#1565C0] font-[600] mt-0.5 block">
                                            {item.variantName}
                                            {item.variantSku && (
                                              <span className="text-gray-400 font-[400]"> · {item.variantSku}</span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center font-[500]">{item.qty}</td>
                                  <td className="px-4 py-3 text-right font-[500]">
                                    ₹{Number(item.price).toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-4 py-3 text-right font-[600] text-gray-800">
                                    ₹{Number(item.price * item.qty).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right font-[600] text-gray-700">
                                  Total
                                </td>
                                <td className="px-4 py-2 text-right font-[700] text-[#1565C0] text-[13px]">
                                  ₹{Number(order.totalPrice || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </section>

    {/* Invoice modal */}
    {invoiceOrder && (
      <Invoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    )}

    {/* Return request modal */}
    {returnOrderId && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center px-4">
        <form
          onSubmit={handleReturnSubmit}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-[16px] font-[700] text-gray-800 mb-1">Request a Return</h3>
          <p className="text-[13px] text-gray-500 mb-4">
            Order #{returnOrderId} — Describe the issue and we'll process your return within 2 business days.
          </p>
          <textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            rows={4}
            placeholder="E.g. Product received is damaged / wrong item delivered..."
            className="w-full border border-gray-200 rounded-lg p-3 text-[13px] text-gray-700 resize-none focus:outline-none focus:border-[#1565C0] mb-4"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={returnLoading}
              className="flex-1 py-2.5 bg-[#1565C0] text-white text-[13px] font-[600] rounded-lg hover:bg-[#0D47A1] transition-colors disabled:opacity-60"
            >
              {returnLoading ? 'Submitting…' : 'Submit Return Request'}
            </button>
            <button
              type="button"
              onClick={() => setReturnOrderId(null)}
              className="px-5 py-2.5 border border-gray-200 text-[13px] font-[500] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}
  </>
  );
};

export default Orders;
