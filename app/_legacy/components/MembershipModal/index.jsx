"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import Spinner from "../ui/Spinner";
import { IoClose } from "react-icons/io5";
import { FaCheck, FaTruck, FaHeadset } from "react-icons/fa";
import { MdWorkspacePremium } from "react-icons/md";
import { BsArrowRight, BsLightningChargeFill } from "react-icons/bs";
import { RiShoppingBag3Line } from "react-icons/ri";
import { FaStar, FaGift, FaShieldAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { postData } from "../../utils/api";
import { useSettings } from "../../context/SettingsContext";

const ICON_MAP = {
  cart:    { component: RiShoppingBag3Line, color: "bg-[#1565C0]" },
  truck:   { component: FaTruck,            color: "bg-[#00A651]" },
  zap:     { component: BsLightningChargeFill, color: "bg-amber-500" },
  headset: { component: FaHeadset,          color: "bg-purple-600" },
  star:    { component: FaStar,             color: "bg-yellow-500" },
  gift:    { component: FaGift,             color: "bg-pink-500"   },
  shield:  { component: FaShieldAlt,        color: "bg-teal-500"   },
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const MembershipModal = ({ open, onClose, onSuccess, userEmail, userName }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { membershipPrice, membershipBenefits } = useSettings();

  const price = membershipPrice || 49;
  const benefits = Array.isArray(membershipBenefits) && membershipBenefits.length
    ? membershipBenefits
    : [{ icon: "cart", title: "Shop from just ₹499", subtitle: "Half the usual ₹999 minimum" }];

  const handlePay = async () => {
    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Payment gateway failed to load. Please try again.");
        setLoading(false);
        return;
      }

      const orderData = await postData("/api/membership/create-order", {});
      if (!orderData || orderData.error) {
        toast.error(orderData?.msg || "Could not initiate payment. Please try again.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "InfixMart",
        description: "InfixPass — Lifetime Membership",
        prefill: { name: userName || "", email: userEmail || "" },
        theme: { color: "#1565C0" },
        handler: async (response) => {
          try {
            const verifyRes = await postData("/api/membership/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              membershipToken: orderData.membershipToken,
            });
            if (verifyRes && !verifyRes.error) {
              setSuccess(true);
              if (onSuccess) onSuccess();
            } else {
              toast.error("Payment verification failed. Contact support.");
            }
          } catch {
            toast.error("Verification error. Contact support with your payment ID.");
          }
          setLoading(false);
        },
        modal: { ondismiss: () => setLoading(false) },
      });

      rzp.open();
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setSuccess(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="xs" closeOnBackdrop={!loading} closeOnEscape={!loading}>
      <div>
        {success ? (
          /* ── SUCCESS STATE ── */
          <div className="px-8 py-10 text-center">
            {/* Animated checkmark ring */}
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                  <FaCheck className="text-[26px] text-white" />
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-3">
              <MdWorkspacePremium className="text-amber-500 text-[14px]" />
              <span className="text-[12px] font-[700] text-amber-700 uppercase tracking-wider">InfixPass Active</span>
            </div>

            <h3 className="text-[22px] font-[800] text-gray-800 mb-1">You&apos;re In!</h3>
            <p className="text-[13px] text-gray-500 mb-6">
              Welcome to InfixPass. All benefits are live on your account.
            </p>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-6 text-left space-y-2.5">
              {benefits.map((b) => {
                const mapped = ICON_MAP[b.icon] || ICON_MAP.star;
                const Icon = mapped.component;
                return (
                  <div key={b.title} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${mapped.color}`}>
                      <Icon className="text-[11px] text-white" />
                    </div>
                    <span className="text-[13px] font-[500] text-gray-700">{b.title}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-[#1565C0] text-white py-3.5 rounded-xl font-[700] text-[15px] hover:bg-[#0D47A1] transition-colors flex items-center justify-center gap-2"
            >
              Start Shopping <BsArrowRight />
            </button>
          </div>
        ) : (
          /* ── PURCHASE STATE ── */
          <div>
            {/* ── Header gradient ── */}
            <div className="relative bg-gradient-to-br from-[#06266F] via-[#0D47A1] to-[#1565C0] px-6 pt-8 pb-7 text-center overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 text-white/50 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors z-10"
              >
                <IoClose className="text-[20px]" />
              </button>

              {/* Icon */}
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center shadow-xl rotate-6 mx-auto">
                  <MdWorkspacePremium className="text-[32px] text-white -rotate-6" />
                </div>
              </div>

              <h2 className="text-white text-[26px] font-[900] tracking-tight leading-none">
                InfixPass
              </h2>
              <p className="text-white/60 text-[13px] mt-1 font-[400]">Lifetime Membership</p>

              {/* Price pill */}
              <div className="inline-flex items-baseline gap-1 bg-amber-400 text-white px-5 py-2 rounded-full mt-4 shadow-lg">
                <span className="text-[15px] font-[600]">₹</span>
                <span className="text-[36px] font-[900] leading-none">{price}</span>
                <span className="text-[12px] font-[400] opacity-80 ml-1">one-time only</span>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-5 py-5">
              <p className="text-[11px] text-gray-400 text-center mb-4 font-[600] uppercase tracking-widest">
                Everything included
              </p>

              {/* Benefits list */}
              <div className="space-y-2.5 mb-5">
                {benefits.map((b) => {
                  const mapped = ICON_MAP[b.icon] || ICON_MAP.star;
                  const Icon = mapped.component;
                  return (
                    <div
                      key={b.title}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${mapped.color}`}>
                        <Icon className="text-[17px] text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-[700] text-gray-800 leading-4">{b.title}</p>
                        <p className="text-[11px] text-gray-400 leading-4 mt-0.5">{b.subtitle}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FaCheck className="text-[8px] text-white" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA Button */}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-[#1565C0] hover:bg-[#0D47A1] active:bg-[#06266F] text-white py-4 rounded-xl font-[700] text-[15px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <Spinner size={20} className="text-white" />
                ) : (
                  <>
                    <span>Unlock InfixPass — ₹{price}</span>
                    <BsArrowRight className="text-[16px]" />
                  </>
                )}
              </button>

              {/* Fine print */}
              <p className="text-center text-[11px] text-gray-400 mt-3 leading-[1.6]">
                Secured by Razorpay &nbsp;·&nbsp; Lifetime validity &nbsp;·&nbsp; ₹{price} one-time
                <br />
                Membership revokes after 1 delivery rejection
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MembershipModal;
