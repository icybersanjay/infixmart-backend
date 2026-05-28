"use client";

import { useEffect, useRef, useState } from "react";
import { MdEdit, MdDelete, MdClose, MdAdd, MdImage } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";
import EmptyState from "../../../_legacy/components/EmptyState";
import { required, minLength } from "../../../_legacy/hooks/useForm";

const imgUrl = (p) => (p ? p : "");

/* ── Preset 3D-style emoji icons organised by common e-commerce categories ── */
const PRESET_ICONS = [
  { label: "Home & Kitchen",   icon: "🏠" },
  { label: "Electronics",      icon: "📱" },
  { label: "Laptop / PC",      icon: "💻" },
  { label: "TV / Display",     icon: "📺" },
  { label: "Smartwatch",       icon: "⌚" },
  { label: "Headphones",       icon: "🎧" },
  { label: "Camera",           icon: "📷" },
  { label: "Toys",             icon: "🧸" },
  { label: "Gaming",           icon: "🎮" },
  { label: "Sports & Fitness", icon: "🏋️" },
  { label: "Ball Sports",      icon: "⚽" },
  { label: "Cycling",          icon: "🚴" },
  { label: "Clothing",         icon: "👕" },
  { label: "Footwear",         icon: "👟" },
  { label: "Bags",             icon: "👜" },
  { label: "Jewellery",        icon: "💍" },
  { label: "Beauty / Makeup",  icon: "💄" },
  { label: "Skincare",         icon: "🧴" },
  { label: "Personal Care",    icon: "🪥" },
  { label: "Health",           icon: "💊" },
  { label: "Kitchen Cookware", icon: "🍳" },
  { label: "Bottles & Flasks", icon: "🥤" },
  { label: "Cleaning",         icon: "🧹" },
  { label: "Tools & Hardware", icon: "🔧" },
  { label: "Auto & Bikes",     icon: "🚗" },
  { label: "Smart Gadgets",    icon: "⚡" },
  { label: "Books & Stationery", icon: "📚" },
  { label: "Pets",             icon: "🐾" },
  { label: "Home Decor",       icon: "🪴" },
  { label: "Furniture",        icon: "🛋️" },
  { label: "Gifts",            icon: "🎁" },
  { label: "Outdoors",         icon: "🏕️" },
  { label: "Baby Products",    icon: "🍼" },
  { label: "Food & Grocery",   icon: "🛒" },
  { label: "Other / General",  icon: "🌟" },
];

/* Resolve display value: returns { type:'emoji'|'img', value:string } */
const resolveIcon = (images) => {
  const raw = images?.[0];
  if (!raw) return null;
  if (raw.startsWith("emoji:")) return { type: "emoji", value: raw.slice(6) };
  return { type: "img", value: raw };
};

function flatten(cats, depth = 0) {
  return cats.flatMap((cat) => [
    { ...cat, depth },
    ...flatten(cat.children || [], depth + 1),
  ]);
}

const DEPTH_BADGE = [
  "bg-blue-100 text-[#1565C0]",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
];
const DEPTH_LABEL = ["Root", "Sub", "Third"];

