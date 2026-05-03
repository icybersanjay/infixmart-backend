"use client";

import { useEffect, useState } from "react";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import { MdAdd, MdClose } from "react-icons/md";

const parseJson = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };

const inputCls  = "h-9 px-3 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
const labelCls  = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";
const selectCls = `${inputCls} cursor-pointer bg-white`;

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, note, children, onSave, saving, saveLabel, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        {icon && <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D47A1] to-[#1565C0] flex items-center justify-center text-base">{icon}</div>}
        <h2 className="text-[15px] font-[800] text-[#1A237E]">{title}</h2>
      </div>
      {children}
      {note && <p className="text-[11px] text-gray-400">{note}</p>}
      <button onClick={onSave} disabled={saving} className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60">
        {saving ? "Saving…" : saveLabel || "Save"}
      </button>
    </div>
  );
}

// ── Milestone live preview ────────────────────────────────────────────────────
function MilestonePreview({ minOrder, timelineMax, milestones }) {
  const max = Number(timelineMax) || 1999;
  const allDots = [
    { amount: Number(minOrder) || 999, label: "Min order", type: "min_order" },
    ...milestones.filter((m) => Number(m.amount) > 0).map((m) => ({ ...m, amount: Number(m.amount) })),
  ].sort((a, b) => a.amount - b.amount).filter((m) => m.amount <= max * 1.05);

  return (
    <div className="mt-2 p-4 bg-[#F5F7FF] rounded-xl border border-[#E0E7FF]">
      <p className="text-[10px] font-[700] text-gray-400 uppercase tracking-wider mb-4">Live Preview</p>
      <div className="relative h-2 bg-blue-100 rounded-full mx-2 mt-6 mb-8">
        {allDots.map((dot, i) => {
          const pct = Math.min((dot.amount / max) * 100, 100);
          return (
            <div key={i} className="absolute top-[-3px]" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
              <div className="w-3.5 h-3.5 rounded-full bg-[#1565C0] border-2 border-[#1565C0]" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-center whitespace-nowrap">
                <div className="text-[9px] font-[700] text-[#1565C0]">₹{dot.amount.toLocaleString("en-IN")}</div>
                <div className="text-[8px] text-gray-500">{dot.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 text-right">Max: ₹{Number(timelineMax).toLocaleString("en-IN")}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ICON_MAP = { cart: "🛒", truck: "🚚", zap: "⚡", headset: "🎧", star: "⭐", gift: "🎁", shield: "🛡" };

export default function StoreSettings() {
  const [loaded, setLoaded] = useState(false);

  const [minOrder,    setMinOrder]    = useState("999");
  const [codOn,       setCodOn]       = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  const [gst,        setGst]        = useState("18");
  const [savingGst,  setSavingGst]  = useState(false);

  const [memEnabled,   setMemEnabled]   = useState(true);
  const [memPrice,     setMemPrice]     = useState("49");
  const [memBenefits,  setMemBenefits]  = useState([
    { icon: "cart",    title: "Shop from just ₹499",         subtitle: "Half the usual ₹999 minimum — always" },
    { icon: "truck",   title: "Free Delivery on Every Order", subtitle: "Zero shipping charges, forever"        },
    { icon: "zap",     title: "Priority Fast Delivery",       subtitle: "Your orders are dispatched first"      },
    { icon: "headset", title: "Dedicated Customer Support",   subtitle: "Skip the queue — member-only care"     },
  ]);
  const [savingMem, setSavingMem] = useState(false);

  const [timelineEnabled, setTimelineEnabled] = useState(true);
  const [timelineMax,     setTimelineMax]     = useState("1999");
  const [milestones,      setMilestones]      = useState([]);
  const [savingTimeline,  setSavingTimeline]  = useState(false);

  useEffect(() => {
    adminAxios.get("/api/admin/settings").then((res) => {
      const s = res.data?.settings || {};
      if (s.min_order_value)              setMinOrder(s.min_order_value);
      if (s.cod_enabled !== undefined)    setCodOn(s.cod_enabled !== "false");
      if (s.gst_percent)                  setGst(s.gst_percent);
      if (s.membership_price)             setMemPrice(s.membership_price);
      if (s.membership_enabled !== undefined) setMemEnabled(s.membership_enabled !== "false");
      if (s.membership_benefits) {
        const p = parseJson(s.membership_benefits, null);
        if (Array.isArray(p) && p.length) setMemBenefits(p);
      }
      if (s.cart_timeline_enabled !== undefined) setTimelineEnabled(s.cart_timeline_enabled !== "false");
      if (s.cart_timeline_max)            setTimelineMax(s.cart_timeline_max);
      if (s.cart_milestones) {
        const p = parseJson(s.cart_milestones, []);
        setMilestones(p.filter((m) => m.type !== "min_order"));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const save = async (pairs, setFlag) => {
    setFlag(true);
    try {
      for (const [key, value] of pairs) await adminAxios.put("/api/admin/settings", { key, value: String(value) });
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save settings."); }
    setFlag(false);
  };

  const addMilestone    = () => setMilestones((p) => [...p, { amount: "", label: "", type: "free_shipping", enabled: true }]);
  const removeMilestone = (i) => setMilestones((p) => p.filter((_, idx) => idx !== i));
  const updateMilestone = (i, k, v) => setMilestones((p) => p.map((m, idx) => idx === i ? { ...m, [k]: v } : m));

  const saveTimeline = async () => {
    setSavingTimeline(true);
    try {
      const data = milestones.filter((m) => Number(m.amount) > 0 && m.label.trim())
        .map((m) => ({ amount: Number(m.amount), label: m.label.trim(), type: m.type, enabled: Boolean(m.enabled) }));
      await Promise.all([
        adminAxios.put("/api/admin/settings", { key: "cart_timeline_enabled", value: String(timelineEnabled) }),
        adminAxios.put("/api/admin/settings", { key: "cart_timeline_max",     value: String(timelineMax)     }),
        adminAxios.put("/api/admin/settings", { key: "cart_milestones",       value: JSON.stringify(data)    }),
      ]);
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save settings."); }
    setSavingTimeline(false);
  };

  if (!loaded) return (
    <div className="flex justify-center pt-16">
      <div className="w-7 h-7 border-[3px] border-[#1565C0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <Toaster position="top-right" />

      {/* Section 1 — Order Rules */}
      <Section title="Order Rules" onSave={() => save([["min_order_value", minOrder], ["cod_enabled", String(codOn)]], setSavingOrder)} saving={savingOrder} saveLabel="Save Order Rules">
        <div>
          <label className={labelCls}>Min Order Value (₹)</label>
          <input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className={`${inputCls} w-36`} />
        </div>
        <div>
          <label className={labelCls}>COD Enabled</label>
          <div className="flex items-center gap-2.5">
            <Toggle checked={codOn} onChange={setCodOn} />
            <span className={`text-[13px] font-[600] ${codOn ? "text-green-600" : "text-gray-400"}`}>{codOn ? "On" : "Off"}</span>
          </div>
        </div>
      </Section>

      {/* Section 2 — GST */}
      <Section title="GST" note="GST is added on top of product price at checkout" onSave={() => save([["gst_percent", gst]], setSavingGst)} saving={savingGst} saveLabel="Save GST">
        <div>
          <label className={labelCls}>GST Percentage (%)</label>
          <input type="number" min={0} max={100} value={gst} onChange={(e) => setGst(e.target.value)} className={`${inputCls} w-36`} />
        </div>
      </Section>

      {/* Section 3 — InfixPass Membership */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D47A1] to-[#1565C0] flex items-center justify-center text-base">⭐</div>
            <h2 className="text-[15px] font-[800] text-[#1A237E]">InfixPass Membership</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-[600] ${memEnabled ? "text-green-600" : "text-gray-400"}`}>{memEnabled ? "Active" : "Disabled"}</span>
            <Toggle checked={memEnabled} onChange={setMemEnabled} />
          </div>
        </div>

        {/* Price */}
        <div>
          <label className={labelCls}>Membership Price (₹) — Lifetime one-time payment</label>
          <div className="flex items-center gap-3">
            <input type="number" min={1} value={memPrice} onChange={(e) => setMemPrice(e.target.value)} className={`${inputCls} w-28`} />
            <span className="text-[12px] text-gray-400">charged once, lifetime access</span>
          </div>
        </div>

        {/* Benefits editor */}
        <div>
          <label className={labelCls}>Membership Benefits <span className="normal-case font-[400] text-gray-300">(shown in the popup card)</span></label>
          <div className="space-y-2.5 mb-3">
            {memBenefits.map((b, i) => (
              <div key={i} className="flex gap-2 items-start p-3 bg-[#F8F9FF] rounded-xl border border-[#E8ECFF]">
                <div className="flex-shrink-0">
                  <div className="text-[9px] text-gray-400 font-[700] uppercase mb-1">Icon</div>
                  <select value={b.icon} onChange={(e) => setMemBenefits((p) => p.map((x, idx) => idx === i ? { ...x, icon: e.target.value } : x))} className={`${selectCls} w-24 text-[12px]`}>
                    <option value="cart">🛒 Cart</option>
                    <option value="truck">🚚 Truck</option>
                    <option value="zap">⚡ Zap</option>
                    <option value="headset">🎧 Support</option>
                    <option value="star">⭐ Star</option>
                    <option value="gift">🎁 Gift</option>
                    <option value="shield">🛡 Shield</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-gray-400 font-[700] uppercase mb-1">Title</div>
                  <input type="text" value={b.title} onChange={(e) => setMemBenefits((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} placeholder="e.g. Free Delivery" className={`${inputCls} w-full text-[12px]`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-gray-400 font-[700] uppercase mb-1">Subtitle</div>
                  <input type="text" value={b.subtitle} onChange={(e) => setMemBenefits((p) => p.map((x, idx) => idx === i ? { ...x, subtitle: e.target.value } : x))} placeholder="Short description" className={`${inputCls} w-full text-[12px]`} />
                </div>
                <div className="flex-shrink-0 pt-5">
                  <button onClick={() => setMemBenefits((p) => p.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                    <MdClose className="text-[14px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {memBenefits.length < 6 && (
            <button onClick={() => setMemBenefits((p) => [...p, { icon: "star", title: "", subtitle: "" }])} className="flex items-center gap-1.5 px-3 py-2 border border-[#1565C0] text-[#1565C0] text-[12px] font-[600] rounded-xl hover:bg-[#F0F5FF] transition-colors">
              <MdAdd className="text-[14px]" /> Add Benefit
            </button>
          )}
        </div>

        {/* Live card preview */}
        <div>
          <label className={labelCls}>Live Card Preview <span className="normal-case font-[400] text-gray-300">(how the popup looks to customers)</span></label>
          <div className="max-w-xs border border-[#E0E7FF] rounded-2xl overflow-hidden shadow-md">
            <div className="bg-gradient-to-br from-[#06266F] via-[#0D47A1] to-[#1565C0] p-6 text-center">
              <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center text-[22px] rotate-6 shadow-lg mx-auto mb-2.5">⭐</div>
              <div className="text-white text-[20px] font-[900] tracking-tight">InfixPass</div>
              <div className="text-white/55 text-[11px] mt-0.5">Lifetime Membership</div>
              <div className="inline-flex items-baseline gap-1 bg-amber-400 text-white px-4 py-1.5 rounded-full mt-3 shadow">
                <span className="text-[13px] font-[600]">₹</span>
                <span className="text-[28px] font-[900] leading-none">{memPrice || 49}</span>
                <span className="text-[11px] opacity-85 ml-0.5">one-time</span>
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="text-[10px] text-gray-400 font-[700] uppercase tracking-wider text-center mb-2.5">What you unlock</div>
              <div className="space-y-1.5">
                {memBenefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[#F8F9FF] rounded-xl border border-[#E8ECFF]">
                    <div className="w-7 h-7 rounded-lg bg-[#1565C0] flex items-center justify-center text-[12px] flex-shrink-0">{ICON_MAP[b.icon] || "✦"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-[700] text-gray-800 leading-tight">{b.title || "—"}</div>
                      <div className="text-[10px] text-gray-400 leading-tight">{b.subtitle || "—"}</div>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[9px] text-white flex-shrink-0">✓</div>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 bg-[#1565C0] rounded-xl p-2.5 text-center text-white text-[12px] font-[700]">
                Unlock InfixPass — ₹{memPrice || 49} →
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            const validBenefits = memBenefits.filter((b) => b.title.trim());
            save([["membership_enabled", String(memEnabled)], ["membership_price", String(memPrice)], ["membership_benefits", JSON.stringify(validBenefits)]], setSavingMem);
          }}
          disabled={savingMem}
          className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60"
        >
          {savingMem ? "Saving…" : "Save InfixPass Settings"}
        </button>
      </div>

      {/* Section 4 — Cart Progress Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-[15px] font-[800] text-[#1A237E]">Cart Progress Timeline</h2>

        <div>
          <label className={labelCls}>Timeline Enabled</label>
          <div className="flex items-center gap-2.5">
            <Toggle checked={timelineEnabled} onChange={setTimelineEnabled} />
            <span className={`text-[13px] font-[600] ${timelineEnabled ? "text-green-600" : "text-gray-400"}`}>{timelineEnabled ? "On" : "Off"}</span>
          </div>
        </div>

        <div>
          <label className={labelCls}>Timeline Max Value (₹)</label>
          <input type="number" value={timelineMax} onChange={(e) => setTimelineMax(e.target.value)} className={`${inputCls} w-36`} />
          <p className="text-[11px] text-gray-400 mt-1">The ₹ value at which the progress bar reaches 100%</p>
        </div>

        <div>
          <label className={labelCls}>Reward Milestones</label>
          <p className="text-[11px] text-gray-400 mb-3">The minimum order milestone is added automatically from your Min Order Value setting.</p>

          {/* Read-only min_order row */}
          <div className="flex gap-2 items-center px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 mb-2.5 opacity-70">
            <span className="text-[13px] text-gray-500">₹</span>
            <span className="w-20 text-[13px] font-[700] text-gray-700">{minOrder || 999}</span>
            <span className="flex-1 text-[13px] text-gray-500">Order unlocked</span>
            <span className="text-[11px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-lg">min_order · always on</span>
          </div>

          <div className="space-y-2 mb-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2 items-center flex-wrap">
                <span className="text-[13px] text-gray-500">₹</span>
                <input type="number" value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)} placeholder="Amount" className={`${inputCls} w-24`} />
                <input type="text"   value={m.label}  onChange={(e) => updateMilestone(i, "label",  e.target.value)} placeholder="Label e.g. Free Shipping" className={`${inputCls} flex-1 min-w-[140px]`} />
                <select value={m.type} onChange={(e) => updateMilestone(i, "type", e.target.value)} className={`${selectCls} w-36`}>
                  <option value="free_shipping">Free Shipping</option>
                  <option value="free_gift">Free Gift</option>
                  <option value="discount">Discount</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <Toggle checked={!!m.enabled} onChange={(v) => updateMilestone(i, "enabled", v)} />
                  <span className={`text-[11px] font-[600] ${m.enabled ? "text-green-600" : "text-gray-400"}`}>{m.enabled ? "On" : "Off"}</span>
                </div>
                <button onClick={() => removeMilestone(i)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                  <MdClose className="text-[14px]" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addMilestone} className="flex items-center gap-1.5 px-3 py-2 border border-[#1565C0] text-[#1565C0] text-[12px] font-[600] rounded-xl hover:bg-[#F0F5FF] transition-colors">
            <MdAdd className="text-[14px]" /> Add Milestone
          </button>
        </div>

        <MilestonePreview minOrder={minOrder} timelineMax={timelineMax} milestones={milestones} />

        <button onClick={saveTimeline} disabled={savingTimeline} className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60">
          {savingTimeline ? "Saving…" : "Save Timeline Settings"}
        </button>
      </div>
    </div>
  );
}
