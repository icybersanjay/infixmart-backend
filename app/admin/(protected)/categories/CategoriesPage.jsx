"use client";

import { useEffect, useRef, useState } from "react";
import { MdEdit, MdDelete, MdClose, MdAdd, MdImage } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";
import EmptyState from "../../../_legacy/components/EmptyState";
import { required, minLength } from "../../../_legacy/hooks/useForm";

const imgUrl = (p) => (p ? p : "");

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
                        {cat.images?.[0] ? (
                          <img src={imgUrl(cat.images[0])} alt={cat.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#E8EAF6] flex items-center justify-center text-[#7986CB] text-[13px] font-[700]">
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                        )}
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

              <div>
                <label className={labelCls}>Category Image</label>
                <p className="text-[11px] text-gray-400 mb-2">300 × 300 px square recommended. JPG or WebP.</p>
                <div
                  onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#1565C0] hover:bg-[#F0F5FF] transition-all"
                >
                  <MdImage className="text-gray-300 text-[28px] mx-auto mb-1" />
                  <p className="text-[12px] text-gray-400">{imgUploading ? "Uploading…" : "Click to upload image"}</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                {form.images?.[0] && (
                  <div className="relative inline-block mt-3">
                    <img src={imgUrl(form.images[0])} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, images: [] }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center hover:bg-red-600"
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
