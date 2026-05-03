/**
 * Shared admin form styling tokens.
 *
 * Every admin page used to declare its own `inputCls`, `labelCls`, etc. as a
 * local const — the strings drifted slightly and re-skinning the admin meant
 * touching 6+ files. Import these instead.
 *
 * Usage:
 *   import { inputCls, labelCls, selectCls } from "../utils/formStyles";
 *   <label className={labelCls}>Name</label>
 *   <input className={inputCls} ... />
 */

const baseField =
  "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] " +
  "border border-gray-200 rounded-xl outline-none " +
  "focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 " +
  "transition-all";

export const inputCls = baseField;

export const selectCls = baseField + " appearance-none pr-9 cursor-pointer";

export const textareaCls = baseField + " min-h-[96px] resize-y leading-relaxed";

export const labelCls =
  "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

export const helpCls = "text-[11px] text-gray-400 mt-1.5";

export const errorCls = "text-[12px] font-[500] text-[#E53935] mt-1.5";

export const checkboxCls =
  "w-4 h-4 accent-[#1565C0] cursor-pointer rounded";

export const fieldsetCls =
  "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6";

export const fieldsetTitleCls =
  "text-[14px] font-[700] text-gray-800 mb-4 flex items-center gap-2";
