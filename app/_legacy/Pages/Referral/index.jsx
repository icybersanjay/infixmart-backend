"use client";
import React, { useEffect, useState } from "react";
import { getData, postData, putData } from "../../utils/api";
import toast from "react-hot-toast";
import AccountSidebar from "../../components/AccountSidebar";
import AccountMobileNav from "../../components/AccountMobileNav";

const REFERRAL_REWARD = 50;
const PRESET_AMOUNTS = [100, 250, 500, 1000];

function AddMoneyModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) return toast.error("Minimum ₹10");
    if (amt > 50000) return toast.error("Maximum ₹50,000");
    setLoading(true);
    const ready = await loadRazorpay();
    if (!ready) { toast.error("Payment gateway failed to load"); setLoading(false); return; }
    try {
      const res = await postData("/api/wallet", { amount: amt });
      if (res.error || !res.orderId) { toast.error(res.message || "Failed to create order"); setLoading(false); return; }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amt * 100,
        currency: "INR",
        name: "InfixMart",
        description: "Wallet Top-up",
        order_id: res.orderId,
        handler: async (response) => {
          const verify = await putData("/api/wallet", response);
          if (verify.success) {
            toast.success(`₹${amt} added to wallet!`);
            onSuccess(verify.walletBalance);
            onClose();
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: {},
        theme: { color: "#1565C0" },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl z-10">
        <h3 className="text-[16px] font-[800] text-gray-900 mb-1">Add Money to Wallet</h3>
        <p className="text-[12px] text-gray-400 mb-5">Credited instantly. Use at checkout.</p>

        {/* Preset amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              className={`py-2 rounded-xl text-[13px] font-[700] border transition-all ${
                Number(amount) === a
                  ? "bg-[#1565C0] text-white border-[#1565C0]"
                  : "bg-[#F5F7FF] text-gray-700 border-transparent hover:border-[#1565C0]"
              }`}
            >
              ₹{a}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-[700]">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full pl-8 pr-4 py-3 bg-[#F8FAFF] border border-gray-200 rounded-xl text-[15px] font-[700] text-gray-800 outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10"
          />
        </div>

        <button
          onClick={handlePay}
          disabled={loading || !amount}
          className="w-full py-3 bg-[#1565C0] text-white font-[800] text-[15px] rounded-xl hover:bg-[#1251A3] disabled:opacity-60 transition-colors"
        >
          {loading ? "Opening payment…" : `Pay ₹${amount || "0"}`}
        </button>
      </div>
    </div>
  );
}

const Referral = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);

  useEffect(() => {
    getData("/api/referral")
      .then((res) => { if (res && !res.error) setData(res); })
      .finally(() => setLoading(false));
  }, []);

  const referralLink = data?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${data.referralCode}`
    : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!loading && !data) {
    return (
      <section className="py-20 text-center bg-[#F5F7FF] min-h-screen">
        <p className="text-gray-500 text-[15px]">Please log in to view your referral dashboard.</p>
      </section>
    );
  }

  return (
    <section className="w-full py-8 bg-[#F5F7FF] min-h-screen">
      <div className="container">
        <AccountMobileNav />
        <div className="flex flex-col md:flex-row gap-6">
          <div className="hidden md:block w-64 flex-shrink-0">
            <AccountSidebar />
          </div>
          <div className="flex-1 min-w-0">
        <h1 className="text-[24px] font-[800] text-gray-900 mb-2">Refer & Earn</h1>
        <p className="text-[14px] text-gray-500 mb-6">
          Share your link — your friend gets{" "}
          <span className="font-[700] text-[#1565C0]">₹{REFERRAL_REWARD} off</span> on their first order,
          and you earn{" "}
          <span className="font-[700] text-[#1565C0]">₹{REFERRAL_REWARD} wallet credit</span> once they purchase.
        </p>

        {/* Wallet balance */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-[700] uppercase tracking-widest text-gray-400 mb-1">Wallet Balance</p>
              <p className="text-[36px] font-[900] text-[#1565C0] leading-none">
                ₹{loading ? "—" : Number(data?.walletBalance || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[12px] text-gray-400 mt-1">Automatically applied at checkout</p>
            </div>
            <button
              onClick={() => setShowAddMoney(true)}
              className="flex-shrink-0 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors whitespace-nowrap"
            >
              + Add Money
            </button>
          </div>
        </div>

        {showAddMoney && (
          <AddMoneyModal
            onClose={() => setShowAddMoney(false)}
            onSuccess={(newBalance) => setData((d) => ({ ...d, walletBalance: newBalance }))}
          />
        )}

        {/* Referral link */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-[13px] font-[700] text-gray-700 mb-3">Your Referral Link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={loading ? "Loading…" : referralLink}
              className="flex-1 bg-[#F5F7FF] border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          {data?.referralCode && (
            <p className="text-[12px] text-gray-400 mt-2">
              Code: <span className="font-[700] text-gray-600">{data.referralCode}</span>
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-[13px] font-[700] text-gray-700 mb-4">How it works</p>
          <div className="flex flex-col gap-3">
            {[
              { step: "1", text: "Share your referral link with friends" },
              { step: "2", text: `Friend registers & gets ₹${REFERRAL_REWARD} off instantly` },
              { step: "3", text: "Friend places their first order" },
              { step: "4", text: `You earn ₹${REFERRAL_REWARD} wallet credit` },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#EEF4FF] text-[#1565C0] text-[12px] font-[800] flex items-center justify-center flex-shrink-0">
                  {step}
                </span>
                <span className="text-[13px] text-gray-600">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Referral history */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-[13px] font-[700] text-gray-700 mb-4">
            Referral History
            {!loading && data?.referrals?.length > 0 && (
              <span className="ml-2 text-[11px] font-[600] text-[#1565C0]">
                ({data.referrals.filter((r) => r.credited).length} credited, ₹{data.totalEarned || 0} earned)
              </span>
            )}
          </p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : !data?.referrals?.length ? (
            <p className="text-[13px] text-gray-400 text-center py-4">No referrals yet. Start sharing!</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[13px] font-[600] text-gray-700">{r.refereeName}</p>
                    <p className="text-[11px] text-gray-400">{r.refereeEmail}</p>
                  </div>
                  <span
                    className={`text-[11px] font-[700] px-2.5 py-1 rounded-full ${
                      r.credited
                        ? "bg-[#E8F5E9] text-[#2E7D32]"
                        : "bg-[#FFF3E0] text-[#E65100]"
                    }`}
                  >
                    {r.credited ? `+₹${REFERRAL_REWARD} Credited` : "Pending first order"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Referral;
