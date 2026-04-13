"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MdClose, MdArrowBack } from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import { useForm, required, minLength, greaterThan, minVal } from "../../hooks/useForm";

const imgUrl = (p) => (p ? p : "");

const inputStyle = { width: "100%", padding: "0.6rem 0.875rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "0.35rem", fontSize: "0.875rem", fontWeight: 500, color: "#444" };
const sectionTitle = { fontSize: "0.95rem", fontWeight: 600, color: "#1A237E", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #E0E0E0" };

function flatten(cats, depth = 0) {
  return cats.flatMap((c) => [{ ...c, depth }, ...flatten(c.children || [], depth + 1)]);
}

// Run validators from useForm.js against a value
const runValidators = (validators, value) => {
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return '';
};

export default function ProductForm() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const isEdit = Boolean(id);
  const fileRef = useRef();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    brand: "",
    catName: "",
    catId: "",
    price: "",
    oldprice: "",
    countInStock: "",
    isFeatured: false,
    discount: "",
    images: [],
    // Variants stored as comma-separated strings for the UI
    productRam: "",
    size: "",
    productWeight: "",
  });

  // Load categories
  useEffect(() => {
    adminAxios.get("/api/category").then((res) => {
      setCategories(flatten(res.data.data || []));
    }).catch(console.error);
  }, []);

  // Load product if editing
  useEffect(() => {
    if (!isEdit) return;
    adminAxios.get(`/api/product/getproduct/${id}`)
      .then((res) => {
        const p = res.data.product;
        if (!p) return;
        setForm({
          name: p.name || "",
          description: p.description || "",
          brand: p.brand || "",
          catName: p.catName || "",
          catId: p.catId ? String(p.catId) : "",
          price: p.price ?? "",
          oldprice: p.oldprice ?? "",
          countInStock: p.countInStock ?? "",
          isFeatured: p.isFeatured || false,
          discount: p.discount ?? "",
          images: p.images || [],
          productRam: Array.isArray(p.productRam) ? p.productRam.join(", ") : (p.productRam || ""),
          size: Array.isArray(p.size) ? p.size.join(", ") : (p.size || ""),
          productWeight: Array.isArray(p.productWeight) ? p.productWeight.join(", ") : (p.productWeight || ""),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const VALIDATION_RULES = {
    name:         [required('Product name is required'), minLength(3, 'Min 3 characters')],
    price:        [required('Price is required'), greaterThan(0, 'Price must be greater than 0')],
    countInStock: [required('Stock is required'), minVal(0, 'Stock cannot be negative')],
    catId:        [required('Please select a category')],
  };

  const validateAll = () => {
    const errs = {};
    Object.entries(VALIDATION_RULES).forEach(([field, validators]) => {
      const err = runValidators(validators, form[field] ?? '');
      if (err) errs[field] = err;
    });
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (formSubmitted && VALIDATION_RULES[field]) {
      const err = runValidators(VALIDATION_RULES[field], value);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };
  const setCheck = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleCatChange = (e) => {
    const catId = e.target.value;
    const cat = categories.find((c) => String(c.id) === catId);
    setForm((f) => ({ ...f, catId, catName: cat?.name || "" }));
  };

  // Upload images (one by one when each file is selected)
  const handleImageFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setImgUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("images", file);
        const res = await adminAxios.post("/api/product/upload-images", fd);
        uploaded.push(res.data.images[0]);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded].slice(0, 5) }));
    } catch (err) {
      toast.error("Image upload failed");
    } finally {
      setImgUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const toArray = (str) =>
    str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (!validateAll()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        brand: form.brand.trim() || null,
        catName: form.catName || null,
        catId: form.catId || null,
        price: Number(form.price) || 0,
        oldprice: Number(form.oldprice) || 0,
        countInStock: Number(form.countInStock) || 0,
        isFeatured: form.isFeatured,
        discount: form.discount ? Number(form.discount) : null,
        images: form.images,
        productRam: toArray(form.productRam),
        size: toArray(form.size),
        productWeight: toArray(form.productWeight),
      };

      if (isEdit) {
        await adminAxios.put(`/api/product/updateproduct/${id}`, payload);
      } else {
        await adminAxios.post("/api/product/create", payload);
      }
      toast.success("Product saved!");
      setTimeout(() => router.push("/admin/products"), 900);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "#999" }}>
        Loading product…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      <Toaster position="top-right" />

      {/* Back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button onClick={() => router.push("/admin/products")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565C0", fontSize: "1.4rem", lineHeight: 1, display: "flex" }}>
          <MdArrowBack />
        </button>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>
          {isEdit ? "Edit Product" : "Add New Product"}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Basic Info ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1rem" }}>
          <p style={sectionTitle}>Basic Information</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Product Name <span style={{ color: "#E53935" }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: fieldErrors.name ? "#E53935" : "#ddd" }} value={form.name} onChange={set("name")} placeholder="e.g. Wireless Earbuds" />
              {fieldErrors.name && <p style={{ color: "#E53935", fontSize: "0.78rem", marginTop: 4 }}>{fieldErrors.name}</p>}
            </div>
            <div>
              <label style={labelStyle}>Brand</label>
              <input style={inputStyle} value={form.brand} onChange={set("brand")} placeholder="e.g. Sony" />
            </div>
          </div>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
            value={form.description}
            onChange={set("description")}
            placeholder="Product description…"
          />
        </div>

        {/* ── Pricing & Stock ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1rem" }}>
          <p style={sectionTitle}>Pricing & Stock</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Price (₹) <span style={{ color: "#E53935" }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: fieldErrors.price ? "#E53935" : "#ddd" }} type="number" min="0" value={form.price} onChange={set("price")} placeholder="0" />
              {fieldErrors.price && <p style={{ color: "#E53935", fontSize: "0.78rem", marginTop: 4 }}>{fieldErrors.price}</p>}
            </div>
            <div>
              <label style={labelStyle}>Original Price (₹) <span style={{ color: "#999", fontSize: "0.78rem" }}>strikethrough</span></label>
              <input style={inputStyle} type="number" min="0" value={form.oldprice} onChange={set("oldprice")} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Discount (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={form.discount} onChange={set("discount")} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Count In Stock <span style={{ color: "#E53935" }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: fieldErrors.countInStock ? "#E53935" : "#ddd" }} type="number" min="0" value={form.countInStock} onChange={set("countInStock")} placeholder="0" />
              {fieldErrors.countInStock && <p style={{ color: "#E53935", fontSize: "0.78rem", marginTop: 4 }}>{fieldErrors.countInStock}</p>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" id="featured" checked={form.isFeatured} onChange={setCheck("isFeatured")} style={{ width: 16, height: 16, accentColor: "#1565C0", cursor: "pointer" }} />
            <label htmlFor="featured" style={{ fontSize: "0.875rem", color: "#444", cursor: "pointer" }}>Mark as Featured</label>
          </div>
        </div>

        {/* ── Category ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1rem" }}>
          <p style={sectionTitle}>Category</p>
          <label style={labelStyle}>Select Category <span style={{ color: "#E53935" }}>*</span></label>
          <select style={{ ...inputStyle, background: "#fff", borderColor: fieldErrors.catId ? "#E53935" : "#ddd" }} value={form.catId} onChange={handleCatChange}>
            <option value="">— Select category —</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}
              </option>
            ))}
          </select>
          {fieldErrors.catId && <p style={{ color: "#E53935", fontSize: "0.78rem", marginTop: 4 }}>{fieldErrors.catId}</p>}
        </div>

        {/* ── Images ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1rem" }}>
          <p style={sectionTitle}>Product Images <span style={{ fontSize: "0.8rem", color: "#999", fontWeight: 400 }}>max 5</span></p>
          {/* Previews */}
          {form.images.length > 0 && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {form.images.map((img, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  <img src={imgUrl(img)} alt={`img-${idx}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #E0E0E0" }} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E53935", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <MdClose style={{ fontSize: "0.7rem" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {form.images.length < 5 && (
            <>
              <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.4rem", marginTop: 0 }}>
                📐 <strong>800 × 800 px</strong> square images recommended. First image = main display image. JPG or WebP. Max 5 images.
              </p>
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: "2px dashed #BDBDBD", borderRadius: 8, padding: "1.25rem", textAlign: "center", cursor: "pointer", background: "#FAFAFA", color: "#888", fontSize: "0.875rem" }}
              >
                {imgUploading ? "Uploading…" : `Click to upload images (${form.images.length}/5)`}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageFiles} />
            </>
          )}
        </div>

        {/* ── Variants ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={sectionTitle}>Variants <span style={{ fontSize: "0.8rem", color: "#999", fontWeight: 400 }}>comma-separated values</span></p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>RAM Options</label>
              <input style={inputStyle} value={form.productRam} onChange={set("productRam")} placeholder="e.g. 4GB, 8GB, 16GB" />
            </div>
            <div>
              <label style={labelStyle}>Size Options</label>
              <input style={inputStyle} value={form.size} onChange={set("size")} placeholder="e.g. S, M, L, XL" />
            </div>
            <div>
              <label style={labelStyle}>Weight Options</label>
              <input style={inputStyle} value={form.productWeight} onChange={set("productWeight")} placeholder="e.g. 250g, 500g, 1kg" />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => router.push("/admin/products")} style={{ padding: "0.65rem 1.25rem", background: "#F5F5F5", color: "#555", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (formSubmitted && Object.values(fieldErrors).some(Boolean))}
            style={{ padding: "0.65rem 1.5rem", background: saving ? "#90CAF9" : "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.9rem", opacity: (formSubmitted && Object.values(fieldErrors).some(Boolean)) ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : (isEdit ? "Update Product" : "Save Product")}
          </button>
        </div>
      </form>
    </div>
  );
}
