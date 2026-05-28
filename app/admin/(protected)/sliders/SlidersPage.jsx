"use client";

import { useEffect, useRef, useState } from "react";
import { MdDelete, MdAdd, MdClose, MdEdit, MdCheck, MdKeyboardArrowUp, MdKeyboardArrowDown, MdImage } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";

const imgUrl = (p) => (p ? p : "");

function InlineEdit({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const save = () => { onSave(val); setEditing(false); };

  if (editing) {
    return (
      <div className="flex gap-1.5 items-center">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="flex-1 min-w-0 px-2 py-1 border border-[#1565C0] rounded-lg text-[12px] outline-none"
        />
        <button onClick={save} className="p-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><MdCheck className="text-[14px]" /></button>
        <button onClick={() => setEditing(false)} className="p-1 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"><MdClose className="text-[14px]" /></button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 items-center cursor-pointer group" onClick={() => { setVal(value || ""); setEditing(true); }}>
      <span className={`text-[12px] truncate max-w-[140px] ${value ? "text-gray-600" : "text-gray-300"}`}>
        {value || label}
      </span>
      <MdEdit className="text-[#1565C0] text-[13px] flex-shrink-0 opacity-60 group-hover:opacity-100" />
    </div>
  );
}

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
      <span className="absolute top-2 left-2 bg-[#1A237E] text-white text-[10px] font-[700] px-2 py-0.5 rounded-full z-10">
        #{slide.order ?? 0}
      </span>
      <button
        onClick={() => onDelete(slide)}
        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center z-10 hover:bg-red-600 transition-colors"
      >
        <MdDelete className="text-[14px]" />
      </button>

      <div className="h-40 bg-gray-100 overflow-hidden">
        {img
          ? <img src={imgUrl(img)} alt="slide" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-[13px]">No Image</div>
        }
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-[10px] font-[700] uppercase tracking-wider text-gray-400 mb-1">Title</p>
          <InlineEdit label="Add title…" value={slide.title} onSave={(v) => handleSave("title", v)} />
        </div>
        <div>
          <p className="text-[10px] font-[700] uppercase tracking-wider text-gray-400 mb-1">Link</p>
          <InlineEdit label="Add link URL…" value={slide.link} onSave={(v) => handleSave("link", v)} />
        </div>
        <div className="flex gap-2">
          <button onClick={onMoveUp} disabled={isFirst} className={`flex-1 py-1.5 rounded-xl flex items-center justify-center transition-colors ${isFirst ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-blue-50 text-[#1565C0] hover:bg-blue-100"}`}>
            <MdKeyboardArrowUp className="text-[18px]" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className={`flex-1 py-1.5 rounded-xl flex items-center justify-center transition-colors ${isLast ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-blue-50 text-[#1565C0] hover:bg-blue-100"}`}>
            <MdKeyboardArrowDown className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SliderManagement() {
  const [allSlides,    setAllSlides]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("main");
  const [modal,        setModal]        = useState(false);
  const [formType,     setFormType]     = useState("main");
  const [formTitle,    setFormTitle]    = useState("");
  const [formLink,     setFormLink]     = useState("");
  const [formImages,   setFormImages]   = useState([]);
  const [imgUploading, setImgUploading] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const fileRef = useRef();

  const slides = allSlides.filter((s) => s.type === tab).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const loadSlides = async () => {
    setLoading(true);
    try { const res = await adminAxios.get("/api/homeSlide"); setAllSlides(res.data.data || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSlides(); }, []);

  const handleUpdate = (id, patch) => setAllSlides((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));

  const swap = async (a, b) => {
    const aOrder = b.order ?? 0;
    const bOrder = a.order ?? 0;
    try {
      await Promise.all([adminAxios.put(`/api/homeSlide/${a.id}`, { order: aOrder }), adminAxios.put(`/api/homeSlide/${b.id}`, { order: bOrder })]);
      handleUpdate(a.id, { order: aOrder }); handleUpdate(b.id, { order: bOrder });
    } catch { toast.error("Reorder failed"); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImgUploading(true);
    try { const fd = new FormData(); fd.append("images", file); const res = await adminAxios.post("/api/homeSlide/upload-images", fd); setFormImages([res.data.images[0]]); }
    catch { toast.error("Upload failed"); }
    finally { setImgUploading(false); e.target.value = ""; }
  };

  const openModal = () => { setFormType(tab); setFormTitle(""); setFormLink(""); setFormImages([]); setModal(true); };

  const handleSave = async () => {
    if (!formImages.length) return toast.error("Please upload an image");
    setSaving(true);
    try {
      const maxOrder = Math.max(0, ...allSlides.filter((s) => s.type === formType).map((s) => s.order ?? 0));
      await adminAxios.post("/api/homeSlide/create", { images: formImages, title: formTitle || null, link: formLink || null, type: formType, order: maxOrder + 1, isActive: true });
      toast.success("Slide added!"); setModal(false); loadSlides();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await adminAxios.delete(`/api/homeSlide/${deleteTarget.id}`); toast.success("Deleted"); setDeleteTarget(null); setAllSlides((prev) => prev.filter((s) => s.id !== deleteTarget.id)); }
    catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  const inputCls = "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
  const labelCls = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-[800] text-[#1A237E]">Home Sliders</h2>
        <button onClick={openModal} className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors">
          <MdAdd className="text-[16px]" /> Add Slide
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {["main", "side"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[13px] font-[600] border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === t ? "text-[#1565C0] border-[#1565C0]" : "text-gray-500 border-transparent hover:text-[#1565C0]"}`}
          >
            {t === "main" ? "Main Sliders" : "Side Banners"}
            <span className={`text-[11px] font-[700] px-1.5 py-0.5 rounded-full ${tab === t ? "bg-blue-100 text-[#1565C0]" : "bg-gray-100 text-gray-500"}`}>
              {allSlides.filter((s) => s.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[12px] text-[#1A237E] leading-relaxed">
        {tab === "main"
          ? <><strong>Main Sliders</strong> — full-width hero carousel at the top of homepage. Recommended: <strong>1920 × 600 px</strong> (landscape). JPG/WebP. Link tip: <strong>/category/electronics</strong> to go to a category page.</>
          : <><strong>Side Banners</strong> — sidebar/secondary slot beside main slider. Recommended: <strong>400 × 500 px</strong> (portrait). JPG/WebP.</>
        }
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <MdImage className="text-gray-300 text-[48px] mx-auto mb-3" />
          <p className="text-[14px] font-[600] text-gray-500">No {tab === "main" ? "main sliders" : "side banners"} yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Click "Add Slide" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {slides.map((slide, idx) => (
            <SliderCard key={slide.id} slide={slide} isFirst={idx === 0} isLast={idx === slides.length - 1}
              onDelete={setDeleteTarget} onUpdate={handleUpdate}
              onMoveUp={() => swap(slides[idx], slides[idx - 1])}
              onMoveDown={() => swap(slides[idx], slides[idx + 1])}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-[800] text-[#1A237E]">Add Slide</h3>
              <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><MdClose className="text-[18px]" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-2">
                  {["main", "side"].map((t) => (
                    <button key={t} onClick={() => setFormType(t)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-[600] border-2 transition-all ${formType === t ? "border-[#1565C0] bg-blue-50 text-[#1565C0]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      {t === "main" ? "Main Slider" : "Side Banner"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Image *</label>
                <p className="text-[11px] text-gray-400 mb-2">{formType === "main" ? "Recommended: 1920 × 600 px. JPG or WebP." : "Recommended: 400 × 500 px. JPG or WebP."}</p>
                <div onClick={() => fileRef.current.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#1565C0] hover:bg-[#F0F5FF] transition-all">
                  <MdImage className="text-gray-300 text-[28px] mx-auto mb-1" />
                  <p className="text-[12px] text-gray-400">{imgUploading ? "Uploading…" : "Click to upload image"}</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {formImages[0] && (
                  <div className="relative inline-block mt-3 w-full">
                    <img src={imgUrl(formImages[0])} alt="preview" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                    <button onClick={() => setFormImages([])} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center">×</button>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Title <span className="text-gray-400 normal-case font-[500]">(optional)</span></label>
                <input className={inputCls} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Summer Sale" />
              </div>
              <div>
                <label className={labelCls}>Link URL <span className="text-gray-400 normal-case font-[500]">(optional)</span></label>
                <input className={inputCls} value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="e.g. /category/electronics or /productListing?category=5" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(false)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !formImages.length} className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Saving…" : "Save Slide"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[16px] font-[800] text-gray-800 mb-2">Delete Slide</h3>
            <p className="text-[13px] text-gray-500 mb-6">Are you sure you want to delete this slide? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-500 text-white text-[13px] font-[700] rounded-xl hover:bg-red-600 disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
