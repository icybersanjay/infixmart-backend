"use client";

import { useEffect, useRef, useState } from "react";
import {
  MdAdd, MdClose, MdDelete, MdEdit,
  MdVisibility, MdVisibilityOff,
  MdKeyboardArrowUp, MdKeyboardArrowDown,
  MdSave,
} from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";

const inputCls = "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
const labelCls = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

const TABS = [
  { key: "sections",      label: "Sections"      },
  { key: "collections",   label: "Collections"   },
  { key: "price_tiers",   label: "Price Tiers"   },
  { key: "why_choose_us", label: "Why Choose Us" },
  { key: "stats",         label: "Stats Bar"     },
  { key: "flash_deals",   label: "Flash Deals"   },
  { key: "newsletter",    label: "Newsletter"    },
];

const imgSrc = (p) => p || null;

// ── Color field ───────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value?.startsWith("#") ? value : "#1565C0"} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5" />
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. #1565C0 or linear-gradient(…)" className={inputCls} />
      </div>
    </div>
  );
}

/* ── 1. Sections Tab ─────────────────────────────────────────────────────────*/
function SectionsTab() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/admin/homepage");
      setItems((res.data.items || []).filter((i) => i.section === "section_config").sort((a, b) => a.order - b.order));
    } catch { toast.error("Failed to load sections"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleVisibility = async (item) => {
    setSaving(item.id);
    try {
      await adminAxios.put(`/api/admin/homepage/${item.id}`, { isActive: !item.isActive });
      setItems((p) => p.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
      toast.success("Updated");
    } catch { toast.error("Update failed"); }
    finally { setSaving(null); }
  };

  const moveSection = async (idx, dir) => {
    const sorted = [...items];
    const ti = dir === "up" ? idx - 1 : idx + 1;
    if (ti < 0 || ti >= sorted.length) return;
    const a = sorted[idx], b = sorted[ti];
    try {
      await Promise.all([
        adminAxios.put(`/api/admin/homepage/${a.id}`, { order: b.order }),
        adminAxios.put(`/api/admin/homepage/${b.id}`, { order: a.order }),
      ]);
      setItems((p) => p.map((i) => {
        if (i.id === a.id) return { ...i, order: b.order };
        if (i.id === b.id) return { ...i, order: a.order };
        return i;
      }).sort((x, y) => x.order - y.order));
    } catch { toast.error("Reorder failed"); }
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading…</div>;

  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-4">Toggle which sections appear on the home page and drag to reorder them.</p>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={item.id} className={`flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm transition-opacity ${item.isActive ? "opacity-100" : "opacity-55"}`}>
            <div className="flex-1 min-w-0">
              <span className="font-[700] text-[14px] text-gray-800">{item.title || item.key}</span>
              <span className="ml-2 text-[11px] text-gray-400">({item.key})</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => moveSection(idx, "up")} disabled={idx === 0} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors">
                <MdKeyboardArrowUp className="text-[16px]" />
              </button>
              <button onClick={() => moveSection(idx, "down")} disabled={idx === items.length - 1} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors">
                <MdKeyboardArrowDown className="text-[16px]" />
              </button>
              <button
                onClick={() => toggleVisibility(item)} disabled={saving === item.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-[600] transition-colors ${item.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              >
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

/* ── Generic Card List Tab ───────────────────────────────────────────────────*/
const SECTION_TIPS = {
  collection:   "Collections appear as category cards. Use 500 × 500 px images. Add a Link URL to filter products by category.",
  price_tiers:  "Price tier cards (e.g. Under ₹199). Set maxPrice in Meta JSON: {\"maxPrice\": 199}. Link: /productListing?maxPrice=199",
  why_choose_us:"Trust badges shown to customers. 3–5 items ideal. Title = benefit name, Subtitle = short description.",
  stats:        "Trust numbers (e.g. 10,000+ Products). Title = the number/stat, Subtitle = the label below it. No images needed.",
};

function CardListTab({ section, fields }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({});
  const [imgUploading, setImgUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/admin/homepage");
      setItems((res.data.items || []).filter((i) => i.section === section).sort((a, b) => a.order - b.order));
    } catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [section]);

  const openCreate = () => {
    setForm({ section, key: "", title: "", subtitle: "", image: "", link: "", badge: "", badgeColor: "#1565C0", bgColor: "#F5F7FF", textColor: "#111827", isActive: true, order: items.length + 1, meta: "" });
    setModal("create");
  };
  const openEdit = (item) => { setForm({ ...item, meta: item.meta || "" }); setModal("edit"); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData(); fd.append("image", file);
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
        setItems((p) => [...p, res.data.item].sort((a, b) => a.order - b.order));
        toast.success("Item created");
      } else {
        await adminAxios.put(`/api/admin/homepage/${form.id}`, form);
        setItems((p) => p.map((i) => i.id === form.id ? { ...i, ...form } : i));
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
      setItems((p) => p.filter((i) => i.id !== deleteTarget.id));
      toast.success("Deleted"); setDeleteTarget(null);
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  const moveItem = async (idx, dir) => {
    const ti = dir === "up" ? idx - 1 : idx + 1;
    if (ti < 0 || ti >= items.length) return;
    const a = items[idx], b = items[ti];
    try {
      await Promise.all([
        adminAxios.put(`/api/admin/homepage/${a.id}`, { order: b.order }),
        adminAxios.put(`/api/admin/homepage/${b.id}`, { order: a.order }),
      ]);
      setItems((p) => p.map((i) => {
        if (i.id === a.id) return { ...i, order: b.order };
        if (i.id === b.id) return { ...i, order: a.order };
        return i;
      }).sort((x, y) => x.order - y.order));
    } catch { toast.error("Reorder failed"); }
  };

  const toggleActive = async (item) => {
    try {
      await adminAxios.put(`/api/admin/homepage/${item.id}`, { isActive: !item.isActive });
      setItems((p) => p.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    } catch { toast.error("Update failed"); }
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading…</div>;

  return (
    <div>
      {SECTION_TIPS[section] && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-[12px] text-amber-800">
          💡 <strong>Tip:</strong> {SECTION_TIPS[section]}
        </div>
      )}
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors">
          <MdAdd className="text-[16px]" /> Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          No items yet. Click "Add Item" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={item.id} className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm transition-opacity ${item.isActive ? "opacity-100" : "opacity-60"}`}>
              {item.image && (
                <img src={imgSrc(item.image)} alt={item.title} className="w-full h-[110px] object-cover rounded-xl border border-gray-100 mb-3" />
              )}
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-[700] text-[14px] text-gray-800 truncate">{item.title || item.key}</p>
                  {item.subtitle && <p className="text-[12px] text-gray-500 mt-0.5">{item.subtitle}</p>}
                  {item.badge && (
                    <span className="inline-block mt-1 text-[10px] font-[700] text-white rounded-full px-2 py-0.5" style={{ background: item.badgeColor || "#1565C0" }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 bg-blue-50 text-[#1565C0] rounded-lg hover:bg-blue-100 transition-colors"><MdEdit className="text-[14px]" /></button>
                  <button onClick={() => toggleActive(item)} className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
                    {item.isActive ? <MdVisibility className="text-[14px] text-green-600" /> : <MdVisibilityOff className="text-[14px]" />}
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdDelete className="text-[14px]" /></button>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => moveItem(idx, "up")} disabled={idx === 0} className="flex-1 flex justify-center p-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  <MdKeyboardArrowUp className="text-[16px]" />
                </button>
                <button onClick={() => moveItem(idx, "down")} disabled={idx === items.length - 1} className="flex-1 flex justify-center p-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  <MdKeyboardArrowDown className="text-[16px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-[800] text-[#1A237E]">{modal === "create" ? "Add Item" : "Edit Item"}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><MdClose className="text-[18px]" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Key *</label>
                <input className={inputCls} value={form.key || ""} onChange={(e) => set("key", e.target.value)} placeholder="unique_identifier (no spaces)" />
              </div>
              {fields.includes("title") && (
                <div><label className={labelCls}>Title</label><input className={inputCls} value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. New Arrivals" /></div>
              )}
              {fields.includes("subtitle") && (
                <div><label className={labelCls}>Subtitle / Description</label><input className={inputCls} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="Short description" /></div>
              )}
              {fields.includes("image") && (
                <div>
                  <label className={labelCls}>Image</label>
                  <p className="text-[11px] text-gray-400 mb-2">Recommended: 500 × 500 px (square). JPG or WebP.</p>
                  <div className="flex gap-3 items-start">
                    {form.image && <img src={imgSrc(form.image)} alt="" className="w-20 h-14 object-cover rounded-xl border border-gray-200 flex-shrink-0" />}
                    <div className="flex-1 space-y-2">
                      <input type="text" className={inputCls} value={form.image || ""} onChange={(e) => set("image", e.target.value)} placeholder="Paste URL or upload below" />
                      <button onClick={() => fileRef.current.click()} className="px-3 py-2 border border-gray-200 text-[12px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
                        {imgUploading ? "Uploading…" : "Upload Image"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>
              )}
              {fields.includes("link") && (
                <div><label className={labelCls}>Link URL</label><input className={inputCls} value={form.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="e.g. /productListing?sort=newest" /></div>
              )}
              {fields.includes("badge") && (
                <div><label className={labelCls}>Badge Text</label><input className={inputCls} value={form.badge || ""} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. Just In" /></div>
              )}
              {fields.includes("colors") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorField label="Background Color / Gradient" value={form.bgColor}    onChange={(v) => set("bgColor",    v)} />
                  <ColorField label="Text / Icon Color"            value={form.textColor}  onChange={(v) => set("textColor",  v)} />
                  <ColorField label="Badge / Border Color"         value={form.badgeColor} onChange={(v) => set("badgeColor", v)} />
                </div>
              )}
              {fields.includes("meta") && (
                <div>
                  <label className={labelCls}>Meta (JSON — e.g. maxPrice, icon)</label>
                  <textarea rows={3} className={`${inputCls} resize-y font-mono`} value={form.meta || ""} onChange={(e) => set("meta", e.target.value)} placeholder='{"maxPrice": 499}' />
                </div>
              )}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={!!form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-[#1565C0]" />
                <span className="text-[13px] font-[500] text-gray-700">Active (visible)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60">
                <MdSave className="text-[15px]" />{saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[16px] font-[800] text-gray-800 mb-2">Delete Item</h3>
            <p className="text-[13px] text-gray-500 mb-6">Delete <strong>"{deleteTarget.title || deleteTarget.key}"</strong>? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-500 text-white text-[13px] font-[700] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Single Config Tab ───────────────────────────────────────────────────────*/
function SingleConfigTab({ section, fields, description }) {
  const [item, setItem]   = useState(null);
  const [form, setForm]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

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
      setItem((p) => ({ ...p, ...form })); toast.success("Saved!");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading…</div>;
  if (!item) return <div className="text-red-500 py-8">Config not found. Please restart the server to re-seed.</div>;

  return (
    <div className="max-w-lg">
      {description && <p className="text-[13px] text-gray-500 mb-4">{description}</p>}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        {fields.includes("title") && (
          <div><label className={labelCls}>Title</label><input className={inputCls} value={form.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
        )}
        {fields.includes("subtitle") && (
          <div><label className={labelCls}>Subtitle / Description</label><textarea rows={3} className={`${inputCls} resize-y`} value={form.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></div>
        )}
        {fields.includes("badge") && (
          <div><label className={labelCls}>Footer / Badge Text</label><input className={inputCls} value={form.badge || ""} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. No spam. Unsubscribe anytime." /></div>
        )}
        {fields.includes("link") && (
          <div><label className={labelCls}>View All Link</label><input className={inputCls} value={form.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="/productListing?maxPrice=499" /></div>
        )}
        {fields.includes("colors") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorField label="Background Color" value={form.bgColor}   onChange={(v) => set("bgColor",   v)} />
            <ColorField label="Accent / Icon Color" value={form.textColor} onChange={(v) => set("textColor", v)} />
          </div>
        )}
        {fields.includes("meta") && (
          <div><label className={labelCls}>Meta (JSON)</label><textarea rows={3} className={`${inputCls} resize-y font-mono`} value={form.meta || ""} onChange={(e) => set("meta", e.target.value)} placeholder='{"maxPrice": 499}' /></div>
        )}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60">
            <MdSave className="text-[15px]" />{saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────────*/
export default function HomePageManagement() {
  const [tab, setTab] = useState("sections");

  const renderTab = () => {
    switch (tab) {
      case "sections":      return <SectionsTab />;
      case "collections":   return <CardListTab section="collection"   fields={["title", "subtitle", "image", "link", "badge", "colors"]} />;
      case "price_tiers":   return <CardListTab section="price_tiers"  fields={["title", "subtitle", "link", "badge", "colors", "meta"]} />;
      case "why_choose_us": return <CardListTab section="why_choose_us" fields={["title", "subtitle", "colors", "meta"]} />;
      case "stats":         return <CardListTab section="stats"        fields={["title", "subtitle", "meta"]} />;
      case "flash_deals":   return <SingleConfigTab section="flash_deals" fields={["title", "subtitle", "badge", "link", "colors", "meta"]} description='Configure the "Flash Deals" section heading, subtitle, and price cap (set maxPrice in the Meta JSON).' />;
      case "newsletter":    return <SingleConfigTab section="newsletter" fields={["title", "subtitle", "badge", "colors"]} description="Configure the newsletter strip heading, description, and footer note." />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div>
        <h2 className="text-[16px] font-[800] text-[#1A237E]">Home Page Management</h2>
        <p className="text-[13px] text-gray-400 mt-0.5">All changes take effect immediately on the live home page — no code changes needed.</p>
      </div>

      {/* Admin guide */}
      <details className="group">
        <summary className="cursor-pointer select-none flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-[13px] font-[600] text-[#1565C0] list-none">
          💡 How to build your homepage — Admin Guide (click to expand)
        </summary>
        <div className="bg-[#F8FBFF] border border-blue-100 border-t-0 rounded-b-xl p-5 text-[12px] text-gray-700 leading-relaxed">
          <p className="font-[700] text-[#1A237E] mb-2">Step-by-step homepage setup:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li><strong>Sliders (Admin → Sliders)</strong> — Upload hero banner images. 1920 × 600 px recommended.</li>
            <li><strong>Sections tab</strong> — Toggle visibility and reorder sections.</li>
            <li><strong>Collections tab</strong> — "Shop by Collection" cards. 500 × 500 px images + Link URL.</li>
            <li><strong>Price Tiers tab</strong> — "Shop by Price" cards. Set <code>maxPrice</code> in Meta JSON.</li>
            <li><strong>Why Choose Us tab</strong> — Trust badges. 3–5 items. Set icon in Meta JSON.</li>
            <li><strong>Stats Bar tab</strong> — Trust numbers. Title = number, Subtitle = label.</li>
            <li><strong>Flash Deals tab</strong> — Configure heading and max price in Meta JSON.</li>
            <li><strong>Newsletter tab</strong> — Configure email subscription strip.</li>
          </ol>
          <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl text-[11px]">
            <strong>Tips:</strong> Upload high-quality originals — images are auto-resized for mobile. Avoid baking text into images. Test on a phone after saving.
          </div>
        </div>
      </details>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-0.5 border-b-2 border-gray-100">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-[600] border-b-2 -mb-px transition-colors ${tab === t.key ? "text-[#1565C0] border-[#1565C0]" : "text-gray-400 border-transparent hover:text-gray-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}
