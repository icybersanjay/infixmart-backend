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

const parseNumberInput = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumberInput = (value, digits = 2) => {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(digits)));
};

const computeDiscountPercent = (mrp, salePrice) => {
  if (!Number.isFinite(mrp) || mrp <= 0 || !Number.isFinite(salePrice)) {
    return "";
  }

  const normalizedSalePrice = Math.min(Math.max(salePrice, 0), mrp);
  return formatNumberInput(((mrp - normalizedSalePrice) / mrp) * 100);
};

const computeSalePrice = (mrp, discountPercent) => {
  if (!Number.isFinite(mrp) || mrp <= 0 || !Number.isFinite(discountPercent)) {
    return "";
  }

  const normalizedDiscount = Math.min(Math.max(discountPercent, 0), 100);
  return formatNumberInput(mrp - (mrp * normalizedDiscount) / 100);
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
  const [lastPricingInput, setLastPricingInput] = useState("price");

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
    // Legacy field name kept for DB compatibility; used as color options in the UI
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

  const handlePricingChange = (field) => (e) => {
    const value = e.target.value;

    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const mrp = parseNumberInput(field === "oldprice" ? value : prev.oldprice);

      if (field === "price") {
        next.discount = computeDiscountPercent(mrp, parseNumberInput(value));
        setLastPricingInput("price");
      } else if (field === "discount") {
        next.price = computeSalePrice(mrp, parseNumberInput(value));
        setLastPricingInput("discount");
      } else if (field === "oldprice") {
        if (!Number.isFinite(mrp) || mrp <= 0) {
          next.price = "";
          next.discount = "";
        } else if (lastPricingInput === "discount" && prev.discount !== "") {
          next.price = computeSalePrice(mrp, parseNumberInput(prev.discount));
        } else if (prev.price !== "") {
          next.discount = computeDiscountPercent(mrp, parseNumberInput(prev.price));
        }
      }

      return next;
    });

    if (formSubmitted && VALIDATION_RULES[field]) {
      const err = runValidators(VALIDATION_RULES[field], value);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleCatChange = (e) => {
    const catId = e.target.value;
    const cat = categories.find((c) => String(c.id) === catId);
    setForm((f) => ({ ...f, catId, catName: cat?.name || "" }));

    if (formSubmitted && VALIDATION_RULES.catId) {
      const err = runValidators(VALIDATION_RULES.catId, catId);
      setFieldErrors((prev) => ({ ...prev, catId: err }));
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  // Core upload handler — accepts a FileList or File[]
  const uploadFiles = async (files) => {
    if (!files.length) return;
    setForm((f) => {
      const slots = 5 - f.images.length;
      if (slots <= 0) { toast.error("Maximum 5 images allowed"); return f; }
      return f;
    });
    setImgUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
        const fd = new FormData();
        fd.append("images", file);
        const res = await adminAxios.post("/api/product/upload-images", fd);
        uploaded.push(res.data.images[0]);
      }
      if (uploaded.length) {
        setForm((f) => {
          const next = [...f.images, ...uploaded].slice(0, 5);
          if (next.length === 5 && f.images.length < 5) toast.success("Images uploaded!");
          return { ...f, images: next };
        });
      }
    } catch (err) {
      toast.error("Image upload failed");
    } finally {
      setImgUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImageFiles = (e) => uploadFiles(Array.from(e.target.files));

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    uploadFiles(files);
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items.filter(i => i.kind === "file" && i.type.startsWith("image/")).map(i => i.getAsFile());
    if (files.length) uploadFiles(files);
  };

  const removeImage = (idx) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const toArray = (str) =>
    str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (!validateAll()) {
      toast.error("Please fill all required fields before saving.");
      return;
    }
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

  const hasBlockingErrors = formSubmitted && Object.values(fieldErrors).some(Boolean);
  const submitDisabled = saving || hasBlockingErrors;

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
          <p style={{ fontSize: "0.8rem", color: "#777", marginTop: 0, marginBottom: "1rem" }}>
            Enter either <strong>MRP + Discount Price</strong> or <strong>MRP + % Off</strong>. The third value is calculated automatically.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Price (₹) <span style={{ color: "#E53935" }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: fieldErrors.price ? "#E53935" : "#ddd" }} type="number" min="0" value={form.price} onChange={handlePricingChange("price")} placeholder="0" />
              {fieldErrors.price && <p style={{ color: "#E53935", fontSize: "0.78rem", marginTop: 4 }}>{fieldErrors.price}</p>}
            </div>
            <div>
              <label style={labelStyle}>Original Price (₹) <span style={{ color: "#999", fontSize: "0.78rem" }}>strikethrough</span></label>
              <input style={inputStyle} type="number" min="0" value={form.oldprice} onChange={handlePricingChange("oldprice")} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Discount (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={form.discount} onChange={handlePricingChange("discount")} placeholder="0" />
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
          <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.75rem", marginTop: 0 }}>
            📐 <strong>800 × 800 px</strong> square recommended. First image = main display. JPG or WebP.
          </p>

          {/* Drop + paste zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onPaste={handlePaste}
            onClick={() => !imgUploading && form.images.length < 5 && fileRef.current.click()}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current.click()}
            style={{
              border: `2px dashed ${isDragging ? "#1565C0" : "#BDBDBD"}`,
              borderRadius: 8,
              padding: "1.5rem 1rem",
              textAlign: "center",
              cursor: form.images.length >= 5 || imgUploading ? "not-allowed" : "pointer",
              background: isDragging ? "#EEF4FF" : "#FAFAFA",
              color: isDragging ? "#1565C0" : "#888",
              fontSize: "0.875rem",
              transition: "all 0.2s",
              outline: "none",
              userSelect: "none",
            }}
          >
            {imgUploading ? (
              <span>⏳ Uploading…</span>
            ) : form.images.length >= 5 ? (
              <span style={{ color: "#999" }}>✅ Maximum 5 images reached</span>
            ) : isDragging ? (
              <span style={{ fontWeight: 600 }}>Drop images here</span>
            ) : (
              <>
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>🖼️</div>
                <div><strong>Click</strong>, <strong>Drag & Drop</strong>, or <strong>Paste</strong> images here</div>
                <div style={{ fontSize: "0.75rem", marginTop: "0.3rem", opacity: 0.7 }}>
                  {form.images.length}/5 uploaded · Ctrl+V to paste from clipboard
                </div>
              </>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageFiles} />

          {/* Previews */}
          {form.images.length > 0 && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
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
                  {idx === 0 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(21,101,192,0.8)", color: "#fff", fontSize: "0.6rem", textAlign: "center", borderRadius: "0 0 8px 8px", padding: "2px 0" }}>
                      MAIN
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Variants ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={sectionTitle}>Variants <span style={{ fontSize: "0.8rem", color: "#999", fontWeight: 400 }}>comma-separated values</span></p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Color Options</label>
              <input style={inputStyle} value={form.productRam} onChange={set("productRam")} placeholder="e.g. Black, Blue, Silver" />
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
            disabled={submitDisabled}
            style={{ padding: "0.65rem 1.5rem", background: saving ? "#90CAF9" : "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: submitDisabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.9rem", opacity: hasBlockingErrors ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : (isEdit ? "Update Product" : "Save Product")}
          </button>
        </div>
      </form>
    </div>
  );
}
