"use client";

import { useEffect, useState, useCallback } from "react";
import { MdEmail, MdWhatsapp, MdClose, MdRefresh, MdShoppingCart, MdAccessTime, MdPersonOff, MdDownload } from "react-icons/md";
import { FaRupeeSign } from "react-icons/fa";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import EmptyState from "../../../_legacy/components/EmptyState";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const today = new Date().toISOString().slice(0, 10);

function idleLabel(minutes) {
  if (minutes < 60)   return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

const IDLE_OPTIONS = [
  { label: "Idle > 1 hour",  value: 60   },
  { label: "Idle > 3 hours", value: 180  },
  { label: "Idle > 6 hours", value: 360  },
  { label: "Idle > 1 day",   value: 1440 },
];

function StatusDot({ cart }) {
  if (!cart.emailCount && !cart.whatsappCount)
    return <span className="text-[12px] text-gray-400">Not contacted</span>;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {cart.emailCount > 0 && (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-[#1565C0] text-[11px] font-[700] px-2 py-0.5 rounded-full">
          <MdEmail size={11} /> Email ×{cart.emailCount}
        </span>
      )}
      {cart.whatsappCount > 0 && (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[11px] font-[700] px-2 py-0.5 rounded-full">
          <MdWhatsapp size={11} /> WA ×{cart.whatsappCount}
        </span>
      )}
    </div>
  );
}

function CartRow({ cart, onAction, onViewCart }) {
  const [sending, setSending] = useState(null);

  const act = async (channel) => {
    setSending(channel);
    try {
      if (channel === "dismiss") {
        await adminAxios.post("/api/abandoned-cart/dismiss", { userId: cart.userId });
        toast.success("Cart dismissed"); onAction();
      } else {
        const res = await adminAxios.post("/api/abandoned-cart/remind", { userId: cart.userId, channel });
        if (res.data?.success) { toast.success(channel === "email" ? "Email sent!" : "WhatsApp sent!"); onAction(); }
        else toast.error(res.data?.error || "Failed to send");
      }
    } catch (e) { toast.error(e?.response?.data?.msg || e.message || "Error"); }
    finally { setSending(null); }
  };

  const idleColor = cart.idleMinutes > 1440 ? "text-red-500" : cart.idleMinutes > 360 ? "text-amber-500" : "text-gray-500";

  return (
    <tr className="border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors">
      <td className="px-4 py-3 min-w-[180px]">
        <p className="font-[700] text-[14px] text-gray-800 m-0">{cart.userName || "Unknown"}</p>
        <p className="text-[12px] text-gray-500 mt-0.5">{cart.userEmail}</p>
        {cart.userPhone && <p className="text-[11px] text-gray-400 mt-0.5">{cart.userPhone}</p>}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <p className="font-[800] text-[16px] text-[#1565C0]">{inr(cart.cartSubtotal)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}</p>
      </td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 text-[13px] font-[600] ${idleColor}`}>
          <MdAccessTime size={14} />{idleLabel(cart.idleMinutes)}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusDot cart={cart} />
        {cart.lastEmailSentAt && (
          <p className="text-[10px] text-gray-400 mt-1">Last email: {new Date(cart.lastEmailSentAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        )}
        {cart.lastWhatsappSentAt && (
          <p className="text-[10px] text-gray-400 mt-0.5">Last WA: {new Date(cart.lastWhatsappSentAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className={`flex gap-2 flex-wrap transition-opacity ${sending ? "opacity-60" : ""}`}>
          <button onClick={() => onViewCart(cart)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-[12px] font-[600] rounded-lg hover:bg-purple-100 transition-colors">
            <MdShoppingCart size={14} /> View Cart
          </button>
          <button onClick={() => act("email")} disabled={!!sending} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#1565C0] text-[12px] font-[600] rounded-lg hover:bg-blue-100 transition-colors disabled:cursor-not-allowed">
            <MdEmail size={14} />{sending === "email" ? "Sending…" : "Email"}
          </button>
          {cart.userPhone ? (
            <button onClick={() => act("whatsapp")} disabled={!!sending} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-[12px] font-[600] rounded-lg hover:bg-green-100 transition-colors disabled:cursor-not-allowed">
              <MdWhatsapp size={14} />{sending === "whatsapp" ? "Sending…" : "WhatsApp"}
            </button>
          ) : (
            <span className="text-[11px] text-gray-300 self-center">No phone</span>
          )}
          <button onClick={() => act("dismiss")} disabled={!!sending} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 text-[12px] font-[600] rounded-lg hover:bg-red-100 transition-colors disabled:cursor-not-allowed">
            <MdClose size={14} />{sending === "dismiss" ? "…" : "Dismiss"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AbandonedCartManagement() {
  const [carts,     setCarts]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [minIdle,   setMinIdle]   = useState(60);
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const perPage = 30;

  // View Cart Modal State
  const [selectedCart, setSelectedCart] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, perPage, minIdle });
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo)   p.set("dateTo",   dateTo);
      const res = await adminAxios.get(`/api/abandoned-cart?${p.toString()}`);
      const d = res.data;
      setCarts(d.carts || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch { toast.error("Failed to load abandoned carts"); }
    finally { setLoading(false); }
  }, [page, perPage, minIdle, dateFrom, dateTo]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams({ minIdle, export: "1" });
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo)   p.set("dateTo",   dateTo);
      const res  = await adminAxios.get(`/api/abandoned-cart?${p.toString()}`, { responseType: "blob" });
      const url  = URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url; link.download = `abandoned-carts-${today}.csv`; link.click();
      URL.revokeObjectURL(url); toast.success("Excel file downloaded!");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const handleViewCart = async (cart) => {
    setSelectedCart(cart);
    setCartItems([]);
    setLoadingItems(true);
    try {
      const res = await adminAxios.get(`/api/abandoned-cart/detail?userId=${cart.userId}`);
      setCartItems(res.data?.cartItem || []);
    } catch {
      toast.error("Failed to load cart items");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalValue   = carts.reduce((s, c) => s + c.cartSubtotal, 0);
  const notContacted = carts.filter((c) => c.emailCount === 0 && c.whatsappCount === 0).length;
  const contacted    = carts.length - notContacted;

  const STATS = [
    { label: "Abandoned Carts", value: total,          color: "#1565C0", bg: "#EFF6FF", icon: <MdShoppingCart size={20} /> },
    { label: "Total Cart Value", value: inr(totalValue), color: "#00A651", bg: "#F0FFF4", icon: <FaRupeeSign size={16} /> },
    { label: "Not Contacted",   value: notContacted,   color: "#E53935", bg: "#FEF2F2", icon: <MdPersonOff size={20} /> },
    { label: "Contacted",       value: contacted,      color: "#F59E0B", bg: "#FFFBEB", icon: <MdEmail size={20} /> },
  ];

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-[20px] font-[800] leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-[600] text-gray-600 whitespace-nowrap">Show carts:</span>
        <div className="flex gap-1.5 flex-wrap">
          {IDLE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { setMinIdle(opt.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-[600] transition-colors ${minIdle === opt.value ? "bg-[#1565C0] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200 flex-shrink-0 hidden sm:block" />

        <span className="text-[13px] font-[600] text-gray-600 whitespace-nowrap">Last activity:</span>
        <input type="date" value={dateFrom} max={dateTo || today} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-gray-600 outline-none focus:border-[#1565C0] cursor-pointer" />
        <span className="text-[12px] text-gray-400">to</span>
        <input type="date" value={dateTo} min={dateFrom} max={today} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-gray-600 outline-none focus:border-[#1565C0] cursor-pointer" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} className="text-[11px] text-red-500 font-[600] hover:text-red-600 transition-colors">Clear</button>
        )}

        <div className="ml-auto flex gap-2">
          <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-[13px] font-[600] rounded-xl hover:bg-gray-200 transition-colors">
            <MdRefresh size={15} /> Refresh
          </button>
          <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[13px] font-[700] rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
            <MdDownload size={15} />{exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* WhatsApp notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
        <strong>WhatsApp setup:</strong> Set <code>WHATSAPP_API_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> in your .env file to enable WhatsApp messages (Meta Cloud API). Email works automatically via your SMTP settings.
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading…</div>
        ) : carts.length === 0 ? (
          <div className="py-10">
            <EmptyState icon={<MdShoppingCart />} title="No abandoned carts" subtitle="All your customers are either ordering or haven't been idle long enough." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFF] border-b border-gray-100">
                  {["Customer", "Cart Value", "Idle", "Reminder Status", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-[700] uppercase tracking-wider text-gray-400 ${h === "Cart Value" ? "text-right" : h === "Idle" ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => (
                  <CartRow key={cart.userId} cart={cart} onAction={fetchData} onViewCart={handleViewCart} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-[13px] font-[600] transition-colors ${page === p ? "bg-[#1565C0] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* View Cart Modal */}
      {selectedCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F8FAFF] border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-[800] text-[18px] text-gray-800 flex items-center gap-2 m-0">
                  <MdShoppingCart className="text-[#1565C0]" /> Cart Items
                </h3>
                <p className="text-[12px] text-gray-500 mt-1 mb-0">
                  Showing abandoned items for <strong>{selectedCart.userName || "Unknown"}</strong> ({selectedCart.userEmail})
                </p>
              </div>
              <button
                onClick={() => setSelectedCart(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[200px]">
              {loadingItems ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[13px] font-[600] m-0">Loading products...</p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MdShoppingCart size={40} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-[14px] font-[600] m-0">No products found in this cart.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const product = item.productId;
                    const variant = item.variant;
                    const name = product?.name || "Unknown Product";
                    const price = item.unitPrice;
                    const quantity = item.quantity;
                    const subtotal = price * quantity;
                    const image = product?.images?.[0] || null;

                    return (
                      <a
                        key={item.id}
                        href={`/product/${product?.slug || product?.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left no-underline cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                          {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <MdShoppingCart size={24} className="text-gray-300" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-[750] text-[14px] text-gray-800 truncate m-0">{name}</h4>
                          {product?.brand && (
                            <span className="inline-block text-[11px] font-[600] text-gray-400 mt-0.5">
                              Brand: {product.brand}
                            </span>
                          )}
                          {variant && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(variant.attributes || {}).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="inline-flex text-[10px] font-[700] bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                >
                                  {key}: {val}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Price & Quantity */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-[800] text-[14px] text-gray-800 m-0">{inr(price)}</p>
                          <p className="text-[12px] text-gray-500 mt-0.5 m-0">Qty: {quantity}</p>
                          <p className="font-[800] text-[13px] text-[#1565C0] mt-1 m-0">
                            Total: {inr(subtotal)}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F8FAFF] border-t border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[11px] text-gray-400 font-[600] uppercase tracking-wider m-0">Estimated Total</p>
                <p className="text-[20px] font-[900] text-[#1565C0] leading-none mt-1 mb-0">
                  {inr(cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0))}
                </p>
              </div>
              <button
                onClick={() => setSelectedCart(null)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-[700] rounded-xl transition-colors cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
