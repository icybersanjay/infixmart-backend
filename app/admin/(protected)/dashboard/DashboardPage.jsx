"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MdShoppingBag, MdAttachMoney, MdInventory, MdPeople,
  MdTrendingUp, MdWarning, MdAdd, MdArrowForward,
  MdCheckCircle, MdLocalShipping, MdPendingActions, MdCancel,
  MdAssessment, MdReplay, MdRemoveShoppingCart, MdCategory,
} from "react-icons/md";
import adminAxios from "../_lib/adminAxios";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const inrCompact = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const shortDay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const STATUS_CFG = {
  pending:    { label: "Pending",    bg: "bg-gray-100",   text: "text-gray-600",   icon: MdPendingActions },
  processing: { label: "Processing", bg: "bg-blue-100",   text: "text-blue-700",   icon: MdShoppingBag },
  shipped:    { label: "Shipped",    bg: "bg-amber-100",  text: "text-amber-700",  icon: MdLocalShipping },
  delivered:  { label: "Delivered",  bg: "bg-green-100",  text: "text-green-700",  icon: MdCheckCircle },
  cancelled:  { label: "Cancelled",  bg: "bg-red-100",    text: "text-red-700",    icon: MdCancel },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-[700] capitalize ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function Shimmer({ h = "h-5", w = "w-full", rounded = "rounded-md" }) {
  return <div className={`${h} ${w} ${rounded} bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse`} />;
}

function StatCard({ label, value, icon: Icon, accent, sub, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18`, color: accent }}>
        <Icon className="text-[22px]" />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <Shimmer h="h-7" w="w-20" rounded="rounded-lg" />
            <Shimmer h="h-3.5" w="w-24" rounded="rounded" />
          </>
        ) : (
          <>
            <p className="text-[26px] font-[900] text-gray-800 leading-none truncate">{value}</p>
            <p className="text-[12px] text-gray-400 font-[500] mt-1">{label}</p>
            {sub && <p className="text-[11px] text-gray-300 mt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// Inline SVG sparkline — no chart library dependency. Polyline over the
// revenue series, with a soft area fill underneath. Width is scaled by
// container; viewBox does the actual sizing.
function Sparkline({ points = [], color = "#1565C0", height = 80 }) {
  if (!points.length) return null;
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const min = 0;
  const w = 100;
  const h = 40;
  const stepX = w / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p.revenue - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function RevenueChart({ series, totalRevenue, totalOrders, windowDays, loading }) {
  // Pick a few x-axis labels evenly across the window so we don't crowd the
  // axis on small screens. Always show first + last.
  const labels = useMemo(() => {
    if (!series?.length) return [];
    if (series.length <= 7) return series.map((p) => p.date);
    const step = Math.ceil(series.length / 5);
    const idxs = new Set([0, series.length - 1]);
    for (let i = step; i < series.length - 1; i += step) idxs.add(i);
    return [...idxs].sort((a, b) => a - b).map((i) => series[i].date);
  }, [series]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-[800] text-gray-800">GMV — last {windowDays} days</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Excludes cancelled orders. Updated live from the orders table.
          </p>
        </div>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-[10px] font-[700] uppercase tracking-wide text-gray-400">Revenue</p>
            <p className="text-[20px] font-[900] text-[#1565C0] leading-none">
              {loading ? "—" : inrCompact(totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-[700] uppercase tracking-wide text-gray-400">Orders</p>
            <p className="text-[20px] font-[900] text-gray-700 leading-none">
              {loading ? "—" : Number(totalOrders).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <Shimmer h="h-[80px]" w="w-full" rounded="rounded-lg" />
        ) : !series?.length ? (
          <p className="text-[13px] text-gray-400 italic text-center py-6">No data in this window yet.</p>
        ) : (
          <>
            <Sparkline points={series} color="#1565C0" height={80} />
            {labels.length > 1 && (
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                {labels.map((d) => (
                  <span key={d}>{shortDay(d)}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TopCategoriesCard({ rows, loading }) {
  const max = useMemo(
    () => Math.max(1, ...(rows || []).map((r) => Number(r.revenue || 0))),
    [rows]
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <MdCategory className="text-[#7B1FA2] text-[18px]" />
        <h2 className="text-[15px] font-[800] text-gray-800">Top Categories</h2>
      </div>
      <div className="px-5 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} h="h-6" w="w-full" rounded="rounded" />
          ))
        ) : !rows?.length ? (
          <p className="text-[13px] text-gray-400 italic text-center py-6">
            No categorised orders yet in this window.
          </p>
        ) : (
          rows.map((row) => {
            const pctOfMax = (Number(row.revenue || 0) / max) * 100;
            return (
              <div key={row.catName}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[13px] font-[600] text-gray-700 truncate">{row.catName}</p>
                  <p className="text-[12px] font-[700] text-gray-800 ml-2">
                    {inrCompact(row.revenue)}{" "}
                    <span className="text-gray-400 font-[500] text-[11px]">
                      · {row.orderCount} order{row.orderCount === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#7B1FA2] to-[#1565C0] rounded-full"
                    style={{ width: `${pctOfMax}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function OpsCard({ icon: Icon, label, value, accent, hint, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18`, color: accent }}>
        <Icon className="text-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-[500]">{label}</p>
        {loading ? (
          <Shimmer h="h-5" w="w-16" rounded="rounded" />
        ) : (
          <p className="text-[18px] font-[800] text-gray-800 leading-tight mt-0.5">{value}</p>
        )}
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Add Product",    href: "/admin/products/new",  primary: true  },
  { label: "Add Category",   href: "/admin/categories",    primary: true  },
  { label: "View Orders",    href: "/admin/orders",        primary: false },
  { label: "Manage Coupons", href: "/admin/coupons",       primary: false },
];

const WINDOW_OPTIONS = [
  { label: "7d",  value: 7  },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default function Dashboard() {
  const [stats,         setStats]         = useState(null);
  const [orders,        setOrders]        = useState([]);
  const [lowStock,      setLowStock]      = useState([]);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [windowDays,    setWindowDays]    = useState(30);

  useEffect(() => {
    setStatsLoading(true);
    adminAxios.get(`/api/admin/stats?windowDays=${windowDays}`)
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [windowDays]);

  useEffect(() => {
    adminAxios.get("/api/admin/orders?page=1&perPage=6")
      .then((res) => setOrders(res.data.orders || []))
      .catch(console.error)
      .finally(() => setOrdersLoading(false));

    adminAxios.get("/api/product?perPage=50&sort=stock_asc&includeAllStatuses=true")
      .then((res) => {
        const prods = res.data.products || [];
        setLowStock(prods.filter((p) => Number(p.countInStock) <= Number(p.reorderThreshold ?? 5)));
      })
      .catch(() => null);
  }, []);

  const series = stats?.series || null;

  return (
    <div className="space-y-6">

      {/* ── Stat Cards (lifetime totals) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Orders"       value={stats?.totalOrders    ?? "—"} icon={MdShoppingBag} accent="#1565C0" loading={statsLoading} />
        <StatCard label="Total Revenue"      value={stats ? inr(stats.totalRevenue) : "—"} icon={MdAttachMoney} accent="#00A651" loading={statsLoading} />
        <StatCard label="Total Products"     value={stats?.totalProducts  ?? "—"} icon={MdInventory}  accent="#7B1FA2" loading={statsLoading} />
        <StatCard label="Total Users"        value={stats?.totalUsers     ?? "—"} icon={MdPeople}     accent="#F59E0B" loading={statsLoading}
          sub={series ? `+${series.newUsers7d} this week · +${series.newUsersToday} today` : undefined} />
        <StatCard label="Avg. Order Value"   value={stats ? inr(stats.aov) : "—"} icon={MdTrendingUp} accent="#0097A7" loading={statsLoading} />
        <StatCard label="Low Stock Products" value={stats?.lowStockCount  ?? "—"} icon={MdWarning}    accent="#E53935" loading={statsLoading}
          sub={stats?.lowStockCount > 0 ? "Needs restocking" : undefined} />
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ label, href, primary }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-[700] transition-all ${
              primary
                ? "bg-[#1565C0] text-white hover:bg-[#1251A3] shadow-sm"
                : "bg-white border border-gray-200 text-gray-700 hover:border-[#1565C0] hover:text-[#1565C0]"
            }`}
          >
            {primary && <MdAdd className="text-[16px]" />}
            {label}
          </Link>
        ))}
      </div>

      {/* ── Window selector ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MdAssessment className="text-[#1565C0] text-[20px]" />
          <h2 className="text-[16px] font-[800] text-gray-800">Business Metrics</h2>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWindowDays(opt.value)}
              className={`px-3 py-1 text-[12px] font-[700] rounded-md transition-colors ${
                windowDays === opt.value
                  ? "bg-[#1565C0] text-white"
                  : "text-gray-500 hover:text-[#1565C0]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── GMV chart + Top Categories ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart
            series={series?.revenueSeries || []}
            totalRevenue={series?.revenueWindow ?? 0}
            totalOrders={series?.ordersWindow ?? 0}
            windowDays={series?.windowDays ?? windowDays}
            loading={statsLoading}
          />
        </div>
        <TopCategoriesCard rows={series?.topCategories || []} loading={statsLoading} />
      </div>

      {/* ── Operational metrics row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OpsCard
          icon={MdReplay}
          label="RTO Rate"
          value={pct(series?.rtoRate ?? 0)}
          accent="#E53935"
          hint={`Returns + cancels in last ${windowDays}d`}
          loading={statsLoading}
        />
        <OpsCard
          icon={MdRemoveShoppingCart}
          label="Cart Abandonment"
          value={pct(series?.cartAbandonmentRate ?? 0)}
          accent="#F59E0B"
          hint="Active vs recovered carts"
          loading={statsLoading}
        />
        <OpsCard
          icon={MdPeople}
          label="Repeat Customer Rate"
          value={pct(series?.repeatCustomerRate ?? 0)}
          accent="#7B1FA2"
          hint={`${series?.newUsers30d ?? 0} new users in last 30d`}
          loading={statsLoading}
        />
        <OpsCard
          icon={MdTrendingUp}
          label="AOV (lifetime)"
          value={stats ? inr(stats.aov) : "—"}
          accent="#0097A7"
          hint={`${stats?.deliveredOrders ?? 0} delivered orders`}
          loading={statsLoading}
        />
      </div>

      {/* ── Recent Orders ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-[800] text-gray-800">Recent Orders</h2>
          <Link href="/admin/orders" className="flex items-center gap-1 text-[12px] font-[600] text-[#1565C0] hover:underline">
            View all <MdArrowForward className="text-[14px]" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFF]">
                {["Order ID", "Customer", "Date", "Amount", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap border-b border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Shimmer h="h-4" w={j === 5 ? "w-12" : "w-3/4"} />
                        </td>
                      ))}
                    </tr>
                  ))
                : orders.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-[13px]">
                        No orders yet.
                      </td>
                    </tr>
                  )
                : orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors">
                      <td className="px-4 py-3 font-[700] text-[#1565C0]">#{order.id}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">
                        {order.user?.name || order.user?.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(order.createdAt)}</td>
                      <td className="px-4 py-3 font-[700] text-gray-800">{inr(order.totalPrice)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        <Link href="/admin/orders" className="text-[12px] font-[600] text-[#1565C0] hover:underline whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Inventory Alerts ── */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <MdWarning className="text-amber-500 text-[20px]" />
              <span className="text-[14px] font-[700] text-amber-800">
                Inventory Alerts — {lowStock.length} product{lowStock.length > 1 ? "s" : ""} need restocking
              </span>
            </div>
            <Link href="/admin/products" className="text-[12px] font-[600] text-[#1565C0] hover:underline">
              Manage →
            </Link>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/edit`}
                className={`text-[12px] font-[600] px-3 py-1.5 rounded-lg transition-colors ${
                  Number(p.countInStock) === 0
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                }`}
              >
                {p.name} — {Number(p.countInStock) === 0 ? "Out of Stock" : `${p.countInStock} left`}
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
