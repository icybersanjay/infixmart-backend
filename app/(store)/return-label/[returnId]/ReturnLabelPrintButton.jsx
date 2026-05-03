"use client";

import { MdPrint } from "react-icons/md";

export default function ReturnLabelPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#1565C0] text-white text-[13px] font-[700] hover:bg-[#0D47A1] transition-colors"
    >
      <MdPrint className="text-[16px]" /> Print / Save PDF
    </button>
  );
}
