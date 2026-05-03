"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MdClose, MdArrowBack } from "react-icons/md";
import adminAxios from "../../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import { useForm, required, minLength, greaterThan, minVal } from "../../../../_legacy/hooks/useForm";

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
  return formatNumberInput(((mrp - normalizedSalePrice) / mrp) * 100, 0);
};

const computeSalePrice = (mrp, discountPercent) => {
  if (!Number.isFinite(mrp) || mrp <= 0 || !Number.isFinite(discountPercent)) {
    return "";
  }

  const normalizedDiscount = Math.min(Math.max(discountPercent, 0), 100);
  return formatNumberInput(mrp - (mrp * normalizedDiscount) / 100, 0);
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
    sku: "",
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
    videoUrl: "",
    saleEndsAt: "",
  });

  // First-class ProductVariants — editable rows, persisted via a separate
  // PUT /api/product/{id}/variants call after the product itself is saved.
  // attributesText is a UI-only string ("size:M, color:Black") that we parse
  // into an attributes object on save.
  const [variantRows, setVariantRows] = useState([]);

  // Bulk-pricing tiers (Section E). Stored in Products.priceTiers JSON and
  // included in the same payload as the product itself — no separate API call.
  // Each row is { minQty, price } where minQty must be ≥ 2 (qty 1 is the base).
  const [tierRows, setTierRows] = useState([]);

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
          sku: p.sku || "",
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
          videoUrl: p.videoUrl || "",
          saleEndsAt: p.saleEndsAt ? p.saleEndsAt.slice(0, 16) : "",
        });
        const tiers = Array.isArray(p.priceTiers) ? p.priceTiers : [];
        setTierRows(
          tiers
            .filter((t) => t && Number(t.minQty) >= 2 && Number(t.price) >= 0)
            .map((t) => ({ minQty: String(t.minQty), price: String(t.price) }))
            .sort((a, b) => Number(a.minQty) - Number(b.minQty))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load existing variants in parallel — failures are non-fatal because
    // older products may not have any.
    adminAxios.get(`/api/product/${id}/variants`)
      .then((res) => {
        const list = Array.isArray(res.data?.variants) ? res.data.variants : [];
        setVariantRows(list.map((v, i) => ({
          id: v.id,
          name: v.name || "",
          sku: v.sku || "",
          attributesText: Object.entries(v.attributes || {})
            .map(([k, val]) => `${k}:${val}`)
            .join(", "),
          price: v.price ?? "",
          stock: v.stock ?? "",
          isActive: v.isActive !== false,
          position: v.position ?? i,
        })));
      })
      .catch(() => setVariantRows([]));
  }, [id, isEdit]);

  function addTierRow() {
    setTierRows((rows) => {
      const lastQty = rows.length ? Number(rows[rows.length - 1].minQty) || 0 : 0;
      const suggested = lastQty < 10 ? 10 : lastQty * 2;
      return [...rows, { minQty: String(suggested), price: form.price || "" }];
    });
  }

  function updateTierRow(idx, patch) {
    setTierRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeTierRow(idx) {
    setTierRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function addVariantRow() {
    setVariantRows((rows) => [
      ...rows,
      {
        name: "",
        sku: "",
        attributesText: "",
        price: form.price || "",
        stock: 0,
        isActive: true,
        position: rows.length,
      },
    ]);
  }

  function updateVariantRow(idx, patch) {
    setVariantRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeVariantRow(idx) {
    setVariantRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function moveVariantRow(idx, delta) {
    setVariantRows((rows) => {
      const next = [...rows];
      const swap = idx + delta;
      if (swap < 0 || swap >= next.length) return rows;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((r, i) => ({ ...r, position: i }));
    });
  }

  // Parse "size:M, color:Black" → { size: "M", color: "Black" }. Empty pairs
  // and pairs without a colon are silently dropped — matches admin intent of
  // typing free-form key:value comma-separated.
  function parseAttributes(text) {
    if (!text) return {};
    return text
      .split(",")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .reduce((acc, pair) => {
        const idx = pair.indexOf(":");
        if (idx <= 0) return acc;
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        if (k && v) acc[k] = v;
        return acc;
      }, {});
  }

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
      // Clean tier rows for the payload — drop blanks, coerce, sort.
      const cleanedTiers = tierRows
        .map((t) => ({
          minQty: Math.floor(Number(t.minQty)),
          price: Number(t.price),
        }))
        .filter(
          (t) =>
            Number.isFinite(t.minQty) &&
            t.minQty >= 2 &&
            Number.isFinite(t.price) &&
            t.price >= 0
        )
        .sort((a, b) => a.minQty - b.minQty);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        brand: form.brand.trim() || null,
        sku: form.sku.trim() || null,
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
        priceTiers: cleanedTiers,
        videoUrl: form.videoUrl.trim() || null,
        saleEndsAt: form.saleEndsAt || null,
      };

      let savedProductId;
      if (isEdit) {
        await adminAxios.put(`/api/product/updateproduct/${id}`, payload);
        savedProductId = id;
      } else {
        const createRes = await adminAxios.post("/api/product/create", payload);
        savedProductId = createRes.data?.product?.id ?? createRes.data?.product?._id;
      }

      // Replace-all variant rows. Skipped silently when there are no rows AND
      // we're in create mode — saves a no-op API call. In edit mode we still
      // PUT so admins can clear all variants by deleting the rows.
      if (savedProductId && (variantRows.length > 0 || isEdit)) {
        const cleaned = variantRows
          .map((row, i) => ({
            sku: row.sku?.trim() || null,
            name: row.name?.trim(),
            attributes: parseAttributes(row.attributesText),
            price: Number(row.price) || 0,
            stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
            isActive: row.isActive !== false,
            position: i,
          }))
          .filter((r) => r.name); // drop empty rows
        try {
          await adminAxios.put(`/api/product/${savedProductId}/variants`, {
            variants: cleaned,
          });
        } catch (err) {
          // Variants failed but product saved — surface a partial-success warning
          // rather than blocking the navigation.
          toast.error(`Product saved, but variants failed: ${err.response?.data?.message || err.message}`);
          setSaving(false);
          return;
        }
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
            <div>
              <label style={labelStyle}>SKU</label>
              <input style={inputStyle} value={form.sku} onChange={set("sku")} placeholder="e.g. WE-BLK-001" />
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
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Product Video URL (YouTube)</label>
              <input style={inputStyle} value={form.videoUrl} onChange={set("videoUrl")} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div>
              <label style={labelStyle}>Flash Sale Ends At</label>
              <input type="datetime-local" style={inputStyle} value={form.saleEndsAt} onChange={set("saleEndsAt")} />
            </div>
          </div>
        </div>

        {/* ── Bulk-pricing tiers ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, border: "none" }}>
              Bulk Pricing Tiers <span style={{ fontSize: "0.8rem", color: "#999", fontWeight: 400 }}>per-quantity discount</span>
            </p>
            <button
              type="button"
              onClick={addTierRow}
              style={{ padding: "0.4rem 0.85rem", background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
            >
              + Add Tier
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.85rem" }}>
            Wholesale tiered pricing. When the customer's quantity reaches a tier's <code style={{ background: "#f5f5f5", padding: "0 4px", borderRadius: 3 }}>minQty</code>, the per-unit price drops to that tier's value. Qty 1 always uses the base product price (₹{form.price || 0}). Tiers don't apply to lines that have a first-class variant selected — variants have their own per-SKU price.
          </p>

          {tierRows.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#aaa", textAlign: "center", padding: "1rem 0" }}>
              No tiers yet. Click <strong>Add Tier</strong> to give bulk-buyers a quantity discount.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.5rem", fontSize: "0.72rem", color: "#888", fontWeight: 600, padding: "0 0.25rem" }}>
                <div>MIN QTY</div>
                <div>UNIT PRICE (₹)</div>
                <div>SAVINGS / UNIT</div>
                <div></div>
              </div>
              {tierRows.map((row, idx) => {
                const minQty = Number(row.minQty) || 0;
                const tierPrice = Number(row.price) || 0;
                const basePrice = Number(form.price) || 0;
                const perUnitSavings = basePrice > tierPrice ? (basePrice - tierPrice).toFixed(2) : "—";
                const invalid = minQty < 2 || tierPrice < 0 || tierPrice > basePrice;
                return (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.5rem", alignItems: "center", padding: "0.4rem", background: invalid ? "#FFF5F5" : "#FAFAFA", borderRadius: 6, border: `1px solid ${invalid ? "#FCA5A5" : "#EEE"}` }}>
                    <input
                      type="number"
                      min="2"
                      step="1"
                      style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                      value={row.minQty}
                      onChange={(e) => updateTierRow(idx, { minQty: e.target.value })}
                      placeholder="e.g. 10"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                      value={row.price}
                      onChange={(e) => updateTierRow(idx, { price: e.target.value })}
                      placeholder="e.g. 90"
                    />
                    <div style={{ fontSize: "0.82rem", color: invalid ? "#DC2626" : "#16A34A", fontWeight: 600 }}>
                      {invalid ? "Invalid (qty ≥ 2, price ≤ base)" : `₹${perUnitSavings}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTierRow(idx)}
                      title="Remove tier"
                      style={{ padding: "0.25rem 0.5rem", border: "1px solid #FCA5A5", background: "#FFF5F5", color: "#DC2626", borderRadius: 4, cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ProductVariants (first-class rows) ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, border: "none" }}>
              Product Variants <span style={{ fontSize: "0.8rem", color: "#999", fontWeight: 400 }}>per-SKU price + stock</span>
            </p>
            <button
              type="button"
              onClick={addVariantRow}
              style={{ padding: "0.4rem 0.85rem", background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
            >
              + Add Variant
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.85rem" }}>
            When at least one variant is defined, the product detail page shows a variant picker that overrides the legacy color/size/weight chips. Stock decrements happen on the variant row; the parent product's <code style={{ background: "#f5f5f5", padding: "0 4px", borderRadius: 3 }}>countInStock</code> is left alone.
          </p>

          {variantRows.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#aaa", textAlign: "center", padding: "1rem 0" }}>
              No variants yet. Click <strong>Add Variant</strong> to create one — for example, <em>Size: M</em> with its own SKU, price, and stock.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 0.9fr 0.7fr 0.6fr auto", gap: "0.5rem", fontSize: "0.72rem", color: "#888", fontWeight: 600, padding: "0 0.25rem" }}>
                <div>NAME</div>
                <div>SKU</div>
                <div>ATTRIBUTES (key:value, …)</div>
                <div>PRICE (₹)</div>
                <div>STOCK</div>
                <div>ACTIVE</div>
                <div></div>
              </div>
              {variantRows.map((row, idx) => (
                <div key={row.id ?? `new-${idx}`} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 0.9fr 0.7fr 0.6fr auto", gap: "0.5rem", alignItems: "center", padding: "0.4rem", background: "#FAFAFA", borderRadius: 6, border: "1px solid #EEE" }}>
                  <input
                    style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                    value={row.name}
                    onChange={(e) => updateVariantRow(idx, { name: e.target.value })}
                    placeholder="e.g. Large / Black"
                  />
                  <input
                    style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                    value={row.sku}
                    onChange={(e) => updateVariantRow(idx, { sku: e.target.value })}
                    placeholder="optional"
                  />
                  <input
                    style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                    value={row.attributesText}
                    onChange={(e) => updateVariantRow(idx, { attributesText: e.target.value })}
                    placeholder="size:L, color:Black"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                    value={row.price}
                    onChange={(e) => updateVariantRow(idx, { price: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={{ ...inputStyle, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }}
                    value={row.stock}
                    onChange={(e) => updateVariantRow(idx, { stock: e.target.value })}
                  />
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={row.isActive !== false}
                      onChange={(e) => updateVariantRow(idx, { isActive: e.target.checked })}
                    />
                  </label>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button type="button" onClick={() => moveVariantRow(idx, -1)} disabled={idx === 0}
                      title="Move up"
                      style={{ padding: "0.25rem 0.45rem", border: "1px solid #ddd", background: "#fff", borderRadius: 4, cursor: idx === 0 ? "not-allowed" : "pointer", fontSize: "0.7rem", opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                    <button type="button" onClick={() => moveVariantRow(idx, +1)} disabled={idx === variantRows.length - 1}
                      title="Move down"
                      style={{ padding: "0.25rem 0.45rem", border: "1px solid #ddd", background: "#fff", borderRadius: 4, cursor: idx === variantRows.length - 1 ? "not-allowed" : "pointer", fontSize: "0.7rem", opacity: idx === variantRows.length - 1 ? 0.4 : 1 }}>↓</button>
                    <button type="button" onClick={() => removeVariantRow(idx)}
                      title="Remove"
                      style={{ padding: "0.25rem 0.5rem", border: "1px solid #FCA5A5", background: "#FFF5F5", color: "#DC2626", borderRadius: 4, cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
