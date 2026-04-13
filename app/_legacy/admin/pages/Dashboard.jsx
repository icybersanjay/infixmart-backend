"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MdShoppingBag,
  MdAttachMoney,
  MdInventory,
  MdPeople,
} from "react-icons/md";
import adminAxios from "../utils/adminAxios";

// ── Helpers ──────────────────────────────────────────────────────────────────
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const STATUS_STYLES = {
  pending:    { background: "#E0E0E0", color: "#555" },
  processing: { background: "#1565C0", color: "#fff" },
  shipped:    { background: "#FEF3C7", color: "#92400E", border: "1px solid #F59E0B" },
  delivered:  { background: "#E8F5E9", color: "#2E7D32", border: "1px solid #00A651" },
  cancelled:  { background: "#FFEBEE", color: "#C62828" },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ height = 20, width = "100%", radius = 6, style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: "linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        ...style,
      }}
    />
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, loading }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #E0E0E0",
        borderLeft: `4px solid ${accent}`,
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: `${accent}18`,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        {loading ? (
          <>
            <Skeleton height={28} width={80} style={{ marginBottom: 6 }} />
            <Skeleton height={14} width={60} />
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1A237E", lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: 4 }}>{label}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.65rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        textTransform: "capitalize",
        ...s,
      }}
    >
      {status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    adminAxios
      .get("/api/admin/stats")
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));

    adminAxios
      .get("/api/admin/orders?page=1&perPage=5")
      .then((res) => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setOrdersLoading(false));
  }, []);

  return (
    <div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .row-hover:hover { background: #F3F4F6 !important; }
      `}</style>

      {/* ── Stat cards ──────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Total Orders"
          value={stats?.totalOrders ?? "—"}
          icon={<MdShoppingBag />}
          accent="#1565C0"
          loading={statsLoading}
        />
        <StatCard
          label="Total Revenue"
          value={stats ? inr(stats.totalRevenue) : "—"}
          icon={<MdAttachMoney />}
          accent="#00A651"
          loading={statsLoading}
        />
        <StatCard
          label="Total Products"
          value={stats?.totalProducts ?? "—"}
          icon={<MdInventory />}
          accent="#7B1FA2"
          loading={statsLoading}
        />
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? "—"}
          icon={<MdPeople />}
          accent="#F59E0B"
          loading={statsLoading}
        />
      </div>

      {/* ── Recent orders ───────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #E0E0E0",
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #E0E0E0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>
            Recent Orders
          </h2>
          <Link
            href="/admin/orders"
            style={{ fontSize: "0.8rem", color: "#1565C0", textDecoration: "none", fontWeight: 500 }}
          >
            View all →
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Order ID", "Customer", "Date", "Total", "Status", "Action"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#555",
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid #E0E0E0",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F0F0F0" }}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} style={{ padding: "0.75rem 1rem" }}>
                          <Skeleton height={14} width={j === 5 ? 50 : "80%"} />
                        </td>
                      ))}
                    </tr>
                  ))
                : orders.length === 0
                ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                        No orders found.
                      </td>
                    </tr>
                  )
                : orders.map((order, i) => (
                    <tr
                      key={order.id}
                      className="row-hover"
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#F9FAFB",
                        borderBottom: "1px solid #F0F0F0",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", color: "#1565C0", fontWeight: 500 }}>
                        #{order.id}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#333" }}>
                        {order.user?.name || order.user?.email || "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#555", whiteSpace: "nowrap" }}>
                        {fmt(order.createdAt)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#333", fontWeight: 500 }}>
                        {inr(order.totalPrice)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <StatusBadge status={order.status} />
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <Link
                          href="/admin/orders"
                          style={{
                            color: "#1565C0",
                            textDecoration: "none",
                            fontWeight: 500,
                            fontSize: "0.8rem",
                          }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick links ─────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link
          href="/admin/products/new"
          style={{
            padding: "0.6rem 1.25rem",
            background: "#1565C0",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "0.875rem",
          }}
        >
          + Add Product
        </Link>
        <Link
          href="/admin/categories"
          style={{
            padding: "0.6rem 1.25rem",
            background: "#1565C0",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "0.875rem",
          }}
        >
          + Add Category
        </Link>
        <Link
          href="/admin/orders"
          style={{
            padding: "0.6rem 1.25rem",
            background: "transparent",
            color: "#1565C0",
            border: "1.5px solid #1565C0",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "0.875rem",
          }}
        >
          View All Orders
        </Link>
      </div>
    </div>
  );
}
