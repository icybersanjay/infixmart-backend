/**
 * Admin — Home Page Management
 *
 * Tabs:
 *  1. Sections      — toggle visibility and drag-reorder all home sections
 *  2. Collections   — CRUD for "Shop by Collection" cards
 *  3. Price Tiers   — CRUD for "Shop by Price" cards
 *  4. Why Choose Us — CRUD for benefit icons
 *  5. Stats Bar     — CRUD for stats numbers
 *  6. Flash Deals   — config title / subtitle / max-price
 *  7. Newsletter    — config title / subtitle / footer text
 */

import { useEffect, useRef, useState } from "react";
import {
  MdAdd, MdClose, MdDelete, MdEdit, MdCheck,
  MdVisibility, MdVisibilityOff,
  MdKeyboardArrowUp, MdKeyboardArrowDown,
  MdSave,
} from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import toast, { Toaster } from "react-hot-toast";


/* ── shared styles ─────────────────────────────────────────────────────────── */
const btn = (bg, color = "#fff", border) => ({
  padding: "0.5rem 1rem", background: bg, color, border: border || "none",
  borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem",
  display: "flex", alignItems: "center", gap: "0.35rem",
});
const primaryBtn  = btn("#1565C0");
const dangerBtn   = btn("#E53935");
const greyBtn     = btn("#F5F5F5", "#555", "1px solid #ddd");
const successBtn  = btn("#2E7D32");
const inputStyle  = { width: "100%", padding: "0.6rem 0.875rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle  = { display: "block", marginBottom: "0.35rem", fontSize: "0.875rem", fontWeight: 600, color: "#444" };
const card        = { background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1rem" };
const formGroup   = { marginBottom: "1rem" };

const imgSrc = (p) => {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  return p;
};

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
const TABS = [
  { key: "sections",      label: "Sections" },
  { key: "collections",   label: "Collections" },
  { key: "price_tiers",   label: "Price Tiers" },
  { key: "why_choose_us", label: "Why Choose Us" },
  { key: "stats",         label: "Stats Bar" },
  { key: "flash_deals",   label: "Flash Deals" },
  { key: "newsletter",    label: "Newsletter" },
];

/* ── Color picker helper ───────────────────────────────────────────────────── */
const ColorField = ({ label, value, onChange }) => (
  <div style={formGroup}>
    <label style={labelStyle}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input type="color" value={value?.startsWith("#") ? value : "#1565C0"} onChange={(e) => onChange(e.target.value)}
        style={{ width: 40, height: 36, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", padding: 2 }} />
      <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. #1565C0 or linear-gradient(…)"
        style={{ ...inputStyle, flex: 1 }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   1. SECTIONS TAB — visibility + order
═══════════════════════════════════════════════════════════════════════════ */
function SectionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/admin/homepage");
      const sectionConfigItems = (res.data.items || [])
        .filter((i) => i.section === "section_config")
        .sort((a, b) => a.order - b.order);
      setItems(sectionConfigItems);
    } catch { toast.error("Failed to load sections"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleVisibility = async (item) => {
    setSaving(item.id);
    try {
      await adminAxios.put(`/api/admin/homepage/${item.id}`, { isActive: !item.isActive });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
      toast.success("Updated");
    } catch { toast.error("Update failed"); }
    finally { setSaving(null); }
  };

  const moveSection = async (idx, dir) => {
    const sorted = [...items];
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[targetIdx];
    const aOrder = b.order;
    const bOrder = a.order;

    try {
      await Promise.all([
        adminAxios.put(`/api/admin/homepage/${a.id}`, { order: aOrder }),
        adminAxios.put(`/api/admin/homepage/${b.id}`, { order: bOrder }),
      ]);
      setItems((prev) => {
        const updated = prev.map((i) => {
          if (i.id === a.id) return { ...i, order: aOrder };
          if (i.id === b.id) return { ...i, order: bOrder };
          return i;
        });
        return updated.sort((x, y) => x.order - y.order);
      });
    } catch { toast.error("Reorder failed"); }
  };

  if (loading) return <div style={{ color: "#999", padding: "2rem" }}>Loading…</div>;

  return (
    <div>
      <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
        Toggle which sections appear on the home page and drag to reorder them.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ ...card, display: "flex", alignItems: "center", gap: "1rem", opacity: item.isActive ? 1 : 0.55 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.title || item.key}</span>
              <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#999" }}>({item.key})</span>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button onClick={() => moveSection(idx, "up")} disabled={idx === 0}
                style={{ ...greyBtn, opacity: idx === 0 ? 0.4 : 1, padding: "0.4rem" }} title="Move up">
                <MdKeyboardArrowUp />
              </button>
              <button onClick={() => moveSection(idx, "down")} disabled={idx === items.length - 1}
                style={{ ...greyBtn, opacity: idx === items.length - 1 ? 0.4 : 1, padding: "0.4rem" }} title="Move down">
                <MdKeyboardArrowDown />
              </button>
              <button onClick={() => toggleVisibility(item)} disabled={saving === item.id}
                style={item.isActive ? successBtn : greyBtn} title={item.isActive ? "Hide section" : "Show section"}>
                {item.isActive ? <MdVisibility /> : <MdVisibilityOff />}
                {item.isActive ? "Visible" : "Hidden"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERIC CARD LIST — used for collections, price_tiers, why_choose_us, stats
═══════════════════════════════════════════════════════════════════════════ */
function CardListTab({ section, fields }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | item-object
  const [form, setForm] = useState({});
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/admin/homepage");
      const filtered = (res.data.items || []).filter((i) => i.section === section);
      setItems(filtered.sort((a, b) => a.order - b.order));
    } catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [section]);

  const openCreate = () => {
    setForm({ section, key: "", title: "", subtitle: "", image: "", link: "", badge: "", badgeColor: "#1565C0", bgColor: "#F5F7FF", textColor: "#111827", isActive: true, order: items.length + 1, meta: "" });
    setModal("create");
  };

  const openEdit = (item) => {
    setForm({ ...item, meta: item.meta || "" });
    setModal("edit");
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminAxios.post("/api/admin/homepage/upload", fd);
      set("image", res.data.image);
    } catch { toast.error("Upload failed"); }
    finally { setImgUploading(false); e.target.value = ""; }
  };

  const handleSave = async () => {
    if (!form.key) return toast.error("Key is required");
    setSaving(true);
    try {
      if (modal === "create") {
        const res = await adminAxios.post("/api/admin/homepage", form);
        setItems((prev) => [...prev, res.data.item].sort((a, b) => a.order - b.order));
        toast.success("Item created");
      } else {
        await adminAxios.put(`/api/admin/homepage/${form.id}`, form);
        setItems((prev) => prev.map((i) => i.id === form.id ? { ...i, ...form } : i));
        toast.success("Item updated");
      }
      setModal(null);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/admin/homepage/${deleteTarget.id}`);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success("Deleted");
      setDeleteTarget(null);
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  const moveItem = async (idx, dir) => {
    const sorted = [...items];
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[targetIdx];
    try {
      await Promise.all([
        adminAxios.put(`/api/admin/homepage/${a.id}`, { order: b.order }),
        adminAxios.put(`/api/admin/homepage/${b.id}`, { order: a.order }),
      ]);
      setItems((prev) => {
        const updated = prev.map((i) => {
          if (i.id === a.id) return { ...i, order: b.order };
          if (i.id === b.id) return { ...i, order: a.order };
          return i;
        });
        return updated.sort((x, y) => x.order - y.order);
      });
    } catch { toast.error("Reorder failed"); }
  };

  const toggleActive = async (item) => {
    try {
      await adminAxios.put(`/api/admin/homepage/${item.id}`, { isActive: !item.isActive });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    } catch { toast.error("Update failed"); }
  };

  if (loading) return <div style={{ color: "#999", padding: "2rem" }}>Loading…</div>;

  const sectionTips = {
    collection: "Collections appear as category cards (e.g. Men's, Women's). Use 500 × 500 px images. Add a Link URL to filter products by category.",
    price_tiers: "Price tier cards (e.g. Under ₹199). No image needed — set background colors. Set maxPrice in Meta JSON: {\"maxPrice\": 199}. Link: /productListing?maxPrice=199",
    why_choose_us: "Trust badges shown to customers. 3–5 items ideal. Title = benefit name, Subtitle = short description. Use colors to style each card.",
    stats: "Trust numbers (e.g. 10,000+ Products). Title = the number/stat, Subtitle = the label below it. No images needed.",
  };

  return (
    <div>
      {sectionTips[section] && (
        <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, padding: "0.65rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#5D4037" }}>
          💡 <strong>Tip:</strong> {sectionTips[section]}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button onClick={openCreate} style={primaryBtn}><MdAdd /> Add Item</button>
      </div>

      {items.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: "#999", border: "2px dashed #E0E0E0" }}>
          No items yet. Click "Add Item" to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ ...card, position: "relative", opacity: item.isActive ? 1 : 0.6 }}>
              {item.image && (
                <img src={imgSrc(item.image)} alt={item.title}
                  style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, marginBottom: "0.75rem" }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title || item.key}</p>
                  {item.subtitle && <p style={{ fontSize: "0.8rem", color: "#666", marginTop: 2 }}>{item.subtitle}</p>}
                  {item.badge && (
                    <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.7rem", fontWeight: 700, background: item.badgeColor || "#1565C0", color: "#fff", borderRadius: 99, padding: "0.1rem 0.5rem" }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginLeft: "0.5rem" }}>
                  <button onClick={() => openEdit(item)} style={{ ...greyBtn, padding: "0.3rem 0.5rem" }} title="Edit"><MdEdit /></button>
                  <button onClick={() => toggleActive(item)} style={{ ...greyBtn, padding: "0.3rem 0.5rem" }} title={item.isActive ? "Hide" : "Show"}>
                    {item.isActive ? <MdVisibility style={{ color: "#2E7D32" }} /> : <MdVisibilityOff style={{ color: "#999" }} />}
                  </button>
                  <button onClick={() => setDeleteTarget(item)} style={{ ...dangerBtn, padding: "0.3rem 0.5rem" }} title="Delete"><MdDelete /></button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.6rem" }}>
                <button onClick={() => moveItem(idx, "up")} disabled={idx === 0}
                  style={{ ...greyBtn, flex: 1, justifyContent: "center", padding: "0.3rem", opacity: idx === 0 ? 0.4 : 1 }}>
                  <MdKeyboardArrowUp />
                </button>
                <button onClick={() => moveItem(idx, "down")} disabled={idx === items.length - 1}
                  style={{ ...greyBtn, flex: 1, justifyContent: "center", padding: "0.3rem", opacity: idx === items.length - 1 ? 0.4 : 1 }}>
                  <MdKeyboardArrowDown />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 10, width: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid #E0E0E0" }}>
              <h3 style={{ margin: 0, color: "#1A237E", fontSize: "1rem", fontWeight: 700 }}>
                {modal === "create" ? "Add Item" : "Edit Item"}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#666" }}><MdClose /></button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={formGroup}>
                <label style={labelStyle}>Key <span style={{ color: "#E53935" }}>*</span></label>
                <input style={inputStyle} value={form.key || ""} onChange={(e) => set("key", e.target.value)} placeholder="unique_identifier (no spaces)" />
              </div>

              {fields.includes("title") && (
                <div style={formGroup}>
                  <label style={labelStyle}>Title</label>
                  <input style={inputStyle} value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. New Arrivals" />
                </div>
              )}

              {fields.includes("subtitle") && (
                <div style={formGroup}>
                  <label style={labelStyle}>Subtitle / Description</label>
                  <input style={inputStyle} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="Short description" />
                </div>
              )}

              {fields.includes("image") && (
                <div style={formGroup}>
                  <label style={labelStyle}>Image</label>
                  <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.4rem", marginTop: 0 }}>
                    📐 Recommended: <strong>500 × 500 px</strong> (square). JPG or WebP for best quality &amp; speed.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    {form.image && (
                      <img src={imgSrc(form.image)} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #E0E0E0" }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <input type="text" style={{ ...inputStyle, marginBottom: "0.35rem" }} value={form.image || ""} onChange={(e) => set("image", e.target.value)} placeholder="Paste URL or upload below" />
                      <button onClick={() => fileRef.current.click()} style={{ ...greyBtn, fontSize: "0.8rem" }}>
                        {imgUploading ? "Uploading…" : "Upload Image"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>
              )}

              {fields.includes("link") && (
                <div style={formGroup}>
                  <label style={labelStyle}>Link URL</label>
                  <input style={inputStyle} value={form.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="e.g. /productListing?sort=newest" />
                </div>
              )}

              {fields.includes("badge") && (
                <div style={formGroup}>
                  <label style={labelStyle}>Badge Text</label>
                  <input style={inputStyle} value={form.badge || ""} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. Just In" />
                </div>
              )}

              {fields.includes("colors") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <ColorField label="Background Color / Gradient" value={form.bgColor} onChange={(v) => set("bgColor", v)} />
                  <ColorField label="Text / Icon Color" value={form.textColor} onChange={(v) => set("textColor", v)} />
                  <ColorField label="Badge / Border Color" value={form.badgeColor} onChange={(v) => set("badgeColor", v)} />
                </div>
              )}

              {fields.includes("meta") && (
                <div style={formGroup}>
                  <label style={labelStyle}>Meta (JSON — e.g. maxPrice, icon)</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "monospace" }}
                    value={form.meta || ""} onChange={(e) => set("meta", e.target.value)}
                    placeholder='{"maxPrice": 499}' />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActive" checked={!!form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                <label htmlFor="isActive" style={{ fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>Active (visible)</label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: "1px solid #E0E0E0" }}>
              <button onClick={() => setModal(null)} style={greyBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : <><MdSave /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "2rem", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#1A237E", marginBottom: "0.75rem" }}>Delete Item</h3>
            <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Are you sure you want to delete "<strong>{deleteTarget.title || deleteTarget.key}</strong>"? This cannot be undone.
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

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLE-ITEM CONFIG TAB — flash_deals, newsletter (just one row to edit)
═══════════════════════════════════════════════════════════════════════════ */
function SingleConfigTab({ section, fields, description }) {
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get(`/api/homepage/${section}`);
      const first = (res.data.items || [])[0];
      if (first) { setItem(first); setForm({ ...first, meta: first.meta || "" }); }
    } catch { toast.error("Failed to load config"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [section]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await adminAxios.put(`/api/admin/homepage/${item.id}`, form);
      setItem((prev) => ({ ...prev, ...form }));
      toast.success("Saved!");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: "#999", padding: "2rem" }}>Loading…</div>;
  if (!item)   return <div style={{ color: "#E53935", padding: "2rem" }}>Config not found. Please restart the server to re-seed.</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      {description && <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{description}</p>}
      <div style={card}>
        {fields.includes("title") && (
          <div style={formGroup}>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={form.title || ""} onChange={(e) => set("title", e.target.value)} />
          </div>
        )}
        {fields.includes("subtitle") && (
          <div style={formGroup}>
            <label style={labelStyle}>Subtitle / Description</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
        )}
        {fields.includes("badge") && (
          <div style={formGroup}>
            <label style={labelStyle}>Footer / Badge Text</label>
            <input style={inputStyle} value={form.badge || ""} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. No spam. Unsubscribe anytime." />
          </div>
        )}
        {fields.includes("link") && (
          <div style={formGroup}>
            <label style={labelStyle}>View All Link</label>
            <input style={inputStyle} value={form.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="/productListing?maxPrice=499" />
          </div>
        )}
        {fields.includes("colors") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <ColorField label="Background Color" value={form.bgColor} onChange={(v) => set("bgColor", v)} />
            <ColorField label="Accent / Icon Color" value={form.textColor} onChange={(v) => set("textColor", v)} />
          </div>
        )}
        {fields.includes("meta") && (
          <div style={formGroup}>
            <label style={labelStyle}>Meta (JSON)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "monospace" }}
              value={form.meta || ""} onChange={(e) => set("meta", e.target.value)}
              placeholder='{"maxPrice": 499}' />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : <><MdSave /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function HomePageManagement() {
  const [tab, setTab] = useState("sections");

  const renderTab = () => {
    switch (tab) {
      case "sections":
        return <SectionsTab />;
      case "collections":
        return (
          <CardListTab
            section="collection"
            fields={["title", "subtitle", "image", "link", "badge", "colors"]}
          />
        );
      case "price_tiers":
        return (
          <CardListTab
            section="price_tiers"
            fields={["title", "subtitle", "link", "badge", "colors", "meta"]}
          />
        );
      case "why_choose_us":
        return (
          <CardListTab
            section="why_choose_us"
            fields={["title", "subtitle", "colors", "meta"]}
          />
        );
      case "stats":
        return (
          <CardListTab
            section="stats"
            fields={["title", "subtitle", "meta"]}
          />
        );
      case "flash_deals":
        return (
          <SingleConfigTab
            section="flash_deals"
            fields={["title", "subtitle", "badge", "link", "colors", "meta"]}
            description='Configure the "Flash Deals" section heading, subtitle, and price cap (set maxPrice in the Meta JSON).'
          />
        );
      case "newsletter":
        return (
          <SingleConfigTab
            section="newsletter"
            fields={["title", "subtitle", "badge", "colors"]}
            description="Configure the newsletter strip heading, description, and footer note."
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Toaster position="top-right" />

      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1A237E", margin: 0 }}>Home Page Management</h2>
        <p style={{ color: "#666", fontSize: "0.85rem", marginTop: 4 }}>
          All changes take effect immediately on the live home page — no code changes needed.
        </p>
      </div>

      {/* Admin setup guide */}
      <details style={{ marginBottom: "1.5rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "#1565C0", background: "#E3F2FD", border: "1px solid #BBDEFB", borderRadius: 8, padding: "0.65rem 1rem", userSelect: "none", listStyle: "none", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          💡 How to build your homepage — Admin Guide (click to expand)
        </summary>
        <div style={{ background: "#F8FBFF", border: "1px solid #BBDEFB", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "1.25rem 1.5rem", fontSize: "0.83rem", color: "#333", lineHeight: 1.8 }}>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#1A237E" }}>Step-by-step homepage setup:</p>
          <ol style={{ margin: 0, paddingLeft: "1.4rem" }}>
            <li><strong>Sliders tab (Admin → Sliders)</strong> — Upload your hero banner images first. Add 2–4 main slider images. Each should be 1920 × 600 px. Add a Link URL so the banner is clickable.</li>
            <li><strong>Sections tab</strong> — Toggle which sections are visible and drag to reorder them. Only show sections that have content. Hide empty sections.</li>
            <li><strong>Collections tab</strong> — "Shop by Collection" cards (e.g. Men's, Women's, Kids). Add 4–8 cards. Each card: Title + Image (500 × 500 px) + Link URL to a filtered product listing.</li>
            <li><strong>Price Tiers tab</strong> — "Shop by Price" cards (e.g. Under ₹199). Set the <code>maxPrice</code> in the Meta JSON field: <code>{"{"}"maxPrice": 199{"}"}</code>. Add a Link URL like <code>/productListing?maxPrice=199</code>.</li>
            <li><strong>Why Choose Us tab</strong> — Trust badges (e.g. Fast Delivery, Secure Payments). Add 3–5 items. Use the Meta JSON to set an icon: <code>{"{"}"icon": "delivery"{"}"}</code>.</li>
            <li><strong>Stats Bar tab</strong> — Numbers that build trust (e.g. 10,000+ Products). Title = the number, Subtitle = the label.</li>
            <li><strong>Flash Deals tab</strong> — Configure the flash deals section heading and set a max price in Meta: <code>{"{"}"maxPrice": 499{"}"}</code>.</li>
            <li><strong>Newsletter tab</strong> — Configure the email subscription strip title and description.</li>
          </ol>
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#FFF8E1", borderRadius: 6, borderLeft: "4px solid #F9A825" }}>
            <strong>Responsiveness tips:</strong>
            <ul style={{ margin: "0.3rem 0 0 1rem", paddingLeft: "1rem" }}>
              <li>All images are auto-resized to fit mobile screens — upload high-quality originals.</li>
              <li>Avoid text baked into images — use the Title/Subtitle fields for text so it's readable on mobile.</li>
              <li>Test on a phone after saving — the site is fully responsive.</li>
              <li>Keep section order logical: Slider → Categories → Collections → Flash Deals → Price Tiers → Newsletter.</li>
            </ul>
          </div>
        </div>
      </details>

      {/* Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", borderBottom: "2px solid #E0E0E0", marginBottom: "1.5rem" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "0.6rem 1.1rem", background: "none", border: "none", cursor: "pointer",
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "#1565C0" : "#666",
              borderBottom: tab === t.key ? "2px solid #1565C0" : "2px solid transparent",
              marginBottom: -2, fontSize: "0.9rem", transition: "all 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}
