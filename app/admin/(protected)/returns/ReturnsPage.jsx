"use client";

import { useEffect, useState } from "react";
import adminAxios from "../_lib/adminAxios";
import toast, { Toaster } from "react-hot-toast";
import { FaUndo, FaCheck, FaTimes, FaPrint } from "react-icons/fa";
import Link from "next/link";
import EmptyState from "../../../_legacy/components/EmptyState";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";

const statusConfig = {
  pending:   { label: "Pending",   cls: "bg-yellow-100 text-yellow-700" },
  approved:  { label: "Approved",  cls: "bg-blue-100   text-[#1565C0]"  },
  rejected:  { label: "Rejected",  cls: "bg-red-100    text-red-600"    },
  completed: { label: "Completed", cls: "bg-green-100  text-green-700"  },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`text-[11px] font-[600] px-2.5 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
  );
};

export default function ReturnManagement() {
  const [returns, setReturns]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("");         // status filter
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionId, setActionId]     = useState(null);       // return being actioned
  const [note, setNote]             = useState("");
  const [updating, setUpdating]     = useState(false);

  const fetch = async (p = 1, s = filter) => {
    setLoading(true);
    try {
      const params = `page=${p}&perPage=15${s ? `&status=${s}` : ""}`;
      const res    = await adminAxios.get(`/api/returns?${params}`);
      setReturns(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(1, filter); }, [filter]);

  const handleUpdate = async (id, status) => {
    setUpdating(true);
    try {
      await adminAxios.put(`/api/returns/${id}`, { status, adminNote: note });
      toast.success(`Return marked as ${status}`);
      setActionId(null);
      setNote("");
      fetch(page, filter);
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const ReturnActions = ({ ret }) => (
    ret.status === "pending" ? (
      <div className="flex items-center gap-2">
        <button onClick={() => { setActionId({ id: ret.id, next: "approved" }); setNote(""); }}
          className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-[600] text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
          <FaCheck className="text-[10px]" /> Approve
        </button>
        <button onClick={() => { setActionId({ id: ret.id, next: "rejected" }); setNote(""); }}
          className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-[600] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
          <FaTimes className="text-[10px]" /> Reject
        </button>
      </div>
    ) : ret.status === "approved" ? (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setActionId({ id: ret.id, next: "completed" }); setNote("Refund processed"); }}
          className="px-2.5 py-1 text-[12px] font-[600] text-[#1565C0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          Mark Complete
        </button>
        <Link href={`/return-label/${ret.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-[600] text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <FaPrint className="text-[10px]" /> Label
        </Link>
      </div>
    ) : ret.status === "completed" ? (
      <Link href={`/return-label/${ret.id}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-[600] text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <FaPrint className="text-[10px]" /> Reprint
      </Link>
    ) : (
      <span className="text-[12px] text-gray-300">—</span>
    )
  );

  return (
    <div className="space-y-4">
      <Toaster />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-[800] text-[#1A237E]">
          Return Requests
          {!loading && <span className="ml-2 text-[13px] font-[400] text-gray-400">({returns.length} total)</span>}
        </h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3.5 py-2 text-[13px] text-gray-700 focus:outline-none focus:border-[#1565C0] bg-[#F8FAFF]">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <table className="w-full"><tbody>{Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}</tbody></table>
        ) : returns.length === 0 ? (
          <EmptyState icon={<FaUndo />} title="No return requests" subtitle="Customer return requests will appear here." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px] text-left text-gray-600">
                <thead>
                  <tr className="bg-[#F8FAFF] border-b border-gray-100">
                    {["ID", "Order", "Customer", "Reason", "Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-[#F8FAFF] transition-colors">
                      <td className="px-4 py-3 font-[700] text-[#1A237E]">#{ret.id}</td>
                      <td className="px-4 py-3 text-[#1565C0] font-[500]">#{ret.orderId}</td>
                      <td className="px-4 py-3">
                        <p className="font-[500] text-gray-800">{ret.user?.name || "—"}</p>
                        <p className="text-[11px] text-gray-400">{ret.user?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="line-clamp-2 text-gray-600">{ret.reason}</p>
                        {ret.adminNote && <p className="text-[11px] text-blue-500 mt-0.5 line-clamp-1">Note: {ret.adminNote}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={ret.status} /></td>
                      <td className="px-4 py-3"><ReturnActions ret={ret} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {returns.map((ret) => (
                <div key={ret.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[13px] font-[700] text-[#1A237E]">Return #{ret.id}</span>
                      <span className="ml-2 text-[12px] text-[#1565C0] font-[500]">Order #{ret.orderId}</span>
                    </div>
                    <StatusBadge status={ret.status} />
                  </div>
                  <div>
                    <p className="text-[13px] font-[500] text-gray-800">{ret.user?.name || "—"}</p>
                    {ret.user?.email && <p className="text-[11px] text-gray-400">{ret.user.email}</p>}
                  </div>
                  <p className="text-[12px] text-gray-600 line-clamp-2">{ret.reason}</p>
                  {ret.adminNote && <p className="text-[11px] text-blue-500">Note: {ret.adminNote}</p>}
                  <p className="text-[11px] text-gray-400">
                    {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <ReturnActions ret={ret} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => fetch(p, filter)}
              className={`w-8 h-8 rounded-lg text-[13px] font-[600] border transition-colors ${
                p === page ? "bg-[#1565C0] text-white border-[#1565C0]" : "border-gray-200 text-gray-600 hover:border-[#1565C0]"
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Confirm action modal */}
      {actionId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] p-6">
            <h3 className="text-[15px] font-[700] text-gray-800 mb-1 capitalize">
              {actionId.next === "completed" ? "Mark as Completed" : `${actionId.next} Return #${actionId.id}`}
            </h3>
            <p className="text-[13px] text-gray-500 mb-4">
              {actionId.next === "approved"  && "The customer will be notified that their return is approved."}
              {actionId.next === "rejected"  && "Please provide a reason so the customer knows why."}
              {actionId.next === "completed" && "Confirm that the refund/exchange has been processed."}
            </p>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Admin note (optional)"
              className="w-full border border-gray-200 rounded-lg p-3 text-[13px] resize-none focus:outline-none focus:border-[#1565C0] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdate(actionId.id, actionId.next)}
                disabled={updating}
                className="flex-1 py-2.5 bg-[#1565C0] text-white text-[13px] font-[600] rounded-lg hover:bg-[#0D47A1] disabled:opacity-60"
              >
                {updating ? "Saving…" : "Confirm"}
              </button>
              <button
                onClick={() => setActionId(null)}
                className="px-5 py-2.5 border border-gray-200 text-[13px] rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
