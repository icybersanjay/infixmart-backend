"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import AccountSidebar from "../../../_legacy/components/AccountSidebar";
import AccountMobileNav from "../../../_legacy/components/AccountMobileNav";
import { MyContext } from "../../../_legacy/LegacyProviders";
import { putData, postData, getData } from "../../../_legacy/utils/api";
import { imgUrl } from "../../../_legacy/utils/imageUrl";
import toast from "react-hot-toast";
import useStoreSettings from "../../../_legacy/hooks/useStoreSettings";
import { FaCheck, FaTruck } from "react-icons/fa";
import { BsArrowRight } from "react-icons/bs";
import {
  MdPerson, MdEmail, MdPhone, MdLock, MdEdit, MdSave, MdClose,
  MdShoppingBag, MdFavorite, MdLocationOn, MdAccountBalanceWallet,
  MdVisibility, MdVisibilityOff, MdVerified, MdWorkspacePremium,
} from "react-icons/md";
const QUICK_LINKS = [
  { href: "/my-orders",  icon: MdShoppingBag,          label: "My Orders",      color: "bg-blue-50 text-[#1565C0]" },
  { href: "/my-list",    icon: MdFavorite,              label: "Wishlist",       color: "bg-red-50 text-red-500" },
  { href: "/my-address", icon: MdLocationOn,            label: "Addresses",      color: "bg-green-50 text-green-600" },
  { href: "/referral",   icon: MdAccountBalanceWallet,  label: "Wallet & Refer", color: "bg-purple-50 text-purple-600" },
];


function InputField({ label, icon: Icon, value, onChange, name, type = "text", disabled, readOnly, suffix }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-[700] uppercase tracking-wider text-gray-400">{label}</label>
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3 text-gray-400 text-[18px]" />}
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} ${suffix ? "pr-10" : "pr-4"} py-3 text-[14px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all ${disabled || readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
        />
        {suffix}
      </div>
    </div>
  );
}

