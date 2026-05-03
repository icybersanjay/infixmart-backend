"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  MdDashboard, MdCategory, MdInventory, MdShoppingBag, MdPeople,
  MdViewCarousel, MdTune, MdSettings, MdLogout, MdArticle, MdHome,
  MdAssignmentReturn, MdLocalOffer, MdMenu, MdClose, MdRemoveShoppingCart,
  MdOpenInNew, MdChevronLeft, MdChevronRight, MdStorefront,
} from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import AdminQuickSearch from "../_components/AdminQuickSearch";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { path: "/admin/dashboard", label: "Dashboard", icon: MdDashboard },
      { path: "/admin/orders",    label: "Orders",    icon: MdShoppingBag },
      { path: "/admin/users",     label: "Users",     icon: MdPeople },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { path: "/admin/products",   label: "Products",   icon: MdInventory },
      { path: "/admin/categories", label: "Categories", icon: MdCategory },
      { path: "/admin/attributes", label: "Attributes", icon: MdTune },
    ],
  },
  {
    label: "Commerce",
    items: [
      { path: "/admin/coupons",         label: "Coupons",         icon: MdLocalOffer },
      { path: "/admin/returns",         label: "Returns",         icon: MdAssignmentReturn },
      { path: "/admin/abandoned-carts", label: "Abandoned Carts", icon: MdRemoveShoppingCart },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/admin/sliders",  label: "Sliders",   icon: MdViewCarousel },
      { path: "/admin/homepage", label: "Home Page", icon: MdHome },
      { path: "/admin/blogs",    label: "Blogs",     icon: MdArticle },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/admin/settings", label: "Settings", icon: MdSettings },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

const ROUTE_TITLES = {
  "/admin/dashboard":     "Dashboard",
  "/admin/categories":    "Categories",
  "/admin/products/new":  "Add Product",
  "/admin/products":      "Products",
  "/admin/orders":        "Orders",
  "/admin/users":         "Users",
  "/admin/sliders":       "Sliders",
  "/admin/homepage":      "Home Page",
  "/admin/attributes":    "Attributes",
  "/admin/blogs":         "Blogs",
  "/admin/coupons":       "Coupons",
  "/admin/returns":       "Returns",
  "/admin/abandoned-carts": "Abandoned Carts",
  "/admin/settings":      "Settings",
};

const SIDEBAR_W  = 236;
const MINI_W     = 64;

export default function AdminLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [adminUser,    setAdminUser]    = useState(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);

  const sidebarW = collapsed ? MINI_W : SIDEBAR_W;

  const pageTitle = pathname.match(/\/admin\/products\/\d+\/edit/)
    ? "Edit Product"
    : Object.entries(ROUTE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "Admin";

  // Build a breadcrumb trail from the URL. Handles top-level routes plus the
  // common detail-page patterns (products/new, products/:id/edit). Anything
  // unrecognised falls back to "Admin / <pageTitle>".
  const breadcrumbs = (() => {
    if (pathname === "/admin" || pathname === "/admin/dashboard") {
      return [{ label: "Dashboard", href: "/admin/dashboard" }];
    }

    const editMatch = pathname.match(/^\/admin\/products\/(\d+)\/edit/);
    if (editMatch) {
      return [
        { label: "Products", href: "/admin/products" },
        { label: `Edit #${editMatch[1]}` },
      ];
    }
    if (pathname === "/admin/products/new") {
      return [
        { label: "Products", href: "/admin/products" },
        { label: "Add product" },
      ];
    }
    if (pathname === "/admin/products/import") {
      return [
        { label: "Products", href: "/admin/products" },
        { label: "Import CSV" },
      ];
    }

    const matchEntry = Object.entries(ROUTE_TITLES).find(([key]) => pathname.startsWith(key));
    if (matchEntry) {
      return [{ label: matchEntry[1], href: matchEntry[0] }];
    }
    return [{ label: pageTitle }];
  })();

  const isActive = (path) => pathname === path || pathname.startsWith(path + "/");

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    adminAxios.get("/api/user/user-details")
      .then((res) => setAdminUser(res.data?.user || null))
      .catch(() => setAdminUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    try { await adminAxios.post("/api/user/logout", {}); } catch {}
    router.push("/admin/login");
  };

  const NavItem = ({ path, label, icon: Icon, mini }) => {
    const active = isActive(path);
    return (
      <Link
        href={path}
        title={mini ? label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mx-2 transition-all duration-150 group relative ${
          active
            ? "bg-[#1565C0] text-white shadow-sm"
            : "text-[rgba(255,255,255,0.65)] hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className={`text-[20px] flex-shrink-0 ${active ? "text-white" : ""}`} />
        {!mini && <span className="text-[13px] font-[500] truncate">{label}</span>}
        {mini && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[11px] font-[600] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {label}
          </div>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mini = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center justify-between px-4 py-4 border-b border-white/10 ${mini ? "px-2 justify-center" : ""}`}>
        {!mini && (
          <div>
            <span className="text-white font-[800] text-[18px] tracking-tight">InfixMart</span>
            <span className="block text-[10px] font-[700] uppercase tracking-[2px] text-white/40 mt-0.5">Admin Panel</span>
          </div>
        )}
        {mini && <MdStorefront className="text-white text-[22px]" />}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-white/60 hover:text-white ml-2"
        >
          <MdClose className="text-[20px]" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!mini && (
              <p className="text-[10px] font-[700] uppercase tracking-[1.5px] text-white/30 px-5 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.path} {...item} mini={mini} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 p-3 space-y-2`}>
        {!mini && (
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-[13px]"
          >
            <MdOpenInNew className="text-[16px]" /> View Store
          </Link>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all text-[13px] font-[500] ${mini ? "justify-center" : ""}`}
          title={mini ? "Logout" : undefined}
        >
          <MdLogout className="text-[18px] flex-shrink-0" />
          {!mini && "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .admin-mobile-overlay { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="admin-mobile-overlay fixed inset-0 bg-black/50 z-[199] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-screen bg-[#F1F5F9]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden md:flex flex-col fixed top-0 left-0 h-screen bg-[#1A237E] z-[200] transition-all duration-200"
          style={{ width: sidebarW }}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="absolute -right-3 top-16 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:text-[#1565C0] hover:border-[#1565C0] transition-all z-10"
          >
            {collapsed ? <MdChevronRight className="text-[14px]" /> : <MdChevronLeft className="text-[14px]" />}
          </button>
          <SidebarContent mini={collapsed} />
        </aside>

        {/* ── Mobile Sidebar ── */}
        <aside
          className={`md:hidden fixed top-0 left-0 h-screen bg-[#1A237E] z-[200] transition-transform duration-250 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ width: SIDEBAR_W }}
        >
          <SidebarContent />
        </aside>

        {/* ── Main Area ── */}
        <div
          className="flex flex-col flex-1 min-h-screen transition-all duration-200"
          style={{ marginLeft: 0 }}
        >
          {/* Inline style override for desktop margin */}
          <style>{`
            @media (min-width: 768px) {
              .admin-main { margin-left: ${sidebarW}px !important; }
            }
          `}</style>

          <div className="admin-main flex flex-col flex-1 min-h-screen">
            {/* ── Top Header ── */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 h-[60px] flex items-center px-4 md:px-6 gap-3">
              {/* Mobile hamburger */}
              <button
                className="md:hidden text-[#1A237E] p-1"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <MdMenu className="text-[24px]" />
              </button>

              {/* Breadcrumbs */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
                <Link
                  href="/admin/dashboard"
                  className="text-[12px] font-[500] text-gray-400 hover:text-[#1565C0] transition-colors hidden sm:block"
                >
                  Admin
                </Link>
                <span className="text-[12px] text-gray-300 hidden sm:block" aria-hidden="true">›</span>
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                      {!isLast && crumb.href ? (
                        <Link
                          href={crumb.href}
                          className="text-[12px] font-[500] text-gray-500 hover:text-[#1565C0] transition-colors truncate"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <h1 className={`${i === 0 ? "text-[15px] font-[700] text-[#1A237E]" : "text-[13px] font-[600] text-gray-700"} truncate`}>
                          {crumb.label}
                        </h1>
                      )}
                      {!isLast && <span className="text-[12px] text-gray-300" aria-hidden="true">›</span>}
                    </span>
                  );
                })}
              </nav>

              {/* Right side */}
              <div className="ml-auto flex items-center gap-3">
                <AdminQuickSearch />
                <Link
                  href="/"
                  target="_blank"
                  className="hidden sm:flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#1565C0] transition-colors font-[500] border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#1565C0]"
                >
                  <MdOpenInNew className="text-[14px]" /> View Store
                </Link>

                {/* Avatar */}
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1565C0] to-[#1A237E] text-white flex items-center justify-center text-[13px] font-[700]">
                    {adminUser?.name?.charAt(0)?.toUpperCase() ?? "A"}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[13px] font-[600] text-gray-700 leading-tight">{adminUser?.name ?? "Admin"}</p>
                    <p className="text-[10px] text-gray-400 leading-tight capitalize">{adminUser?.role ?? "admin"}</p>
                  </div>
                </div>
              </div>
            </header>

            {/* ── Page Content ── */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
