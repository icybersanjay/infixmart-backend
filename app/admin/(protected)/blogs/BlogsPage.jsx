"use client";

import { useEffect, useRef, useState } from "react";
import { MdAdd, MdEdit, MdDelete, MdClose, MdArticle, MdImage } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import { imgUrl } from "../../../_legacy/utils/imageUrl";
import toast, { Toaster } from "react-hot-toast";
import EmptyState from "../../../_legacy/components/EmptyState";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";

const BASE_FORM = {
  title: "", excerpt: "", content: "", author: "InfixMart Team", published: false, image: "",
};

const inputCls = "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
const labelCls = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Form ──────────────────────────────────────────────────────────────────────
function BlogForm({ initial, onSave, onCancel }) {
  const [form, setForm]           = useState(initial || BASE_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]     = useState(initial?.image ? imgUrl(initial.image) : "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    const fd = new FormData();
    fd.append("title",     form.title);
    fd.append("excerpt",   form.excerpt);
    fd.append("content",   form.content);
    fd.append("author",    form.author);
    fd.append("published", String(form.published));
    if (imageFile) fd.append("image", imageFile);
    else if (form.image) fd.append("image", form.image);
    try {
      if (initial?.id) await adminAxios.put(`/api/blog/${initial.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      else             await adminAxios.post("/api/blog", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSave();
    } catch (err) { setError(err.response?.data?.message || "Failed to save blog"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-[800] text-[#1A237E]">{initial?.id ? "Edit Blog Post" : "New Blog Post"}</h3>
        <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <MdClose className="text-[18px]" />
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-[12px] px-4 py-2.5 rounded-xl mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Blog post title" />
          </div>

          <div>
            <label className={labelCls}>Author</label>
            <input className={inputCls} value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Author name" />
          </div>

          <div className="flex items-center gap-3 pt-5">
            <button
              type="button"
              onClick={() => set("published", !form.published)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.published ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.published ? "left-6" : "left-1"}`} />
            </button>
            <span className={`text-[13px] font-[600] ${form.published ? "text-green-600" : "text-gray-400"}`}>
              {form.published ? "Published" : "Draft"}
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Excerpt (short description)</label>
            <textarea rows={2} className={`${inputCls} resize-y`} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Brief summary shown in blog listings…" />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Content</label>
            <textarea rows={10} className={`${inputCls} resize-y font-mono leading-relaxed`} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write your full blog post here…" />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Cover Image</label>
            <p className="text-[11px] text-gray-400 mb-2">1200 × 630 px recommended (landscape 1.9:1). JPG or WebP.</p>
            <div className="flex items-center gap-4 flex-wrap">
              {preview && (
                <div className="relative">
                  <img src={preview} alt="preview" className="w-[120px] h-[80px] object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => { setPreview(""); setImageFile(null); set("image", ""); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center hover:bg-red-600">×</button>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#1565C0] rounded-xl text-[#1565C0] text-[13px] font-[600] bg-[#F0F5FF] hover:bg-[#E8EFFE] transition-colors"
              >
                <MdImage className="text-[16px]" />{preview ? "Change Image" : "Upload Image"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              {imageFile && <span className="text-[12px] text-gray-500 truncate max-w-[160px]">{imageFile.name}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60">
            {saving ? "Saving…" : initial?.id ? "Update Post" : "Publish Post"}
          </button>
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BlogManagement() {
  const [blogs,        setBlogs]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/blog/admin/all");
      setBlogs(res.data?.blogs || []);
    } catch { setBlogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBlogs(); }, []);

  const handleSave = () => {
    setShowForm(false); setEditing(null);
    fetchBlogs(); toast.success("Blog post saved!");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/blog/${deleteTarget.id}`);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success("Blog deleted"); setDeleteTarget(null);
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  };

  const handleTogglePublish = async (blog) => {
    try {
      const fd = new FormData();
      fd.append("title",     blog.title);
      fd.append("excerpt",   blog.excerpt  || "");
      fd.append("content",   blog.content  || "");
      fd.append("author",    blog.author   || "");
      fd.append("published", String(!blog.published));
      fd.append("image",     blog.image    || "");
      await adminAxios.put(`/api/blog/${blog.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setBlogs((prev) => prev.map((b) => b.id === blog.id ? { ...b, published: !b.published } : b));
    } catch { toast.error("Failed to update status"); }
  };

  const showingForm = showForm || !!editing;

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* Header */}
      {!showingForm && (
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-[800] text-[#1A237E]">
            Blog Posts <span className="text-[13px] font-[400] text-gray-400 ml-2">({blogs.length} total)</span>
          </h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors">
            <MdAdd className="text-[16px]" /> New Post
          </button>
        </div>
      )}

      {/* New / Edit form */}
      {showForm  && <BlogForm onSave={handleSave} onCancel={() => setShowForm(false)} />}
      {editing   && <BlogForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}

      {/* Blog list */}
      {!showingForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFF] border-b border-gray-100">
                  {["Cover", "Title", "Author", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  : blogs.length === 0
                  ? (
                    <tr><td colSpan={6}>
                      <EmptyState icon={<MdArticle />} title="No blog posts yet" subtitle='Click "New Post" to publish your first article.' />
                    </td></tr>
                  )
                  : blogs.map((blog) => (
                    <tr key={blog.id} className="border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors">
                      <td className="px-4 py-3">
                        {blog.image ? (
                          <img src={imgUrl(blog.image)} alt={blog.title} className="w-16 h-11 object-cover rounded-lg border border-gray-200" />
                        ) : (
                          <div className="w-16 h-11 bg-[#E8EAF6] rounded-lg flex items-center justify-center text-[#7986CB]">
                            <MdArticle className="text-[20px]" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="font-[700] text-[#1A237E] truncate">{blog.title}</p>
                        {blog.excerpt && <p className="text-[12px] text-gray-400 truncate mt-0.5">{blog.excerpt}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{blog.author}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTogglePublish(blog)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] transition-colors ${blog.published ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                        >
                          {blog.published ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-[12px] whitespace-nowrap">{fmtDate(blog.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditing(blog)} className="p-1.5 bg-blue-50 text-[#1565C0] rounded-lg hover:bg-blue-100 transition-colors"><MdEdit className="text-[15px]" /></button>
                          <button onClick={() => setDeleteTarget(blog)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdDelete className="text-[15px]" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex gap-3 animate-pulse">
                    <div className="w-16 h-11 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))
              : blogs.length === 0
              ? <EmptyState icon={<MdArticle />} title="No blog posts yet" subtitle='Click "New Post" to publish your first article.' />
              : blogs.map((blog) => (
                  <div key={blog.id} className="p-4 flex gap-3">
                    {blog.image
                      ? <img src={imgUrl(blog.image)} alt={blog.title} className="w-16 h-11 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                      : <div className="w-16 h-11 bg-[#E8EAF6] rounded-lg flex items-center justify-center text-[#7986CB] flex-shrink-0"><MdArticle className="text-[20px]" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-[700] text-[#1A237E] truncate text-[13px]">{blog.title}</p>
                      <p className="text-[11px] text-gray-400 mb-1">{blog.author} · {fmtDate(blog.createdAt)}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleTogglePublish(blog)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] transition-colors ${blog.published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {blog.published ? "Published" : "Draft"}
                        </button>
                        <button onClick={() => setEditing(blog)} className="p-1.5 bg-blue-50 text-[#1565C0] rounded-lg hover:bg-blue-100 transition-colors"><MdEdit className="text-[14px]" /></button>
                        <button onClick={() => setDeleteTarget(blog)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdDelete className="text-[14px]" /></button>
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[16px] font-[800] text-gray-800 mb-2">Delete Blog Post</h3>
            <p className="text-[13px] text-gray-500 mb-6">Delete <strong>"{deleteTarget.title}"</strong>? This cannot be undone.</p>
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