// `initialOrders` seeded by parent server component (page.jsx) so the orders
// stat renders hydrated on first paint. Wallet/referral still client-fetched
// because the referral endpoint mutates state on first read (auto-generates
// a code) and we don't want that side effect duplicated server-side.
const MyAccount = ({ initialOrders = null }) => {
  const context = useContext(MyContext);
  const user = context?.userData;
  const { membershipEnabled, membershipPrice } = useStoreSettings();
  const isMember = Boolean(user?.is_member);

  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [formFields, setFormFields] = useState({ name: "", mobile: "" });

  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdSaving,   setPwdSaving]   = useState(false);
  const [showOld,     setShowOld]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdFields, setPwdFields] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  const [stats, setStats] = useState({
    orders: Array.isArray(initialOrders) ? initialOrders.length : 0,
    wallet: 0,
  });

  useEffect(() => {
    if (user) setFormFields({ name: user.name || "", mobile: user.mobile || "" });
  }, [user]);

  useEffect(() => {
    // Skip the orders fetch when the server already seeded us — the count was
    // computed from `initialOrders` above. Wallet still fetched fresh.
    const ordersPromise = initialOrders != null
      ? Promise.resolve({ orders: initialOrders })
      : getData("/api/order/myorders").catch(() => null);
    Promise.all([
      ordersPromise,
      getData("/api/referral").catch(() => null),
    ]).then(([orders, referral]) => {
      setStats({
        orders: Array.isArray(orders?.orders) ? orders.orders.length : 0,
        wallet: referral?.walletBalance || 0,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const avatarSrc   = user?.avatar ? imgUrl(user.avatar) : null;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  const onChangeInput = (e) => {
    const { name, value } = e.target;
    setFormFields((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formFields.name.trim())   return toast.error("Name is required");
    if (!formFields.mobile.trim()) return toast.error("Phone number is required");
    setSaving(true);
    const res = await putData(`/api/user/${user?._id || user?.id}`, formFields);
    setSaving(false);
    if (res?.error !== true) {
      toast.success("Profile updated!");
      setEditing(false);
      if (context?.fetchUserData) context.fetchUserData();
    } else {
      toast.error(res?.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setFormFields({ name: user?.name || "", mobile: user?.mobile || "" });
    setEditing(false);
  };

  const onChangePwd = (e) => {
    const { name, value } = e.target;
    setPwdFields((p) => ({ ...p, [name]: value }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pwdFields.oldPassword) return toast.error("Old password required");
    if (!pwdFields.newPassword) return toast.error("New password required");
    if (pwdFields.newPassword !== pwdFields.confirmPassword) return toast.error("Passwords do not match");
    setPwdSaving(true);
    const res = await postData("/api/user/reset-password", { ...pwdFields, email: user?.email });
    setPwdSaving(false);
    if (res?.error !== true) {
      toast.success("Password changed!");
      setShowPwdForm(false);
      setPwdFields({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      toast.error(res?.message || "Failed to change password");
    }
  };

  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle} className="absolute right-3 text-gray-400 hover:text-gray-600">
      {show ? <MdVisibilityOff className="text-[18px]" /> : <MdVisibility className="text-[18px]" />}
    </button>
  );

  return (
    <section className="w-full py-8 bg-[#F5F7FF] min-h-screen">
      <div className="container">

        {/* Mobile navigation tabs */}
        <AccountMobileNav />

        <div className="flex flex-col md:flex-row gap-6">

          {/* ── Sidebar (desktop only) ── */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <AccountSidebar />
          </div>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">

            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-[#1A237E] to-[#1565C0]" />
              <div className="px-5 sm:px-6 pb-5 relative">
                {/* Avatar */}
                <div className="absolute -top-9 left-5 sm:left-6 w-[72px] h-[72px] rounded-2xl border-4 border-white shadow-md overflow-hidden bg-[#1565C0] flex items-center justify-center">
                  {avatarSrc ? (
                    <NextImage src={avatarSrc} alt="avatar" fill className="object-cover" sizes="72px" />
                  ) : (
                    <span className="text-white text-[20px] font-[800]">{initials}</span>
                  )}
                </div>

                {/* Name / actions */}
                <div className="pt-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[18px] sm:text-[20px] font-[800] text-gray-900 leading-tight">
                        {user?.name || "—"}
                      </h2>
                      {user?.isVerified && (
                        <MdVerified className="text-[#1565C0] text-[17px]" title="Verified" />
                      )}
                    </div>
                    <p className="text-[13px] text-gray-500 mt-0.5">{user?.email}</p>
                    {memberSince && (
                      <p className="text-[11px] text-gray-400 mt-0.5">Member since {memberSince}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setEditing(true); setShowPwdForm(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors self-start sm:self-auto whitespace-nowrap"
                  >
                    <MdEdit className="text-[15px]" /> Edit Profile
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-[#F0F5FF] rounded-xl px-3 py-3 text-center">
                    <p className="text-[20px] sm:text-[22px] font-[900] text-[#1565C0]">{stats.orders}</p>
                    <p className="text-[10px] sm:text-[11px] font-[600] text-gray-500 uppercase tracking-wide">Orders</p>
                  </div>
                  <div className="bg-[#F0FFF4] rounded-xl px-3 py-3 text-center">
                    <p className="text-[16px] sm:text-[20px] font-[900] text-green-600 leading-tight">
                      ₹{Number(stats.wallet).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-[600] text-gray-500 uppercase tracking-wide">Wallet</p>
                  </div>
                  <div className="bg-[#FFF8F0] rounded-xl px-3 py-3 text-center">
                    <p className="text-[15px] sm:text-[18px] font-[900] text-orange-500 leading-tight">
                      {user?.role === "admin" ? "Admin" : "Member"}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-[600] text-gray-500 uppercase tracking-wide">Role</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            {editing && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                <h3 className="text-[15px] font-[800] text-gray-800 mb-5 flex items-center gap-2">
                  <MdPerson className="text-[#1565C0] text-[20px]" /> Edit Profile
                </h3>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Full Name" icon={MdPerson} name="name"
                      value={formFields.name} onChange={onChangeInput} disabled={saving}
                    />
                    <InputField
                      label="Email" icon={MdEmail} name="email"
                      value={user?.email} readOnly
                    />
                  </div>
                  <InputField
                    label="Phone Number" icon={MdPhone} name="mobile"
                    value={formFields.mobile} onChange={onChangeInput} disabled={saving}
                  />
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60"
                    >
                      <MdSave className="text-[16px]" /> {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-[13px] font-[700] rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <MdClose className="text-[16px]" /> Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Personal Info (read-only) */}
            {!editing && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                <h3 className="text-[15px] font-[800] text-gray-800 mb-4 flex items-center gap-2">
                  <MdPerson className="text-[#1565C0] text-[20px]" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: MdPerson, label: "Full Name",     value: user?.name },
                    { icon: MdEmail,  label: "Email Address", value: user?.email },
                    { icon: MdPhone,  label: "Phone Number",  value: user?.mobile || "Not added" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 p-4 bg-[#F8FAFF] rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                        <Icon className="text-[#1565C0] text-[17px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-[700] uppercase tracking-wider text-gray-400">{label}</p>
                        <p className="text-[13px] font-[600] text-gray-700 mt-0.5 truncate">{value || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security / Change Password */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[15px] font-[800] text-gray-800 flex items-center gap-2">
                  <MdLock className="text-[#1565C0] text-[20px]" /> Security
                </h3>
                <button
                  onClick={() => setShowPwdForm((v) => !v)}
                  className="text-[13px] font-[700] text-[#1565C0] hover:underline"
                >
                  {showPwdForm ? "Cancel" : "Change Password"}
                </button>
              </div>
              <p className="text-[12px] text-gray-400 mb-4">Your password is encrypted and stored securely.</p>

              {showPwdForm && (
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 pt-3 border-t border-gray-100">
                  {[
                    { label: "Current Password",  name: "oldPassword",     show: showOld,     toggle: () => setShowOld((v) => !v) },
                    { label: "New Password",       name: "newPassword",     show: showNew,     toggle: () => setShowNew((v) => !v) },
                    { label: "Confirm Password",   name: "confirmPassword", show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
                  ].map(({ label, name, show, toggle }) => (
                    <div key={name} className="flex flex-col gap-1">
                      <label className="text-[11px] font-[700] uppercase tracking-wider text-gray-400">{label}</label>
                      <div className="relative flex items-center">
                        <MdLock className="absolute left-3 text-gray-400 text-[18px]" />
                        <input
                          type={show ? "text" : "password"}
                          name={name}
                          value={pwdFields[name]}
                          onChange={onChangePwd}
                          disabled={pwdSaving}
                          className="w-full pl-10 pr-10 py-3 text-[14px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={toggle}
                          className="absolute right-3 text-gray-400 hover:text-gray-600"
                        >
                          {show ? <MdVisibilityOff className="text-[18px]" /> : <MdVisibility className="text-[18px]" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="self-start flex items-center gap-2 px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60"
                  >
                    <MdSave className="text-[16px]" /> {pwdSaving ? "Saving…" : "Update Password"}
                  </button>
                </form>
              )}
            </div>

            {/* InfixPass membership card */}
            {membershipEnabled && (
              isMember ? (
                <div className="bg-gradient-to-br from-[#06266F] via-[#0D47A1] to-[#1565C0] rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <MdWorkspacePremium className="text-white text-[24px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-[15px] font-[800]">InfixPass Active</p>
                      <span className="bg-amber-400 text-white text-[10px] font-[700] px-2 py-0.5 rounded-full">LIFETIME</span>
                    </div>
                    <p className="text-white/70 text-[12px]">Free delivery + ₹499 minimum on all orders</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-white/60">
                      <span className="flex items-center gap-1"><FaCheck className="text-green-400 text-[9px]" /> ₹499 min order</span>
                      <span className="flex items-center gap-1"><FaTruck className="text-green-400 text-[9px]" /> Free delivery</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
                  <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] px-4 py-3 flex items-center gap-2">
                    <MdWorkspacePremium className="text-amber-400 text-[20px] flex-shrink-0" />
                    <div>
                      <p className="text-white text-[13px] font-[800]">Upgrade to InfixPass</p>
                      <p className="text-white/60 text-[11px]">Lifetime membership — pay once, benefit forever</p>
                    </div>
                    <span className="ml-auto bg-amber-400 text-white text-[12px] font-[800] px-3 py-1 rounded-full whitespace-nowrap">₹{membershipPrice || 49}</span>
                  </div>
                  <div className="bg-blue-50 px-4 py-3">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { icon: <FaCheck className="text-green-500 text-[9px]" />, label: "Shop from ₹499" },
                        { icon: <FaTruck className="text-green-500 text-[9px]" />, label: "Free delivery always" },
                        { icon: <MdWorkspacePremium className="text-amber-500 text-[10px]" />, label: "Priority support" },
                        { icon: <FaCheck className="text-green-500 text-[9px]" />, label: "Lifetime validity" },
                      ].map((b) => (
                        <div key={b.label} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                          {b.icon} {b.label}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={context?.openMembershipModal}
                      className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white py-2.5 rounded-xl font-[700] text-[13px] transition-colors flex items-center justify-center gap-2"
                    >
                      <MdWorkspacePremium className="text-amber-300 text-[16px]" />
                      Get InfixPass — ₹{membershipPrice || 49} only
                      <BsArrowRight />
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <h3 className="text-[15px] font-[800] text-gray-800 mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUICK_LINKS.map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-[#1565C0]/30 hover:shadow-sm transition-all group"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                      <Icon className="text-[22px]" />
                    </div>
                    <span className="text-[12px] font-[600] text-gray-600 text-center">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default MyAccount;
