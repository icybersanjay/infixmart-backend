"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MdEdit, MdDelete, MdAdd, MdSearch, MdMoreVert, MdStar, MdInventory, MdWarning, MdArchive, MdRestore, MdCheck, MdClose, MdUpload, MdDownload } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";
import EmptyState from "../../../_legacy/components/EmptyState";
import toast, { Toaster } from "react-hot-toast";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const LOW_STOCK_THRESHOLD = 5;

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex gap-1.5 justify-center py-4 flex-wrap px-4">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-[13px] font-[500] border transition-colors ${
            p === page ? "bg-[#1565C0] text-white border-[#1565C0]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1565C0]"
          }`}>
          {p}
        </button>
      ))}
    </div>
  );
}

function ActionMenu({ product, onEdit, onDelete, onQuickAction, busyKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const items = [
    { key: "edit",            label: "Edit Product",                  onClick: onEdit },
    { key: "mark-sold-out",   label: "Mark Sold Out",                 onClick: () => onQuickAction("mark-sold-out") },
    { key: "mark-in-stock",   label: "Restock Product",               onClick: () => onQuickAction("mark-in-stock") },
    { key: "toggle-featured", label: product.isFeatured ? "Remove Featured" : "Mark Featured", onClick: () => onQuickAction("toggle-featured") },
    { key: "delete",          label: "Delete Product",                onClick: onDelete, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors border border-gray-200">
        <MdMoreVert className="text-[18px]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
          {items.map((item) => {
            const busy = busyKey === `${product.id}:${item.key}`;
            return (
              <button key={item.key} onClick={() => { item.onClick(); setOpen(false); }} disabled={!!busyKey}
                className={`w-full text-left px-4 py-2.5 text-[13px] font-[500] transition-colors ${
                  item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
                } disabled:opacity-50`}>
                {busy ? "Updating…" : item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── URL-driven state: page + search + status all live in the query string,
  //    so bookmarks/back-button/share work and state survives reloads.
  const urlPage   = Math.max(1, Number(searchParams.get("page") || 1));
  const urlSearch = searchParams.get("search") || "";
  const urlStatus = searchParams.get("status") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState("");
  const debounceRef = useRef(null);

  const lowStockProducts = products.filter((p) => Number(p.countInStock) <= LOW_STOCK_THRESHOLD && Number(p.countInStock) >= 0);
  const allOnPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  // Push state into the URL. `replace` so we don't pollute history with
  // every keystroke; `scroll: false` to keep the page steady as filters change.
  const writeUrl = (next) => {
    const params = new URLSearchParams();
    const finalPage = next.page ?? urlPage;
    const finalSearch = next.search !== undefined ? next.search : urlSearch;
    const finalStatus = next.status !== undefined ? next.status : urlStatus;
    if (finalPage > 1) params.set("page", String(finalPage));
    if (finalSearch) params.set("search", finalSearch);
    if (finalStatus) params.set("status", finalStatus);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(urlPage), perPage: "20", includeAllStatuses: "true" });
      if (urlSearch) params.set("search", urlSearch);
      if (urlStatus) params.set("status", urlStatus);
      const res = await adminAxios.get(`/api/product?${params}`);
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
      // Drop any selection that's no longer on the page.
      setSelectedIds((prev) => {
        const next = new Set();
        for (const p of res.data.products || []) {
          if (prev.has(p.id)) next.add(p.id);
        }
        return next;
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Re-fetch whenever any URL filter changes.
  useEffect(() => { loadProducts(); /* eslint-disable-next-line */ }, [urlPage, urlSearch, urlStatus]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => writeUrl({ search: val, page: 1 }), 400);
  };

  const handleStatusFilter = (val) => {
    writeUrl({ status: val, page: 1 });
  };

  const handlePageChange = (p) => {
    writeUrl({ page: p });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/product/deleteproduct/${deleteTarget.id}`);
      toast.success("Product archived. Restore it from Status: archived.");
      setDeleteTarget(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      toast.error("Could not archive product.");
    } finally { setDeleting(false); }
  };

  // ── Bulk select helpers ────────────────────────────────────────────────
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        for (const p of products) next.delete(p.id);
        return next;
      }
      const next = new Set(prev);
      for (const p of products) next.add(p.id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetStatus = async (status) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(status);
    try {
      const ids = Array.from(selectedIds);
      const res = await adminAxios.post("/api/product/bulk-status", { ids, status });
      toast.success(res.data?.message || "Updated");
      clearSelection();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk update failed");
    } finally { setBulkBusy(""); }
  };

  const bulkArchive = () => bulkSetStatus("archived");
  const bulkActivate = () => bulkSetStatus("active");

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Archive ${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"}? You can restore them by filtering Status: archived.`)) return;
    setBulkBusy("delete");
    try {
      const ids = Array.from(selectedIds);
      const res = await adminAxios.post("/api/product/delete-multiple", { ids });
      toast.success(res.data?.message || "Archived");
      clearSelection();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk delete failed");
    } finally { setBulkBusy(""); }
  };

  const handleQuickAction = async (product, action) => {
    const actionKey = `${product.id}:${action}`;
    setActionLoadingKey(actionKey);
    try {
      const res = await adminAxios.patch(`/api/product/quick-action/${product.id}`, { action });
      setProducts((prev) => prev.map((item) => item.id === product.id ? { ...item, ...res.data.product } : item));
      toast.success(res.data.message || "Product updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally { setActionLoadingKey(""); }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-[16px] font-[700] text-[#1A237E]">
          Products {!loading && <span className="font-[400] text-gray-400 text-[13px]">({products.length} shown)</span>}
        </h2>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={urlStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="h-10 px-3 pr-8 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 bg-white cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <div className="relative flex-1 sm:flex-none">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" />
            <input value={searchInput} onChange={handleSearchChange} placeholder="Search products…"
              className="w-full sm:w-52 pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10" />
          </div>
          <button
            onClick={async () => {
              try {
                const res = await adminAxios.get(`/api/admin/export/products${urlStatus ? `?status=${urlStatus}` : ""}`, { responseType: "blob" });
                const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
                const a = document.createElement("a");
                a.href = url; a.download = `products-${Date.now()}.csv`; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error("Export failed"); }
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0] text-[12.5px] font-[600] rounded-xl text-gray-600 transition-colors whitespace-nowrap"
            title="Export filtered products to CSV"
          >
            <MdDownload className="text-[16px]" /> Export
          </button>
          <button onClick={() => router.push("/admin/products/import")}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0] text-[12.5px] font-[600] rounded-xl text-gray-600 transition-colors whitespace-nowrap"
            title="Bulk-import products from a CSV"
          >
            <MdUpload className="text-[16px]" /> Import
          </button>
          <button onClick={() => router.push("/admin/products/new")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors whitespace-nowrap shadow-sm">
            <MdAdd className="text-[18px]" /> Add Product
          </button>
        </div>
      </div>

      {/* Sticky bulk-action toolbar (appears when > 0 selected) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 bg-[#1A237E] text-white shadow-lg rounded-2xl px-4 py-2.5">
          <span className="text-[13px] font-[700]">
            {selectedIds.size} selected
          </span>
          <span className="text-[12px] text-white/60 hidden sm:inline">·</span>
          <div className="flex gap-2 flex-wrap items-center ml-auto sm:ml-2">
            <button
              onClick={bulkActivate}
              disabled={!!bulkBusy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-[600] bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
            >
              <MdRestore className="text-[14px]" />
              {bulkBusy === "active" ? "Activating…" : "Activate"}
            </button>
            <button
              onClick={bulkArchive}
              disabled={!!bulkBusy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-[600] bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
            >
              <MdArchive className="text-[14px]" />
              {bulkBusy === "archived" ? "Archiving…" : "Archive"}
            </button>
            <button
              onClick={bulkDelete}
              disabled={!!bulkBusy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-[600] bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
            >
              <MdDelete className="text-[14px]" />
              {bulkBusy === "delete" ? "Working…" : "Delete"}
            </button>
            <button
              onClick={clearSelection}
              disabled={!!bulkBusy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-[600] bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
              aria-label="Clear selection"
            >
              <MdClose className="text-[14px]" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Low stock alert */}
      {!loading && lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MdWarning className="text-amber-500 text-[18px]" />
            <p className="text-[13px] font-[700] text-amber-800">
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} low on stock (≤{LOW_STOCK_THRESHOLD} units)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span key={p.id} onClick={() => router.push(`/admin/products/${p.id}/edit`)}
                className={`text-[11px] font-[600] px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  Number(p.countInStock) === 0 ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                }`}>
                {p.name} — {Number(p.countInStock) === 0 ? "Out of Stock" : `${p.countInStock} left`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFF]">
                <th scope="col" className="px-4 py-3 w-10 border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on this page"
                    className="w-4 h-4 accent-[#1565C0] cursor-pointer rounded"
                  />
                </th>
                {["Image", "Name", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={8} widths={[20, 50, 160, 90, 70, 55, 60, 80]} />)
                : products.length === 0
                ? <tr><td colSpan={8}><EmptyState icon={<MdInventory style={{ fontSize: 64 }} />} title="No products yet" subtitle="Add your first product to get started." actionLabel="Add Product" onAction={() => router.push("/admin/products/new")} /></td></tr>
                : products.map((product, i) => {
                    const checked = selectedIds.has(product.id);
                    return (
                    <tr key={product.id} className={`border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors ${checked ? "bg-blue-50/40" : i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(product.id)}
                          aria-label={`Select ${product.name}`}
                          className="w-4 h-4 accent-[#1565C0] cursor-pointer rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {product.images?.[0]
                          ? <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded-xl border border-gray-100" onError={(e) => { e.target.style.display = "none"; }} />
                          : <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-[10px]">No img</div>
                        }
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="font-[500] text-gray-800 truncate">{product.name}</div>
                        {product.brand && <div className="text-[11px] text-gray-400 mt-0.5">{product.brand}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{product.catName || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-[600] text-[#1A237E]">{inr(product.price)}</div>
                        {product.oldprice > 0 && <div className="text-[11px] text-gray-400 line-through">{inr(product.oldprice)}</div>}
                      </td>
                      <td className={`px-4 py-3 font-[600] ${product.countInStock > 0 ? "text-gray-700" : "text-red-600"}`}>
                        {product.countInStock}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-[600] ${product.countInStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {product.countInStock > 0 ? "In Stock" : "Out of Stock"}
                          </span>
                          {product.isFeatured && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-[600] bg-amber-100 text-amber-700 flex items-center gap-0.5">
                              <MdStar className="text-[12px]" /> Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                            className="p-1.5 bg-blue-50 rounded-lg text-[#1565C0] hover:bg-blue-100 transition-colors border border-blue-100">
                            <MdEdit className="text-[16px]" />
                          </button>
                          <button onClick={() => setDeleteTarget(product)}
                            className="p-1.5 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 transition-colors border border-red-100">
                            <MdDelete className="text-[16px]" />
                          </button>
                          <ActionMenu
                            product={product}
                            onEdit={() => router.push(`/admin/products/${product.id}/edit`)}
                            onDelete={() => setDeleteTarget(product)}
                            onQuickAction={(action) => handleQuickAction(product, action)}
                            busyKey={actionLoadingKey}
                          />
                        </div>
                      </td>
                    </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <Pagination page={urlPage} totalPages={totalPages} onChange={handlePageChange} />
      </div>

      {/* Mobile card grid */}
      <div className="md:hidden">
        {loading
          ? <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-2">
                  <div className="w-full h-28 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-3.5 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          : products.length === 0
          ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-[13px]">
              No products yet.{" "}
              <button onClick={() => router.push("/admin/products/new")} className="text-[#1565C0] font-[600]">Add one</button>
            </div>
          : <>
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const checked = selectedIds.has(product.id);
                  return (
                  <div key={product.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${checked ? "border-[#1565C0] ring-2 ring-[#1565C0]/15" : "border-gray-100"}`}>
                    {/* Image */}
                    <div className="relative">
                      {product.images?.[0]
                        ? <img src={product.images[0]} alt={product.name} className="w-full h-28 object-cover" />
                        : <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-gray-300 text-[11px]">No image</div>
                      }
                      {/* Selection checkbox — top-left, doesn't conflict with the Featured badge */}
                      <label className="absolute top-1.5 left-1.5 inline-flex items-center justify-center w-5 h-5 rounded bg-white/90 border border-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(product.id)}
                          aria-label={`Select ${product.name}`}
                          className="w-3.5 h-3.5 accent-[#1565C0] cursor-pointer"
                        />
                      </label>
                      {product.isFeatured && (
                        <span className="absolute top-1.5 left-9 px-1.5 py-0.5 bg-amber-400 text-white text-[9px] font-[700] rounded-full flex items-center gap-0.5">
                          <MdStar className="text-[10px]" /> Featured
                        </span>
                      )}
                      <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-[700] rounded-full ${product.countInStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {product.countInStock > 0 ? `${product.countInStock} left` : "Out"}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="p-2.5">
                      <div className="text-[12px] font-[600] text-gray-800 truncate mb-0.5">{product.name}</div>
                      <div className="text-[11px] text-gray-400 truncate mb-2">{product.catName || product.brand || "—"}</div>
                      <div className="text-[13px] font-[800] text-[#1A237E] mb-2">{inr(product.price)}</div>
                      <div className="flex gap-1.5">
                        <button onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="flex-1 py-1.5 bg-blue-50 text-[#1565C0] text-[11px] font-[600] rounded-lg hover:bg-blue-100 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setDeleteTarget(product)}
                          className="flex-1 py-1.5 bg-red-50 text-red-600 text-[11px] font-[600] rounded-lg hover:bg-red-100 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              <Pagination page={urlPage} totalPages={totalPages} onChange={handlePageChange} />
            </>
        }
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-[16px] font-[700] text-[#1A237E] mb-2">Delete Product</h3>
            <p className="text-[13px] text-gray-600 mb-5 leading-relaxed">
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-[13px] font-[600] rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-[600] rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