export default function CategoryManagement() {
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState({ name: "", parentCatId: "", parentCatName: "", images: [] });
  const [imgUploading, setImgUploading] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [nameError,    setNameError]    = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [iconTab,      setIconTab]      = useState("preset"); // "preset" | "upload"
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
    required("Category name is required")(val) || minLength(2, "Name must be at least 2 characters")(val);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", parentCatId: "", parentCatName: "", images: [] });
    setNameError("");
    setModal(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({ name: cat.name, parentCatId: cat.parentCatId ? String(cat.parentCatId) : "", parentCatName: cat.parentCatName || "", images: cat.images || [] });
    setNameError("");
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
      if (editItem) await adminAxios.put(`/api/category/${editItem.id}`, payload);
      else          await adminAxios.post("/api/category/createcat", payload);
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

  const inputCls = "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
  const labelCls = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-[800] text-[#1A237E]">
          All Categories
          {!loading && <span className="ml-2 text-[13px] font-[400] text-gray-400">({categories.length})</span>}
        </h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors"
        >
          <MdAdd className="text-[16px]" /> Add Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFF] border-b border-gray-100">
                {["Image", "Name", "Parent", "Type", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} widths={[40, 160, 110, 70, 80]} />)
                : categories.length === 0
                ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No categories yet" subtitle="Add your first category to organise products." actionLabel="Add Category" onAction={openAdd} />
                      </td>
                    </tr>
                  )
                : categories.map((cat) => (
                    <tr key={cat.id} className="border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors">
                      <td className="px-4 py-3">
                        {(() => {
                          const icon = resolveIcon(cat.images);
                          if (!icon) return (
                            <div className="w-9 h-9 rounded-full bg-[#E8EAF6] flex items-center justify-center text-[#7986CB] text-[13px] font-[700]">
                              {cat.name.charAt(0).toUpperCase()}
                            </div>
                          );
                          if (icon.type === "emoji") return (
                            <div className="w-9 h-9 rounded-full bg-[#EEF4FF] flex items-center justify-center text-[1.4rem]">
                              {icon.value}
                            </div>
                          );
                          return <img src={icon.value} alt={cat.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />;
                        })()}
                      </td>
                      <td className="px-4 py-3" style={{ paddingLeft: `${1 + cat.depth * 1.5}rem` }}>
                        {cat.depth > 0 && <span className="text-gray-300 mr-1 text-[11px]">└ </span>}
                        <span className={cat.depth === 0 ? "font-[700] text-gray-800" : "font-[400] text-gray-600"}>
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{cat.parentCatName || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${DEPTH_BADGE[cat.depth] ?? DEPTH_BADGE[1]}`}>
                          {DEPTH_LABEL[cat.depth] ?? "Sub"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(cat)} className="p-1.5 bg-blue-50 text-[#1565C0] rounded-lg hover:bg-blue-100 transition-colors"><MdEdit className="text-[15px]" /></button>
                          <button onClick={() => setDeleteTarget(cat)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdDelete className="text-[15px]" /></button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-[800] text-[#1A237E]">{editItem ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <MdClose className="text-[18px]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                <input
                  className={`${inputCls} ${nameError ? "border-red-400" : ""}`}
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(""); }}
                  onBlur={(e) => setNameError(validateName(e.target.value))}
                  placeholder="e.g. Electronics"
                />
                {nameError && <p className="text-red-500 text-[11px] mt-1">{nameError}</p>}
              </div>

              <div>
                <label className={labelCls}>Slug (auto-generated)</label>
                <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={autoSlug} readOnly />
              </div>

              <div>
                <label className={labelCls}>Parent Category <span className="text-gray-400 normal-case font-[500]">(optional)</span></label>
                <select className={inputCls} value={form.parentCatId} onChange={handleParentChange}>
                  <option value="">— None (root category) —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Category Icon ── */}
              <div>
                <label className={labelCls}>Category Icon</label>

                {/* Tab switcher */}
                <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl">
                  {[["preset", "🎨 Choose Icon"], ["upload", "📁 Upload Image"]].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIconTab(key)}
                      className={`flex-1 py-1.5 text-[12px] font-[600] rounded-lg transition-all ${
                        iconTab === key ? "bg-white shadow-sm text-[#1565C0]" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {iconTab === "preset" ? (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-2">Click an icon to select it for this category.</p>
                    <div className="grid grid-cols-7 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                      {PRESET_ICONS.map(({ icon, label }) => {
                        const val = `emoji:${icon}`;
                        const selected = form.images?.[0] === val;
                        return (
                          <button
                            key={icon}
                            type="button"
                            title={label}
                            onClick={() => setForm((f) => ({ ...f, images: [val] }))}
                            className={`flex items-center justify-center h-11 rounded-xl text-[1.6rem] transition-all border-2 ${
                              selected
                                ? "border-[#1565C0] bg-[#EEF4FF] scale-110 shadow-md"
                                : "border-transparent bg-gray-50 hover:bg-[#F0F5FF] hover:border-[#1565C0]/30"
                            }`}
                          >
                            {icon}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-2">512 × 512 px recommended. PNG, JPG or WebP.</p>
                    <div
                      onClick={() => fileRef.current.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#1565C0] hover:bg-[#F0F5FF] transition-all"
                    >
                      <MdImage className="text-gray-300 text-[28px] mx-auto mb-1" />
                      <p className="text-[12px] text-gray-400">{imgUploading ? "Uploading…" : "Click to upload image"}</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                )}

                {/* Current selection preview */}
                {form.images?.[0] && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-[#F8FAFF] rounded-xl border border-gray-100">
                    {form.images[0].startsWith("emoji:") ? (
                      <span className="text-[2.5rem] leading-none">{form.images[0].slice(6)}</span>
                    ) : (
                      <img src={imgUrl(form.images[0])} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-[600] text-gray-700">
                        {form.images[0].startsWith("emoji:") ? "Emoji icon selected" : "Custom image"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{form.images[0]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, images: [] }))}
                      className="w-6 h-6 rounded-full bg-red-100 text-red-500 text-[13px] flex items-center justify-center hover:bg-red-200 flex-shrink-0"
                    >×</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(false)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !!nameError || !form.name.trim()}
                className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[16px] font-[800] text-gray-800 mb-2">Delete Category</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              Delete <strong>"{deleteTarget.name}"</strong>? All subcategories will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-500 text-white text-[13px] font-[700] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
