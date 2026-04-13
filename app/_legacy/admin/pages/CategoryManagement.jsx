import { useEffect, useRef, useState } from "react";
import { MdEdit, MdDelete, MdClose, MdAdd } from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import TableRowSkeleton from "../../components/skeletons/TableRowSkeleton";
import EmptyState from "../../components/EmptyState";
import { required, minLength } from "../../hooks/useForm";


const imgUrl = (p) => (p ? p : "");

function flatten(cats, depth = 0) {
  return cats.flatMap((cat) => [
    { ...cat, depth },
    ...flatten(cat.children || [], depth + 1),
  ]);
}


const primaryBtn = { padding: "0.55rem 1.1rem", background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.35rem" };
const greyBtn = { padding: "0.55rem 1.1rem", background: "#F5F5F5", color: "#555", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" };
const dangerBtn = { padding: "0.55rem 1.1rem", background: "#E53935", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" };
const inputStyle = { width: "100%", padding: "0.6rem 0.875rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "0.35rem", fontSize: "0.875rem", fontWeight: 500, color: "#333" };

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", parentCatId: "", parentCatName: "", images: [] });
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/category");
      setCategories(flatten(res.data.data || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, []);

  const validateName = (val) =>
    required('Category name is required')(val) || minLength(2, 'Name must be at least 2 characters')(val);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", parentCatId: "", parentCatName: "", images: [] });
    setNameError('');
    setModal(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({ name: cat.name, parentCatId: cat.parentCatId ? String(cat.parentCatId) : "", parentCatName: cat.parentCatName || "", images: cat.images || [] });
    setNameError('');
    setModal(true);
  };

  const handleParentChange = (e) => {
    const id = e.target.value;
    const parent = categories.find((c) => String(c.id) === id);
    setForm((f) => ({ ...f, parentCatId: id, parentCatName: parent?.name || "" }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("images", file);
      const res = await adminAxios.post("/api/category/upload-images", fd);
      setForm((f) => ({ ...f, images: [res.data.images[0]] }));
    } catch (err) { console.error(err); }
    finally { setImgUploading(false); }
  };

  const handleSave = async () => {
    const err = validateName(form.name);
    if (err) { setNameError(err); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), images: form.images, parentCatId: form.parentCatId || null, parentCatName: form.parentCatName || null };
      if (editItem) {
        await adminAxios.put(`/api/category/${editItem.id}`, payload);
      } else {
        await adminAxios.post("/api/category/createcat", payload);
      }
      setModal(false);
      loadCategories();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/category/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadCategories();
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  // All categories except self + descendants when editing
  const parentOptions = editItem
    ? (() => {
        const isDescendant = (cat) => {
          let c = cat;
          while (c) {
            if (String(c.id) === String(editItem.id)) return true;
            c = categories.find((x) => String(x.id) === String(c.parentCatId));
          }
          return false;
        };
        return categories.filter((c) => !isDescendant(c));
      })()
    : categories;

  const autoSlug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>
          All Categories
          {!loading && <span style={{ fontWeight: 400, color: "#999", fontSize: "0.875rem", marginLeft: 8 }}>({categories.length})</span>}
        </h2>
        <button onClick={openAdd} style={primaryBtn}>
          <MdAdd style={{ fontSize: "1.1rem" }} /> Add Category
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Image", "Name", "Parent", "Type", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #E0E0E0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} widths={[40, 160, 110, 70, 80]} />)
                : categories.length === 0
                ? <tr><td colSpan={5}><EmptyState title="No categories yet" subtitle="Add your first category to organise products." actionLabel="Add Category" onAction={openAdd} /></td></tr>
                : categories.map((cat, i) => (
                    <tr key={cat.id} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F0F0F0" }}>
                      {/* Image */}
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {cat.images?.[0] ? (
                          <img src={imgUrl(cat.images[0])} alt={cat.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid #E0E0E0" }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E8EAF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#7986CB", fontWeight: 700, fontSize: "0.9rem" }}>
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>

                      {/* Name indented */}
                      <td style={{ padding: "0.65rem 1rem", paddingLeft: `${1 + cat.depth * 1.5}rem` }}>
                        {cat.depth > 0 && <span style={{ color: "#ccc", marginRight: 4, fontSize: "0.8rem" }}>{"└ "}</span>}
                        <span style={{ fontWeight: cat.depth === 0 ? 600 : 400, color: "#222" }}>{cat.name}</span>
                      </td>

                      {/* Parent */}
                      <td style={{ padding: "0.65rem 1rem", color: "#666" }}>
                        {cat.parentCatName || <span style={{ color: "#ccc" }}>—</span>}
                      </td>

                      {/* Type badge */}
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{
                          padding: "0.18rem 0.6rem", borderRadius: 999, fontSize: "0.73rem", fontWeight: 600,
                          background: cat.depth === 0 ? "#E3F2FD" : cat.depth === 1 ? "#EDE7F6" : "#FFF8E1",
                          color: cat.depth === 0 ? "#1565C0" : cat.depth === 1 ? "#6A1B9A" : "#E65100",
                        }}>
                          {["Root", "Sub", "Third"][cat.depth] ?? "Sub"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => openEdit(cat)} title="Edit" style={{ background: "#E3F2FD", border: "none", borderRadius: 6, padding: "0.35rem 0.5rem", cursor: "pointer", color: "#1565C0", fontSize: "1rem", display: "flex", alignItems: "center" }}>
                            <MdEdit />
                          </button>
                          <button onClick={() => setDeleteTarget(cat)} title="Delete" style={{ background: "#FFEBEE", border: "none", borderRadius: 6, padding: "0.35rem 0.5rem", cursor: "pointer", color: "#E53935", fontSize: "1rem", display: "flex", alignItems: "center" }}>
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 10, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 1.5rem", borderBottom: "1px solid #E0E0E0" }}>
              <h3 style={{ margin: 0, color: "#1A237E", fontSize: "1rem", fontWeight: 600 }}>
                {editItem ? "Edit Category" : "Add Category"}
              </h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "1.3rem", lineHeight: 1 }}><MdClose /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "1.5rem" }}>
              <label style={labelStyle}>Name <span style={{ color: "#E53935" }}>*</span></label>
              <input
                style={{ ...inputStyle, marginBottom: nameError ? "0.25rem" : "1rem", borderColor: nameError ? "#E53935" : "#ddd" }}
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(''); }}
                onBlur={(e) => setNameError(validateName(e.target.value))}
                placeholder="e.g. Electronics"
              />
              {nameError && <p style={{ color: "#E53935", fontSize: "0.78rem", marginBottom: "0.75rem" }}>{nameError}</p>}

              <label style={labelStyle}>Slug (auto-generated)</label>
              <input style={{ ...inputStyle, marginBottom: "1rem", background: "#F5F5F5", color: "#888" }} value={autoSlug} readOnly />

              <label style={labelStyle}>Parent Category <span style={{ color: "#999", fontSize: "0.8rem" }}>(optional)</span></label>
              <select style={{ ...inputStyle, marginBottom: "1rem", background: "#fff" }} value={form.parentCatId} onChange={handleParentChange}>
                <option value="">— None (root category) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}
                  </option>
                ))}
              </select>

              <label style={labelStyle}>Category Image</label>
              <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.4rem", marginTop: 0 }}>
                📐 <strong>300 × 300 px</strong> square recommended. Shown as the category thumbnail. JPG or WebP.
              </p>
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: "2px dashed #BDBDBD", borderRadius: 8, padding: "1rem", textAlign: "center", cursor: "pointer", marginBottom: "0.75rem", background: "#FAFAFA", color: "#888", fontSize: "0.875rem" }}
              >
                {imgUploading ? "Uploading…" : "Click to upload image"}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />

              {form.images?.[0] && (
                <div style={{ position: "relative", display: "inline-block", marginBottom: "0.5rem" }}>
                  <img src={imgUrl(form.images[0])} alt="preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #E0E0E0" }} />
                  <button
                    onClick={() => setForm((f) => ({ ...f, images: [] }))}
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E53935", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >×</button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: "1px solid #E0E0E0" }}>
              <button onClick={() => setModal(false)} style={greyBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !!nameError || !form.name.trim()} style={{ ...primaryBtn, opacity: saving || !!nameError || !form.name.trim() ? 0.6 : 1, cursor: saving || !!nameError || !form.name.trim() ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "2rem", width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#1A237E", marginBottom: "0.75rem", fontSize: "1.05rem" }}>Delete Category</h3>
            <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?{" "}
              All subcategories will also be removed. This cannot be undone.
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
