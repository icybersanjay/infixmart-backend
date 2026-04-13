import { useEffect, useRef, useState } from "react";
import { MdSearch, MdExpandMore, MdExpandLess } from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import TableRowSkeleton from "../../components/skeletons/TableRowSkeleton";
import EmptyState from "../../components/EmptyState";
import { MdShoppingBag } from "react-icons/md";


const imgUrl = (p) => (p ? p : "");
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_LIST = ["all", "pending", "processing", "shipped", "delivered"];
const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_PILL = {
  pending:    { bg: "#E0E0E0", color: "#555" },
  processing: { bg: "#1565C0", color: "#fff" },
  shipped:    { bg: "#FEF3C7", color: "#92400E", border: "1px solid #F59E0B" },
  delivered:  { bg: "#E8F5E9", color: "#2E7D32", border: "1px solid #00A651" },
  cancelled:  { bg: "#FFEBEE", color: "#C62828" },
};

function StatusBadge({ status }) {
  const s = STATUS_PILL[status] || STATUS_PILL.pending;
  return (
    <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize", ...s }}>
      {status}
    </span>
  );
}


function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", padding: "1rem 0", flexWrap: "wrap" }}>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid", borderColor: p === page ? "#1565C0" : "#E0E0E0", background: p === page ? "#1565C0" : "#fff", color: p === page ? "#fff" : "#333", cursor: "pointer", fontWeight: p === page ? 600 : 400, fontSize: "0.875rem" }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Expanded accordion row ────────────────────────────────────────────────────
function OrderDetail({ order, onStatusUpdated }) {
  const [newStatus, setNewStatus] = useState(order.status);
  const [updating, setUpdating] = useState(false);
  const addr = order.shippingAddress || {};
  let items = [];
  try { items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || "[]"); } catch {}

  const handleUpdate = async () => {
    if (newStatus === order.status) return;
    setUpdating(true);
    try {
      await adminAxios.put(`/api/order/${order.id}/status`, { status: newStatus });
      toast.success(`Status updated to "${newStatus}"`);
      onStatusUpdated(order.id, newStatus);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, background: "#F9FAFB", borderBottom: "2px solid #E0E0E0" }}>
        <div style={{ padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "1.5rem", alignItems: "start" }}>
          {/* Address */}
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1A237E", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Shipping Address</p>
            <p style={{ fontSize: "0.85rem", color: "#333", lineHeight: 1.6, margin: 0 }}>
              {addr.fullName || addr.name}<br />
              {addr.phone || addr.mobile}<br />
              {addr.addressLine || addr.flatHouse}<br />
              {addr.city || addr.townCity}
              {addr.pincode ? `, ${addr.pincode}` : ""}
            </p>
          </div>

          {/* Items */}
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1A237E", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Items</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#fff", borderRadius: 6, padding: "0.5rem 0.75rem", border: "1px solid #E0E0E0" }}>
                  {item.image && (
                    <img src={imgUrl(item.image)} alt={item.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#666" }}>Qty: {item.qty || item.quantity || 1} × {inr(item.price)}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: "#1A237E", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {inr((item.price || 0) * (item.qty || item.quantity || 1))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status update */}
          <div style={{ minWidth: 180 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1A237E", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Update Status</p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.875rem", outline: "none", marginBottom: "0.6rem", background: "#fff" }}
            >
              {VALID_STATUSES.map((s) => (
                <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={handleUpdate}
              disabled={updating || newStatus === order.status}
              style={{
                width: "100%", padding: "0.55rem", background: updating || newStatus === order.status ? "#90CAF9" : "#1565C0",
                color: "#fff", border: "none", borderRadius: 6, cursor: updating || newStatus === order.status ? "not-allowed" : "pointer",
                fontWeight: 500, fontSize: "0.875rem",
              }}
            >
              {updating ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const debounceRef = useRef(null);

  const loadOrders = async (p = 1, status = "all", q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, perPage: 10 });
      if (status !== "all") params.set("status", status);
      const res = await adminAxios.get(`/api/admin/orders?${params}`);
      let data = res.data.orders || [];
      // Client-side search filter (API doesn't support search)
      if (q) {
        const lq = q.toLowerCase();
        data = data.filter(
          (o) =>
            String(o.id).includes(q) ||
            o.user?.name?.toLowerCase().includes(lq) ||
            o.user?.email?.toLowerCase().includes(lq)
        );
      }
      setOrders(data);
      setTotalPages(res.data.totalPages || 1);
      setTotalOrders(res.data.totalOrders || 0);
      setPage(p);
      setExpanded(null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrders(1, statusFilter, search); }, [statusFilter, search]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handleStatusUpdated = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  return (
    <div>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>
          Orders
          <span style={{ fontWeight: 400, color: "#999", fontSize: "0.875rem", marginLeft: 8 }}>({totalOrders} total)</span>
        </h2>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <MdSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: "1.1rem" }} />
          <input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by ID or customer…"
            style={{ padding: "0.55rem 0.875rem 0.55rem 2rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.875rem", outline: "none", width: 230 }}
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.25rem", borderBottom: "1px solid #E0E0E0", overflowX: "auto" }}>
        {STATUS_LIST.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: "0.6rem 1.1rem", background: "none", border: "none", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: statusFilter === s ? 600 : 400,
              color: statusFilter === s ? "#1565C0" : "#666",
              borderBottom: statusFilter === s ? "2px solid #1565C0" : "2px solid transparent",
              whiteSpace: "nowrap", textTransform: "capitalize", transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Order ID", "Customer", "Date", "Items", "Total", "Payment", "Status", "Action"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #E0E0E0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={8} widths={[60, 120, 90, 50, 80, 70, 90, 60]} />)
                : orders.length === 0
                ? (
                    <tr>
                      <td colSpan={8}><EmptyState icon={<MdShoppingBag style={{ fontSize: 64 }} />} title="No orders yet" subtitle="Orders will appear here once customers start purchasing." /></td>
                    </tr>
                  )
                : orders.flatMap((order, i) => {
                    let items = [];
                    try { items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || "[]"); } catch {}
                    const isExpanded = expanded === order.id;

                    const mainRow = (
                      <tr
                        key={`row-${order.id}`}
                        style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: isExpanded ? "none" : "1px solid #F0F0F0" }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: "#1565C0", fontWeight: 600 }}>#{order.id}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 500, color: "#222" }}>{order.user?.name || "—"}</div>
                          <div style={{ fontSize: "0.78rem", color: "#999" }}>{order.user?.email || ""}</div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#555", whiteSpace: "nowrap" }}>{fmtDate(order.createdAt)}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#555" }}>{items.length}</td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#1A237E" }}>{inr(order.totalPrice)}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {order.isPaid ? (
                            <span style={{ padding: "0.18rem 0.6rem", borderRadius: 999, fontSize: "0.73rem", fontWeight: 600, background: "#E8F5E9", color: "#00A651" }}>Paid</span>
                          ) : (
                            <span style={{ padding: "0.18rem 0.6rem", borderRadius: 999, fontSize: "0.73rem", fontWeight: 600, background: "#F5F5F5", color: "#666" }}>{order.paymentMethod || "COD"}</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <StatusBadge status={order.status} />
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : order.id)}
                            style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "#E3F2FD", border: "none", borderRadius: 6, padding: "0.35rem 0.6rem", cursor: "pointer", color: "#1565C0", fontSize: "0.8rem", fontWeight: 500 }}
                          >
                            {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                            View
                          </button>
                        </td>
                      </tr>
                    );

                    if (isExpanded) {
                      return [mainRow, <OrderDetail key={`detail-${order.id}`} order={order} onStatusUpdated={handleStatusUpdated} />];
                    }
                    return [mainRow];
                  })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={(p) => loadOrders(p, statusFilter, search)} />
      </div>
    </div>
  );
}
