"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  MdDashboard,
  MdCategory,
  MdInventory,
  MdShoppingBag,
  MdPeople,
  MdViewCarousel,
  MdTune,
  MdSettings,
  MdLogout,
  MdArticle,
  MdHome,
  MdAssignmentReturn,
  MdLocalOffer,
  MdMenu,
  MdClose,
} from "react-icons/md";
import adminAxios from "./utils/adminAxios";

const NAV_ITEMS = [
  { path: "/admin/dashboard",   label: "Dashboard",   icon: <MdDashboard /> },
  { path: "/admin/categories",  label: "Categories",  icon: <MdCategory /> },
  { path: "/admin/products",    label: "Products",    icon: <MdInventory /> },
  { path: "/admin/orders",      label: "Orders",      icon: <MdShoppingBag /> },
  { path: "/admin/users",       label: "Users",       icon: <MdPeople /> },
  { path: "/admin/sliders",     label: "Sliders",     icon: <MdViewCarousel /> },
  { path: "/admin/homepage",    label: "Home Page",   icon: <MdHome /> },
  { path: "/admin/attributes",  label: "Attributes",  icon: <MdTune /> },
  { path: "/admin/blogs",       label: "Blogs",       icon: <MdArticle /> },
  { path: "/admin/coupons",     label: "Coupons",     icon: <MdLocalOffer /> },
  { path: "/admin/returns",     label: "Returns",     icon: <MdAssignmentReturn /> },
  { path: "/admin/settings",    label: "Settings",    icon: <MdSettings /> },
];

const ROUTE_TITLES = {
  "/admin/dashboard":  "Dashboard",
  "/admin/categories": "Category Management",
  "/admin/products/new":  "Add Product",
  "/admin/products":   "Product Management",
  "/admin/orders":     "Order Management",
  "/admin/users":      "User Management",
  "/admin/sliders":    "Slider Management",
  "/admin/homepage":   "Home Page Management",
  "/admin/attributes": "Attribute Management",
  "/admin/blogs":      "Blog Management",
  "/admin/coupons":    "Coupon Management",
  "/admin/returns":    "Return Requests",
  "/admin/settings":   "Store Settings",
};

const SIDEBAR_W = 240;

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check /products/:id/edit before startsWith("/admin/products")
  const pageTitle = pathname.match(/\/admin\/products\/\d+\/edit/)
    ? "Edit Product"
    : Object.entries(ROUTE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "Admin";

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Close sidebar on ESC
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Lock body scroll when mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    adminAxios
      .get("/api/user/user-details")
      .then((res) => setAdminUser(res.data?.user || null))
      .catch(() => setAdminUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await adminAxios.post("/api/user/logout", {});
    } catch {}
    router.push("/admin/login");
  };

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .admin-sidebar {
            transform: translateX(-100%) !important;
          }
          .admin-sidebar.open {
            transform: translateX(0) !important;
          }
          .admin-sidebar-close {
            display: flex !important;
          }
          .admin-main-area {
            margin-left: 0 !important;
          }
        }
        @media (min-width: 768px) {
          .admin-hamburger {
            display: none !important;
          }
          .admin-sidebar {
            transform: translateX(0) !important;
          }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 199,
          }}
        />
      )}

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
        {/* Sidebar */}
        <div className={`admin-sidebar${sidebarOpen ? " open" : ""}`}
          style={{
            width: SIDEBAR_W,
            minWidth: SIDEBAR_W,
            background: "#1A237E",
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            zIndex: 200,
            transition: "transform 0.25s ease",
          }}
        >
          {/* Logo + mobile close */}
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem", letterSpacing: 0.5 }}>
                InfixMart
              </span>
              <span style={{
                display: "block",
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.7rem",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginTop: 2,
              }}>
                Admin Panel
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="admin-sidebar-close"
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: "1.4rem",
                lineHeight: 1,
                display: "none",
                padding: 4,
              }}
              aria-label="Close menu"
            >
              <MdClose />
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto" }}>
            {NAV_ITEMS.map(({ path, label, icon }) => {
              const isActive = pathname === path || pathname.startsWith(path + "/");
              return (
                <Link
                  key={path}
                  href={path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 1.5rem",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "rgba(21,101,192,0.35)" : "transparent",
                    borderLeft: isActive ? "4px solid #1565C0" : "4px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                width: "100%",
                padding: "0.65rem 1rem",
                background: "rgba(229,57,53,0.15)",
                border: "1px solid rgba(229,57,53,0.3)",
                borderRadius: 6,
                color: "#EF9A9A",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <MdLogout style={{ fontSize: "1.1rem" }} />
              Logout
            </button>
          </div>
        </div>

        {/* ── Main area ────────────────────────────────── */}
        <div
          className="admin-main-area"
          style={{ flex: 1, marginLeft: SIDEBAR_W, display: "flex", flexDirection: "column", minHeight: "100vh" }}
        >
          {/* Top header */}
          <header style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            padding: "0 1.5rem",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {/* Hamburger — only on mobile */}
              <button
                className="admin-hamburger"
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  color: "#1A237E",
                  lineHeight: 1,
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Open menu"
              >
                <MdMenu />
              </button>
              <h1 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>
                {pageTitle}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#1565C0",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.875rem",
              }}>
                {adminUser?.name?.charAt(0)?.toUpperCase() ?? "A"}
              </div>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#333" }}>
                {adminUser?.name ?? "Admin"}
              </span>
            </div>
          </header>

          {/* Page content */}
          <main style={{
            flex: 1,
            background: "#F5F5F5",
            padding: "1.5rem",
            overflowY: "auto",
          }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
