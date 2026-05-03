"use client";

import React, { useContext, useEffect, useState } from "react";
import AccountSidebar from "../../../_legacy/components/AccountSidebar";
import AccountMobileNav from "../../../_legacy/components/AccountMobileNav";
import { MyContext } from "../../../_legacy/LegacyProviders";
import { postData, putData, getData, deleteData } from "../../../_legacy/utils/api";
import {
  MdAdd, MdClose, MdEdit, MdDelete, MdLocationOn, MdPhone,
  MdHome, MdCheckCircle, MdSave,
} from "react-icons/md";

const BLANK = {
  name: "", mobile: "", pincode: "", flatHouse: "", areaStreet: "",
  landmark: "", townCity: "", state: "", country: "India", isDefault: false,
};

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

function Spinner() {
  return <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-[700] uppercase tracking-wider text-gray-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 text-[14px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";

function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[16px] font-[800] text-gray-800 mb-2">{title}</h3>
        <p className="text-[13px] text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white text-[13px] font-[600] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ addr, onClose }) {
  if (!addr) return null;
  const rows = [
    ["Name",        addr.name],
    ["Mobile",      addr.mobile],
    ["Flat/House",  addr.flatHouse],
    ["Street/Area", addr.areaStreet],
    ["Landmark",    addr.landmark || "N/A"],
    ["City",        addr.townCity],
    ["State",       addr.state],
    ["Pincode",     addr.pincode],
    ["Country",     addr.country],
  ];
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-[800] text-gray-800">Address Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <MdClose className="text-[18px]" />
          </button>
        </div>
        {addr.isDefault && (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[11px] font-[700] px-2.5 py-1 rounded-full mb-3">
            <MdCheckCircle className="text-[13px]" /> Default Address
          </span>
        )}
        <div className="flex flex-col gap-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="text-[12px] font-[700] text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-[13px] text-gray-700 flex-1">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// `initialAddresses` seeded by parent server component (page.jsx) for first-
// paint hydration. Mutations (add/edit/delete) still call fetchAddresses() to
// refresh from the API — the seed is only consumed on initial render.
const MyAddress = ({ initialAddresses = null }) => {
  const [addressList,   setAddressList]   = useState(initialAddresses || []);
  const [saving,        setSaving]        = useState(false);
  const [formOpen,      setFormOpen]      = useState(false);
  const [editId,        setEditId]        = useState(null);
  const [fields,        setFields]        = useState(BLANK);

  const [viewAddr,      setViewAddr]      = useState(null);
  const [deleteId,      setDeleteId]      = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const context = useContext(MyContext);

  useEffect(() => {
    // Skip the initial fetch if the server already seeded us. Subsequent
    // re-renders triggered by isLogin still re-fetch (e.g. user just logged in
    // on this tab and the seed was null).
    if (initialAddresses != null) return;
    if (context?.isLogin) fetchAddresses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.isLogin]);

  const fetchAddresses = () => {
    getData("/api/user/addresses").then((res) => {
      if (res?.error === false) setAddressList(res.data);
    });
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFields((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const openAdd = () => {
    setEditId(null);
    setFields(BLANK);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (addr) => {
    setEditId(addr.id);
    setFields({
      name: addr.name, mobile: addr.mobile, pincode: addr.pincode,
      flatHouse: addr.flatHouse, areaStreet: addr.areaStreet,
      landmark: addr.landmark || "", townCity: addr.townCity,
      state: addr.state, country: addr.country, isDefault: addr.isDefault || false,
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setFields(BLANK);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ["name","mobile","pincode","flatHouse","areaStreet","townCity","state","country"];
    for (const f of required) {
      if (!fields[f]) {
        context.openAlertBox("error", `Please fill in: ${f}`);
        return;
      }
    }
    setSaving(true);
    const fn = editId
      ? putData(`/api/user/addresses/${editId}`, fields)
      : postData("/api/user/addresses", fields);
    const res = await fn;
    setSaving(false);
    if (res?.error !== true) {
      context.openAlertBox("success", editId ? "Address updated!" : "Address added!");
      closeForm();
      fetchAddresses();
    } else {
      context.openAlertBox("error", res?.message || "Failed to save address");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const res = await deleteData(`/api/user/addresses/${deleteId}`);
    setDeleting(false);
    if (res?.error === false) {
      context.openAlertBox("success", "Address deleted");
      setDeleteId(null);
      fetchAddresses();
    } else {
      context.openAlertBox("error", res?.message || "Failed to delete");
    }
  };

  return (
    <section className="w-full py-8 bg-[#F5F7FF] min-h-screen">
      <div className="container">
        <AccountMobileNav />
        <div className="flex flex-col md:flex-row gap-6">

          {/* Sidebar */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <AccountSidebar />
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-[800] text-gray-800">My Addresses</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {addressList.length} address{addressList.length !== 1 ? "es" : ""} saved
                  </p>
                </div>
                <button
                  onClick={formOpen ? closeForm : openAdd}
                  className={`flex items-center gap-2 px-4 py-2 text-[13px] font-[700] rounded-xl transition-colors ${
                    formOpen
                      ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      : "bg-[#1565C0] text-white hover:bg-[#1251A3]"
                  }`}
                >
                  {formOpen ? <><MdClose className="text-[16px]" /> Cancel</> : <><MdAdd className="text-[16px]" /> Add Address</>}
                </button>
              </div>
            </div>

            {/* Address Form */}
            {formOpen && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                <h3 className="text-[15px] font-[800] text-gray-800 mb-5 flex items-center gap-2">
                  <MdLocationOn className="text-[#1565C0] text-[20px]" />
                  {editId ? "Edit Address" : "New Address"}
                </h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" required>
                      <input name="name" autoComplete="name" value={fields.name} onChange={onChange} className={inputCls} placeholder="First and last name" />
                    </Field>
                    <Field label="Mobile Number" required>
                      <input name="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={fields.mobile} onChange={onChange} className={inputCls} placeholder="10-digit mobile" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Pincode" required>
                      <input name="pincode" inputMode="numeric" autoComplete="postal-code" value={fields.pincode} onChange={onChange} className={inputCls} placeholder="6-digit pincode" maxLength={6} />
                    </Field>
                    <Field label="Country" required>
                      <select name="country" autoComplete="country-name" value={fields.country} onChange={onChange} className={inputCls}>
                        <option value="India">India</option>
                        <option value="USA">USA</option>
                        <option value="UK">UK</option>
                        <option value="Canada">Canada</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Flat / House No. / Building" required>
                    <input name="flatHouse" autoComplete="address-line1" value={fields.flatHouse} onChange={onChange} className={inputCls} placeholder="Flat no., building name…" />
                  </Field>

                  <Field label="Area / Street / Sector" required>
                    <input name="areaStreet" autoComplete="address-line2" value={fields.areaStreet} onChange={onChange} className={inputCls} placeholder="Area, street, sector…" />
                  </Field>

                  <Field label="Landmark">
                    <input name="landmark" autoComplete="address-line3" value={fields.landmark} onChange={onChange} className={inputCls} placeholder="Near temple, hospital… (optional)" />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Town / City" required>
                      <input name="townCity" autoComplete="address-level2" value={fields.townCity} onChange={onChange} className={inputCls} placeholder="City name" />
                    </Field>
                    <Field label="State" required>
                      <select name="state" autoComplete="address-level1" value={fields.state} onChange={onChange} className={inputCls}>
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={fields.isDefault}
                      onChange={onChange}
                      className="w-4 h-4 accent-[#1565C0] cursor-pointer"
                    />
                    <span className="text-[13px] font-[500] text-gray-700">Set as default address</span>
                  </label>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60"
                    >
                      {saving ? <Spinner /> : <MdSave className="text-[16px]" />}
                      {saving ? "Saving…" : "Save Address"}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 text-gray-600 text-[13px] font-[700] rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <MdClose className="text-[16px]" /> Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Address List */}
            {addressList.length === 0 && !formOpen ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <MdLocationOn className="text-gray-300 text-[48px] mx-auto mb-3" />
                <p className="text-[15px] font-[600] text-gray-500">No addresses saved yet</p>
                <p className="text-[13px] text-gray-400 mt-1">Add an address for faster checkout</p>
                <button
                  onClick={openAdd}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors"
                >
                  <MdAdd /> Add Your First Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {addressList.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col justify-between gap-3 ${
                      addr.isDefault ? "border-[#1565C0]/30 bg-[#F0F7FF]" : "border-gray-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[15px] font-[700] text-gray-800">{addr.name}</h3>
                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-[700] px-2 py-0.5 rounded-full">
                              <MdCheckCircle className="text-[11px]" /> Default
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mb-1.5">
                        <MdPhone className="text-[14px] text-gray-400 flex-shrink-0" />
                        {addr.mobile}
                      </div>
                      <div className="flex items-start gap-1.5 text-[13px] text-gray-600 leading-relaxed">
                        <MdHome className="text-[14px] text-gray-400 flex-shrink-0 mt-0.5" />
                        <span>
                          {addr.flatHouse}, {addr.areaStreet}
                          {addr.landmark ? `, ${addr.landmark}` : ""}
                          <br />
                          {addr.townCity}, {addr.state} — {addr.pincode}
                          <br />
                          {addr.country}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setViewAddr(addr)}
                        className="flex-1 py-2 text-[12px] font-[600] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEdit(addr)}
                        className="flex-1 py-2 text-[12px] font-[600] text-[#1565C0] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <MdEdit className="text-[13px]" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(addr.id)}
                        className="flex-1 py-2 text-[12px] font-[600] text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <MdDelete className="text-[13px]" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewModal addr={viewAddr} onClose={() => setViewAddr(null)} />
      <ConfirmModal
        open={!!deleteId}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </section>
  );
};

export default MyAddress;
