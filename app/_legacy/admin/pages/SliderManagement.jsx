import { useEffect, useRef, useState } from "react";
import { MdDelete, MdAdd, MdClose, MdEdit, MdCheck, MdKeyboardArrowUp, MdKeyboardArrowDown } from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import toast, { Toaster } from "react-hot-toast";


const imgUrl = (p) => (p ? p : "");

const primaryBtn = { padding: "0.55rem 1.1rem", background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.35rem" };
const greyBtn   = { padding: "0.55rem 1.1rem", background: "#F5F5F5", color: "#555", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" };
const dangerBtn = { padding: "0.55rem 1rem",   background: "#E53935", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" };
const inputStyle = { width: "100%", padding: "0.6rem 0.875rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "0.35rem", fontSize: "0.875rem", fontWeight: 500, color: "#444" };

// ── Inline edit field ─────────────────────────────────────────────────────────
function InlineEdit({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const save = () => {
    onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          style={{ padding: "0.3rem 0.5rem", border: "1px solid #1565C0", borderRadius: 4, fontSize: "0.8rem", outline: "none", flex: 1, minWidth: 0 }}
        />
        <button onClick={save} style={{ background: "#E8F5E9", border: "none", borderRadius: 4, padding: "0.3rem", cursor: "pointer", color: "#00A651", fontSize: "1rem", lineHeight: 1 }}><MdCheck /></button>
        <button onClick={() => setEditing(false)} style={{ background: "#FFEBEE", border: "none", borderRadius: 4, padding: "0.3rem", cursor: "pointer", color: "#E53935", fontSize: "1rem", lineHeight: 1 }}><MdClose /></button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", cursor: "pointer" }} onClick={() => { setVal(value || ""); setEditing(true); }}>
      <span style={{ fontSize: "0.8rem", color: value ? "#555" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
        {value || label}
      </span>
      <MdEdit style={{ color: "#1565C0", fontSize: "0.85rem", flexShrink: 0 }} />
    </div>
  );
}

// ── Slider card ───────────────────────────────────────────────────────────────
function SliderCard({ slide, onDelete, onUpdate, onMoveUp, onMoveDown, isFirst, isLast }) {
  const img = slide.images?.[0];

  const handleSave = async (field, value) => {
    try {
      await adminAxios.put(`/api/homeSlide/${slide.id}`, { [field]: value });
      onUpdate(slide.id, { [field]: value });
      toast.success("Updated");
    } catch { toast.error("Update failed"); }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden", position: "relative" }}>
      {/* Order badge */}
      <div style={{ position: "absolute", top: 8, left: 8, background: "#1A237E", color: "#fff", borderRadius: 99, padding: "0.1rem 0.5rem", fontSize: "0.73rem", fontWeight: 700, zIndex: 1 }}>
        #{slide.order ?? 0}
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(slide)}
        title="Delete"
        style={{ position: "absolute", top: 8, right: 8, background: "#E53935", border: "none", borderRadius: 99, width: 28, height: 28, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}
      >
        <MdDelete style={{ fontSize: "0.95rem" }} />
      </button>

      {/* Image */}
      <div style={{ height: 160, background: "#F5F5F5", overflow: "hidden" }}>
        {img ? (
          <img src={imgUrl(img)} alt="slide" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "0.875rem" }}>No Image</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "0.75rem" }}>
        <div style={{ marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.7rem", color: "#999", fontWeight: 500, marginBottom: 2, display: "block" }}>TITLE</span>
          <InlineEdit label="Add title…" value={slide.title} onSave={(v) => handleSave("title", v)} />
        </div>
        <div style={{ marginBottom: "0.6rem" }}>
          <span style={{ fontSize: "0.7rem", color: "#999", fontWeight: 500, marginBottom: 2, display: "block" }}>LINK</span>
          <InlineEdit label="Add link URL…" value={slide.link} onSave={(v) => handleSave("link", v)} />
        </div>

        {/* Up/Down order buttons */}
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            style={{ flex: 1, background: isFirst ? "#F5F5F5" : "#E3F2FD", border: "none", borderRadius: 6, padding: "0.3rem", cursor: isFirst ? "not-allowed" : "pointer", color: isFirst ? "#ccc" : "#1565C0", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <MdKeyboardArrowUp />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            style={{ flex: 1, background: isLast ? "#F5F5F5" : "#E3F2FD", border: "none", borderRadius: 6, padding: "0.3rem", cursor: isLast ? "not-allowed" : "pointer", color: isLast ? "#ccc" : "#1565C0", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <MdKeyboardArrowDown />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SliderManagement() {
  const [allSlides, setAllSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("main"); // 'main' | 'side'
  const [modal, setModal] = useState(false);
  const [formType, setFormType] = useState("main");
  const [formTitle, setFormTitle] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formImages, setFormImages] = useState([]);
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  const slides = allSlides.filter((s) => s.type === tab).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const loadSlides = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/homeSlide");
      setAllSlides(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSlides(); }, []);

  const handleUpdate = (id, patch) => {
    setAllSlides((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  };

  const handleMoveUp = async (idx) => {
    const sorted = slides;
    if (idx === 0) return;
    const a = sorted[idx];
    const b = sorted[idx - 1];
    const aOrder = b.order ?? 0;
    const bOrder = a.order ?? 0;
    try {
      await Promise.all([
        adminAxios.put(`/api/homeSlide/${a.id}`, { order: aOrder }),
        adminAxios.put(`/api/homeSlide/${b.id}`, { order: bOrder }),
      ]);
      handleUpdate(a.id, { order: aOrder });
      handleUpdate(b.id, { order: bOrder });
    } catch { toast.error("Reorder failed"); }
  };

  const handleMoveDown = async (idx) => {
    const sorted = slides;
    if (idx === sorted.length - 1) return;
    const a = sorted[idx];
    const b = sorted[idx + 1];
    const aOrder = b.order ?? 0;
    const bOrder = a.order ?? 0;
    try {
      await Promise.all([
        adminAxios.put(`/api/homeSlide/${a.id}`, { order: aOrder }),
        adminAxios.put(`/api/homeSlide/${b.id}`, { order: bOrder }),
      ]);
      handleUpdate(a.id, { order: aOrder });
      handleUpdate(b.id, { order: bOrder });
    } catch { toast.error("Reorder failed"); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("images", file);
      const res = await adminAxios.post("/api/homeSlide/upload-images", fd);
      setFormImages([res.data.images[0]]);
    } catch { toast.error("Upload failed"); }
    finally { setImgUploading(false); e.target.value = ""; }
  };

  const openModal = () => {
    setFormType(tab);
    setFormTitle(""); setFormLink(""); setFormImages([]);
    setModal(true);
  };

  const handleSave = async () => {
    if (!formImages.length) return toast.error("Please upload an image");
    setSaving(true);
    try {
      const maxOrder = Math.max(0, ...allSlides.filter((s) => s.type === formType).map((s) => s.order ?? 0));
      await adminAxios.post("/api/homeSlide/create", {
        images: formImages,
        title: formTitle || null,
        link: formLink || null,
        type: formType,
        order: maxOrder + 1,
        isActive: true,
      });
      toast.success("Slide added!");
      setModal(false);
      loadSlides();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/homeSlide/${deleteTarget.id}`);
      toast.success("Deleted");
      setDeleteTarget(null);
      setAllSlides((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>Home Sliders</h2>
        <button onClick={openModal} style={primaryBtn}><MdAdd /> Add Slide</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #E0E0E0", marginBottom: "1rem" }}>
        {["main", "side"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "0.6rem 1.25rem", background: "none", border: "none", cursor: "pointer", fontWeight: tab === t ? 600 : 400, color: tab === t ? "#1565C0" : "#666", borderBottom: tab === t ? "2px solid #1565C0" : "2px solid transparent", textTransform: "capitalize", marginBottom: -1, fontSize: "0.9rem" }}>
            {t === "main" ? "Main Sliders" : "Side Banners"}
            <span style={{ marginLeft: 6, background: tab === t ? "#E3F2FD" : "#F5F5F5", color: tab === t ? "#1565C0" : "#999", borderRadius: 99, padding: "0.1rem 0.45rem", fontSize: "0.73rem", fontWeight: 700 }}>
              {allSlides.filter((s) => s.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Contextual tip */}
      <div style={{ background: "#E3F2FD", border: "1px solid #BBDEFB", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "#1A237E", lineHeight: 1.6 }}>
        {tab === "main" ? (
          <>
            <strong>Main Sliders</strong> — displayed as the full-width hero carousel at the top of the homepage.<br />
            📐 <strong>Recommended size: 1920 × 600 px</strong> (wide landscape). Use JPG/WebP for faster loading.<br />
            💡 Keep text minimal — use the Title field, not text baked into the image, for mobile readability.<br />
            🔗 Set a Link URL (e.g. <code>/productListing?sort=newest</code>) so the banner is clickable.
          </>
        ) : (
          <>
            <strong>Side Banners</strong> — shown in the sidebar/secondary banner slot beside the main slider.<br />
            📐 <strong>Recommended size: 400 × 500 px</strong> (portrait, ~4:5 ratio). Use JPG/WebP.<br />
            💡 Great for category promotions or deals. Typically 1–2 banners are ideal.
          </>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 260, background: "#F5F5F5", borderRadius: 8, border: "1px solid #E0E0E0" }} />
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 8, border: "2px dashed #E0E0E0", padding: "3rem", textAlign: "center", color: "#999" }}>
          No {tab === "main" ? "main sliders" : "side banners"} yet. Click "Add Slide" to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
          {slides.map((slide, idx) => (
            <SliderCard
              key={slide.id}
              slide={slide}
              isFirst={idx === 0}
              isLast={idx === slides.length - 1}
              onDelete={setDeleteTarget}
              onUpdate={handleUpdate}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 10, width: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 1.5rem", borderBottom: "1px solid #E0E0E0" }}>
              <h3 style={{ margin: 0, color: "#1A237E", fontSize: "1rem", fontWeight: 600 }}>Add Slide</h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "1.3rem" }}><MdClose /></button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {/* Type toggle */}
              <label style={labelStyle}>Type</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {["main", "side"].map((t) => (
                  <button key={t} onClick={() => setFormType(t)} style={{ flex: 1, padding: "0.5rem", border: "2px solid", borderColor: formType === t ? "#1565C0" : "#E0E0E0", borderRadius: 6, background: formType === t ? "#E3F2FD" : "#fff", color: formType === t ? "#1565C0" : "#666", fontWeight: formType === t ? 600 : 400, cursor: "pointer", textTransform: "capitalize" }}>
                    {t === "main" ? "Main Slider" : "Side Banner"}
                  </button>
                ))}
              </div>

              {/* Image upload */}
              <label style={labelStyle}>Image <span style={{ color: "#E53935" }}>*</span></label>
              <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.4rem", marginTop: 0 }}>
                {formType === "main" ? "📐 Recommended: 1920 × 600 px (landscape). JPG or WebP." : "📐 Recommended: 400 × 500 px (portrait). JPG or WebP."}
              </p>
              <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #BDBDBD", borderRadius: 8, padding: "1rem", textAlign: "center", cursor: "pointer", background: "#FAFAFA", color: "#888", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                {imgUploading ? "Uploading…" : "Click to upload image"}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              {formImages[0] && (
                <div style={{ position: "relative", display: "inline-block", marginBottom: "1rem" }}>
                  <img src={imgUrl(formImages[0])} alt="preview" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 6, border: "1px solid #E0E0E0" }} />
                  <button onClick={() => setFormImages([])} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E53935", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              )}

              <label style={labelStyle}>Title <span style={{ color: "#999", fontSize: "0.78rem" }}>(optional)</span></label>
              <input style={{ ...inputStyle, marginBottom: "1rem" }} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Summer Sale" />

              <label style={labelStyle}>Link URL <span style={{ color: "#999", fontSize: "0.78rem" }}>(optional)</span></label>
              <input style={{ ...inputStyle, marginBottom: "0.5rem" }} value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="e.g. /productListing?category=sale" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: "1px solid #E0E0E0" }}>
              <button onClick={() => setModal(false)} style={greyBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !formImages.length} style={{ ...primaryBtn, opacity: saving || !formImages.length ? 0.6 : 1, cursor: saving || !formImages.length ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Save Slide"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "2rem", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ color: "#1A237E", marginBottom: "0.75rem", fontSize: "1.05rem" }}>Delete Slide</h3>
            <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Are you sure you want to delete this slide? This cannot be undone.
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
