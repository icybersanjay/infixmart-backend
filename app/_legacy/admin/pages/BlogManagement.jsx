import React, { useEffect, useRef, useState } from 'react';
import adminAxios from '../utils/adminAxios';
import { imgUrl } from '../../utils/imageUrl';

const BASE_FORM = {
  title: '', excerpt: '', content: '', author: 'InfixMart Team', published: false, image: '',
};

const inputCls = {
  width: '100%', padding: '8px 12px', border: '1px solid #ddd',
  borderRadius: 6, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
};
const labelCls = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: '#555', marginBottom: 5,
};

// ── Form ─────────────────────────────────────────────────────────────────────
const BlogForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm]         = useState(initial || BASE_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]   = useState(initial?.image ? imgUrl(initial.image) : '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef();

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');

    const fd = new FormData();
    fd.append('title',     form.title);
    fd.append('excerpt',   form.excerpt);
    fd.append('content',   form.content);
    fd.append('author',    form.author);
    fd.append('published', String(form.published));
    if (imageFile) fd.append('image', imageFile);
    else if (form.image) fd.append('image', form.image);

    try {
      if (initial?.id) {
        await adminAxios.put(`/api/blog/${initial.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await adminAxios.post('/api/blog', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save blog');
    }
    setSaving(false);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1A237E', marginBottom: '1.25rem' }}>
        {initial?.id ? 'Edit Blog Post' : 'New Blog Post'}
      </h2>

      {error && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Title */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelCls}>Title *</label>
            <input style={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder='Blog post title' />
          </div>

          {/* Author */}
          <div>
            <label style={labelCls}>Author</label>
            <input style={inputCls} value={form.author} onChange={(e) => set('author', e.target.value)} placeholder='Author name' />
          </div>

          {/* Published toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20 }}>
            <label style={{ ...labelCls, marginBottom: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                onClick={() => set('published', !form.published)}
                style={{
                  position: 'relative', width: 44, height: 24, borderRadius: 12,
                  background: form.published ? '#00A651' : '#ccc', cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: form.published ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: form.published ? '#00A651' : '#888' }}>
                {form.published ? 'Published' : 'Draft'}
              </span>
            </label>
          </div>

          {/* Excerpt */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelCls}>Excerpt (short description)</label>
            <textarea
              rows={2}
              style={{ ...inputCls, resize: 'vertical' }}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              placeholder='Brief summary shown in blog listings...'
            />
          </div>

          {/* Content */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelCls}>Content</label>
            <textarea
              rows={10}
              style={{ ...inputCls, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder='Write your full blog post here...'
            />
          </div>

          {/* Image upload */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelCls}>Cover Image</label>
            <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', marginTop: 0 }}>
              📐 <strong>1200 × 630 px</strong> recommended (landscape, 1.9:1 ratio). Also used as the social share preview image. JPG or WebP.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {preview && (
                <img src={preview} alt='preview' style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
              )}
              <button
                type='button'
                onClick={() => fileRef.current.click()}
                style={{
                  padding: '8px 16px', border: '1.5px dashed #1565C0', borderRadius: 6,
                  color: '#1565C0', background: '#f0f5ff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                {preview ? 'Change Image' : 'Upload Image'}
              </button>
              <input ref={fileRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleFile} />
              {imageFile && <span style={{ fontSize: '0.75rem', color: '#555' }}>{imageFile.name}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type='submit'
            disabled={saving}
            style={{
              padding: '9px 24px', background: saving ? '#90CAF9' : '#1565C0',
              color: '#fff', border: 'none', borderRadius: 6,
              fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : (initial?.id ? 'Update Post' : 'Publish Post')}
          </button>
          <button
            type='button'
            onClick={onCancel}
            style={{
              padding: '9px 20px', background: '#fff', color: '#555',
              border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const BlogManagement = () => {
  const [blogs, setBlogs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get('/api/blog/admin/all');
      setBlogs(res.data?.blogs || []);
    } catch {
      setBlogs([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBlogs(); }, []);

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    fetchBlogs();
    showToast('Blog post saved!');
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await adminAxios.delete(`/api/blog/${id}`);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      showToast('Blog deleted');
    } catch {
      showToast('Failed to delete');
    }
  };

  const handleTogglePublish = async (blog) => {
    try {
      const fd = new FormData();
      fd.append('title',     blog.title);
      fd.append('excerpt',   blog.excerpt || '');
      fd.append('content',   blog.content || '');
      fd.append('author',    blog.author  || '');
      fd.append('published', String(!blog.published));
      fd.append('image',     blog.image   || '');
      await adminAxios.put(`/api/blog/${blog.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBlogs((prev) => prev.map((b) => b.id === blog.id ? { ...b, published: !b.published } : b));
    } catch {
      showToast('Failed to update status');
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.includes('Failed') ? '#E53935' : '#00A651',
          color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}

      {/* Header row */}
      {!showForm && !editing && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1A237E', margin: 0 }}>
              {blogs.length} Blog Post{blogs.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '9px 20px', background: '#1565C0', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            + New Blog Post
          </button>
        </div>
      )}

      {/* New form */}
      {showForm && (
        <BlogForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {/* Edit form */}
      {editing && (
        <BlogForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Blog list */}
      {!showForm && !editing && (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: '0.875rem' }}>
              Loading blogs…
            </div>
          ) : blogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>
              <p style={{ fontSize: '2rem', marginBottom: 8 }}>📝</p>
              <p style={{ fontWeight: 600 }}>No blog posts yet</p>
              <p style={{ fontSize: '0.8rem' }}>Click "New Blog Post" to create your first post.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F7FF', borderBottom: '2px solid #e8ecf8' }}>
                  {['Cover', 'Title', 'Author', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#1A237E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog, i) => (
                  <tr key={blog.id} style={{ borderBottom: i < blogs.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ padding: '10px 14px' }}>
                      {blog.image ? (
                        <img
                          src={imgUrl(blog.image)}
                          alt={blog.title}
                          style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 5, border: '1px solid #eee' }}
                        />
                      ) : (
                        <div style={{ width: 64, height: 44, background: '#f0f0f0', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                          📝
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1A237E', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {blog.title}
                      </p>
                      {blog.excerpt && (
                        <p style={{ fontSize: '0.75rem', color: '#888', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {blog.excerpt}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#555' }}>{blog.author}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => handleTogglePublish(blog)}
                        style={{
                          padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          fontSize: '0.75rem', fontWeight: 700,
                          background: blog.published ? '#E8F5E9' : '#FFF3E0',
                          color: blog.published ? '#2E7D32' : '#E65100',
                        }}
                      >
                        {blog.published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(blog.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setEditing(blog)}
                          style={{
                            padding: '5px 12px', background: '#EEF4FF', color: '#1565C0',
                            border: '1px solid #c7d9f8', borderRadius: 5, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(blog.id, blog.title)}
                          style={{
                            padding: '5px 12px', background: '#FFEBEE', color: '#C62828',
                            border: '1px solid #ffcdd2', borderRadius: 5, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
