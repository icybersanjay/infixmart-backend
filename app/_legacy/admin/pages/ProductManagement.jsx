"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MdEdit, MdDelete, MdAdd, MdSearch, MdMoreVert, MdStar } from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import TableRowSkeleton from "../../components/skeletons/TableRowSkeleton";
import EmptyState from "../../components/EmptyState";
import { MdInventory } from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";

const imgUrl = (p) => (p ? p : "");
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const primaryBtn = { padding: "0.55rem 1.1rem", background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.35rem" };
const greyBtn = { padding: "0.55rem 1.1rem", background: "#F5F5F5", color: "#555", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" };
const dangerBtn = { padding: "0.55rem 1.1rem", background: "#E53935", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" };


function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", padding: "1rem 0", flexWrap: "wrap" }}>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            width: 32, height: 32, borderRadius: 6, border: "1px solid",
            borderColor: p === page ? "#1565C0" : "#E0E0E0",
            background: p === page ? "#1565C0" : "#fff",
            color: p === page ? "#fff" : "#333",
            cursor: "pointer", fontWeight: p === page ? 600 : 400, fontSize: "0.875rem",
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export default function ProductManagement() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const debounceRef = useRef(null);

  const loadProducts = async (p = 1, q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, perPage: 20 });
      if (q) params.set("search", q);
      const res = await adminAxios.get(`/api/product?${params}`);
      setProducts(res.data.products || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(1, search); }, [search]);

  useEffect(() => {
    if (!openActionId) return undefined;

    const handleWindowClick = () => setOpenActionId(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, [openActionId]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handlePageChange = (p) => loadProducts(p, search);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/product/deleteproduct/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadProducts(page, search);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const handleQuickAction = async (product, action) => {
    const actionKey = `${product.id}:${action}`;
    setActionLoadingKey(actionKey);
    setOpenActionId(null);

    try {
      const res = await adminAxios.patch(`/api/product/quick-action/${product.id}`, { action });
      const updatedProduct = res.data.product;

      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, ...updatedProduct } : item))
      );

      toast.success(res.data.message || "Product updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoadingKey("");
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>
          All Products
          {!loading && <span style={{ fontWeight: 400, color: "#999", fontSize: "0.875rem", marginLeft: 8 }}>({products.length} shown)</span>}
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <MdSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: "1.1rem" }} />
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search products…"
              style={{ padding: "0.55rem 0.875rem 0.55rem 2rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.875rem", outline: "none", width: 200 }}
            />
          </div>
          <button onClick={() => router.push("/admin/products/new")} style={primaryBtn}>
            <MdAdd style={{ fontSize: "1.1rem" }} /> Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Image", "Name", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #E0E0E0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} widths={[50, 160, 90, 70, 55, 60, 80]} />)
                : products.length === 0
                ? <tr><td colSpan={7}><EmptyState icon={<MdInventory style={{ fontSize: 64 }} />} title="No products yet" subtitle="Add your first product to get started." actionLabel="Add Product" onAction={() => router.push('/admin/products/new')} /></td></tr>
                : products.map((product, i) => (
                    <tr key={product.id} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F0F0F0" }}>
                      {/* Image */}
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {product.images?.[0] ? (
                          <img
                            src={imgUrl(product.images[0])}
                            alt={product.name}
                            style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, border: "1px solid #E0E0E0" }}
                            onError={(e) => {
                              const fb = imgUrl(product.images[1]);
                              if (fb && e.target.src !== fb) { e.target.src = fb; } else { e.target.style.display = "none"; }
                            }}
                          />
                        ) : (
                          <div style={{ width: 50, height: 50, background: "#E8EAF6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#9FA8DA", fontSize: "0.75rem", textAlign: "center" }}>No img</div>
                        )}
                      </td>

                      {/* Name */}
                      <td style={{ padding: "0.65rem 1rem", maxWidth: 220 }}>
                        <div style={{ fontWeight: 500, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
                        {product.brand && <div style={{ color: "#999", fontSize: "0.78rem", marginTop: 2 }}>{product.brand}</div>}
                      </td>

                      {/* Category */}
                      <td style={{ padding: "0.65rem 1rem", color: "#555" }}>{product.catName || "—"}</td>

                      {/* Price */}
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#1A237E" }}>
                        {inr(product.price)}
                        {product.oldprice > 0 && (
                          <div style={{ color: "#999", textDecoration: "line-through", fontSize: "0.78rem" }}>{inr(product.oldprice)}</div>
                        )}
                      </td>

                      {/* Stock */}
                      <td style={{ padding: "0.65rem 1rem", color: product.countInStock > 0 ? "#333" : "#E53935", fontWeight: 500 }}>
                        {product.countInStock}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600,
                            background: product.countInStock > 0 ? "#E8F5E9" : "#FFEBEE",
                            color: product.countInStock > 0 ? "#00A651" : "#E53935",
                          }}>
                            {product.countInStock > 0 ? "In Stock" : "Out of Stock"}
                          </span>
                          {product.isFeatured && (
                            <span style={{
                              padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600,
                              background: "#FFF8E1",
                              color: "#F57C00",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                              <MdStar style={{ fontSize: "0.85rem" }} /> Featured
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.65rem 1rem", position: "relative" }}>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <button onClick={() => router.push(`/admin/products/${product.id}/edit`)} title="Edit" style={{ background: "#E3F2FD", border: "none", borderRadius: 6, padding: "0.35rem 0.5rem", cursor: "pointer", color: "#1565C0", fontSize: "1rem", display: "flex", alignItems: "center" }}>
                            <MdEdit />
                          </button>
                          <button onClick={() => setDeleteTarget(product)} title="Delete" style={{ background: "#FFEBEE", border: "none", borderRadius: 6, padding: "0.35rem 0.5rem", cursor: "pointer", color: "#E53935", fontSize: "1rem", display: "flex", alignItems: "center" }}>
                            <MdDelete />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId((prev) => (prev === product.id ? null : product.id));
                            }}
                            title="More actions"
                            style={{ background: "#F5F5F5", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.5rem", cursor: "pointer", color: "#555", fontSize: "1rem", display: "flex", alignItems: "center" }}
                          >
                            <MdMoreVert />
                          </button>
                        </div>
                        {openActionId === product.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              top: "calc(100% - 2px)",
                              right: 16,
                              minWidth: 190,
                              background: "#fff",
                              border: "1px solid #E0E0E0",
                              borderRadius: 8,
                              boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                              padding: "0.35rem",
                              zIndex: 20,
                            }}
                          >
                            {[
                              {
                                key: "edit",
                                label: "Edit Product",
                                onClick: () => router.push(`/admin/products/${product.id}/edit`),
                              },
                              {
                                key: "mark-sold-out",
                                label: "Mark Sold Out",
                                onClick: () => handleQuickAction(product, "mark-sold-out"),
                              },
                              {
                                key: "mark-in-stock",
                                label: "Restock Product",
                                onClick: () => handleQuickAction(product, "mark-in-stock"),
                              },
                              {
                                key: "toggle-featured",
                                label: product.isFeatured ? "Remove Featured" : "Mark Featured",
                                onClick: () => handleQuickAction(product, "toggle-featured"),
                              },
                              {
                                key: "delete",
                                label: "Delete Product",
                                onClick: () => setDeleteTarget(product),
                                danger: true,
                              },
                            ].map((item) => {
                              const isBusy = actionLoadingKey === `${product.id}:${item.key}`;

                              return (
                                <button
                                  key={item.key}
                                  onClick={item.onClick}
                                  disabled={Boolean(actionLoadingKey)}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    background: "transparent",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "0.55rem 0.7rem",
                                    cursor: actionLoadingKey ? "not-allowed" : "pointer",
                                    color: item.danger ? "#E53935" : "#333",
                                    fontSize: "0.84rem",
                                    fontWeight: 500,
                                    opacity: isBusy ? 0.6 : 1,
                                  }}
                                >
                                  {isBusy ? "Updating..." : item.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "2rem", width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#1A237E", marginBottom: "0.75rem", fontSize: "1.05rem" }}>Delete Product</h3>
            <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={greyBtn}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ ...dangerBtn, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
