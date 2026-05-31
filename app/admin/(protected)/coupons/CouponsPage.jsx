"use client";

import { useEffect, useState } from "react";
import { MdAdd, MdEdit, MdDelete, MdClose, MdLocalOffer } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import EmptyState from "../../../_legacy/components/EmptyState";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";

const inr = (n) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const EMPTY_FORM = {
  code: "", description: "", type: "percent", value: "",
  minOrderValue: "", maxDiscount: "", usageLimit: "", isActive: true, expiresAt: "",
  restrictionType: "none", restrictedEmail: "",
};

const inputCls = "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
const labelCls = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

export default function CouponManagement() {
  const [coupons,      setCoupons]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [formError,    setFormError]    = useState("");

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/admin/coupons");
      setCoupons(res.data.coupons || []);
    } catch { toast.error("Failed to load coupons"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCoupons(); }, []);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormError(""); setModal(true); };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({
      code: c.code, description: c.description || "", type: c.type, value: c.value,
      minOrderValue: c.minOrderValue ?? "", maxDiscount: c.maxDiscount ?? "",
      usageLimit: c.usageLimit ?? "", isActive: c.isActive,
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
      restrictionType: c.restrictionType || "none", restrictedEmail: c.restrictedEmail || "",
    });
    setFormError(""); setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { setFormError("Coupon code is required"); return; }
    if (!form.value || isNaN(form.value) || Number(form.value) <= 0) { setFormError("Value must be a positive number"); return; }
    if (form.type === "percent" && Number(form.value) > 100) { setFormError("Percent discount cannot exceed 100%"); return; }
    if (form.restrictionType === "email" && !form.restrictedEmail.trim()) { setFormError("Email required for email-restricted coupon"); return; }
    setSaving(true); setFormError("");
    const payload = {
      code: form.code.toUpperCase().trim(), description: form.description || null,
      type: form.type, value: Number(form.value),
      minOrderValue: form.minOrderValue !== "" ? Number(form.minOrderValue) : 0,
      maxDiscount: form.maxDiscount !== "" ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : null,
      isActive: form.isActive, expiresAt: form.expiresAt || null,
      restrictionType: form.restrictionType || "none",
      restrictedEmail: form.restrictionType === "email" ? form.restrictedEmail.trim().toLowerCase() : null,
    };
    try {
      if (editItem) { await adminAxios.put(`/api/admin/coupons/${editItem.id}`, payload); toast.success("Coupon updated"); }
      else          { await adminAxios.post("/api/admin/coupons", payload); toast.success("Coupon created"); }
      setModal(false); loadCoupons();
    } catch (err) { setFormError(err.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await adminAxios.delete(`/api/admin/coupons/${deleteTarget.id}`); toast.success("Coupon deleted"); setDeleteTarget(null); loadCoupons(); }
    catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-[800] text-[#1A237E]">
          Coupons <span className="text-[13px] font-[400] text-gray-400 ml-2">({coupons.length} total)</span>
        </h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors">
          <MdAdd className="text-[16px]" /> Add Coupon
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFF] border-b border-gray-100">
                {["Code","Type","Value","Min Order","Max Disc.","Uses","Expires","Restriction","Status","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={10} />)
                : coupons.length === 0
                ? <tr><td colSpan={10}><EmptyState icon={<MdLocalOffer />} title="No coupons yet" subtitle="Create your first coupon to offer discounts." /></td></tr>
                : coupons.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors">
                    <td className="px-4 py-3 font-[800] text-[#1A237E] tracking-wider">{c.code}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 font-[700] text-gray-800">{c.type === "percent" ? `${c.value}%` : inr(c.value)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.minOrderValue ? inr(c.minOrderValue) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{c.maxDiscount ? inr(c.maxDiscount) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{c.usageCount ?? 0}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(c.expiresAt)}</td>
                    <td className="px-4 py-3">
                      {c.restrictionType === "first_order" && <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-amber-100 text-amber-700 whitespace-nowrap">First Order</span>}
                      {c.restrictionType === "email" && <span title={c.restrictedEmail} className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-purple-100 text-purple-700 max-w-[130px] truncate inline-block">{c.restrictedEmail || "Email"}</span>}
                      {(!c.restrictionType || c.restrictionType === "none") && <span className="text-gray-400 text-[12px]">Everyone</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 bg-blue-50 text-[#1565C0] rounded-lg hover:bg-blue-100 transition-colors"><MdEdit className="text-[15px]" /></button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdDelete className="text-[15px]" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-50 space-y-2 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-36 bg-gray-100 rounded" />
                </div>
              ))
            : coupons.length === 0
            ? <EmptyState icon={<MdLocalOffer />} title="No coupons yet" subtitle="Create your first coupon to offer discounts." />
            : coupons.map((c) => (
                <div key={c.id} className="p-4 border-b border-gray-50 last:border-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-[800] text-[#1A237E] tracking-wider">{c.code}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-[700] text-gray-800">
                      {c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} flat`}
                    </span>
                    <span className="text-[11px] text-gray-400 capitalize">{c.type}</span>
                    {c.restrictionType === "first_order" && <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-amber-100 text-amber-700">First Order</span>}
                    {c.restrictionType === "email" && <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-purple-100 text-purple-700">Email Only</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[12px] text-gray-500">
                    {c.minOrderValue > 0 && <span>Min: {inr(c.minOrderValue)}</span>}
                    {c.maxDiscount && <span>Max disc: {inr(c.maxDiscount)}</span>}
                    <span>{c.usageCount ?? 0}{c.usageLimit ? `/${c.usageLimit}` : ""} uses</span>
                    {c.expiresAt && <span>Expires {fmtDate(c.expiresAt)}</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(c)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-[#1565C0] rounded-lg text-[12px] font-[600] hover:bg-blue-100 transition-colors">
                      <MdEdit className="text-[13px]" /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[12px] font-[600] hover:bg-red-100 transition-colors">
                      <MdDelete className="text-[13px]" /> Delete
                    </button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-[800] text-[#1A237E]">{editItem ? "Edit Coupon" : "Add Coupon"}</h3>
              <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500"><MdClose className="text-[18px]" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Code *</label>
                <input className={`${inputCls} uppercase`} value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="SUMMER20" disabled={!!editItem} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type *</label>
                  <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Value * {form.type === "percent" ? "(%)" : "(₹)"}</label>
                  <input className={inputCls} type="number" min="0.01" step="0.01" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.type === "percent" ? "20" : "100"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Min Order (₹)</label>
                  <input className={inputCls} type="number" min="0" value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Max Discount (₹)</label>
                  <input className={inputCls} type="number" min="0" value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="Optional cap" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Usage Limit</label>
                  <input className={inputCls} type="number" min="1" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Unlimited" />
                </div>
                <div>
                  <label className={labelCls}>Expires On</label>
                  <input className={inputCls} type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Who Can Use This Coupon</label>
                <select className={inputCls} value={form.restrictionType} onChange={(e) => set("restrictionType", e.target.value)}>
                  <option value="none">Everyone (General)</option>
                  <option value="first_order">First-Time Buyers Only</option>
                  <option value="email">Specific Email Only</option>
                </select>
              </div>
              {form.restrictionType === "email" && (
                <div>
                  <label className={labelCls}>Restricted Email *</label>
                  <input className={inputCls} type="email" value={form.restrictedEmail} onChange={(e) => set("restrictedEmail", e.target.value)} placeholder="customer@gmail.com" />
                </div>
              )}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-[#1565C0] cursor-pointer" />
                <span className="text-[13px] font-[500] text-gray-700">Active</span>
              </label>
              {formError && <p className="text-red-500 text-[12px]">{formError}</p>}
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModal(false)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60">
                  {saving ? "Saving…" : editItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[16px] font-[800] text-gray-800 mb-2">Delete Coupon</h3>
            <p className="text-[13px] text-gray-500 mb-6">Delete coupon <strong>{deleteTarget.code}</strong>? This cannot be undone.</p>
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
