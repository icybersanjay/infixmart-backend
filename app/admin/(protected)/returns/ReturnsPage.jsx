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

  return (
    <div className="p-6">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] font-[700] text-gray-800">Return Requests</h1>
          <p className="text-[13px] text-gray-500">Manage customer return and refund requests</p>
        </div>

        {/* Status filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:outline-none focus:border-[#1565C0]"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}</tbody>
          </table>
        ) : returns.length === 0 ? (
          <EmptyState icon={<FaUndo />} title="No return requests" subtitle="Customer return requests will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px] text-left text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-[600] text-gray-700">#{ret.id}</td>
                    <td className="px-4 py-3 text-[#1565C0] font-[500]">#{ret.orderId}</td>
                    <td className="px-4 py-3">
                      <p className="font-[500] text-gray-800">{ret.user?.name || "—"}</p>
                      <p className="text-[11px] text-gray-400">{ret.user?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="line-clamp-2 text-gray-600">{ret.reason}</p>
                      {ret.adminNote && (
                        <p className="text-[11px] text-blue-500 mt-0.5 line-clamp-1">Note: {ret.adminNote}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ret.status} /></td>
                    <td className="px-4 py-3">
                      {ret.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setActionId({ id: ret.id, next: "approved" }); setNote(""); }}
                            className="flex items-center gap-1 text-[12px] font-[600] text-green-600 hover:text-green-700 transition-colors"
                          >
                            <FaCheck className="text-[10px]" /> Approve
                          </button>
                          <button
                            onClick={() => { setActionId({ id: ret.id, next: "rejected" }); setNote(""); }}
                            className="flex items-center gap-1 text-[12px] font-[600] text-red-500 hover:text-red-600 transition-colors"
                          >
                            <FaTimes className="text-[10px]" /> Reject
                          </button>
                        </div>
                      ) : ret.status === "approved" ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setActionId({ id: ret.id, next: "completed" }); setNote("Refund processed"); }}
                            className="text-[12px] font-[600] text-[#1565C0] hover:underline"
                          >
                            Mark Complete
                          </button>
                          <Link
                            href={`/return-label/${ret.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[12px] font-[600] text-gray-500 hover:text-[#1565C0] transition-colors"
                          >
                            <FaPrint className="text-[10px]" /> Label
                          </Link>
                        </div>
                      ) : ret.status === "completed" ? (
                        <Link
                          href={`/return-label/${ret.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[12px] font-[600] text-gray-500 hover:text-[#1565C0] transition-colors"
                        >
                          <FaPrint className="text-[10px]" /> Reprint Label
                        </Link>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetch(p, filter)}
              className={`w-8 h-8 rounded-full text-[13px] font-[600] border transition-colors ${
                p === page ? "bg-[#1565C0] text-white border-[#1565C0]" : "border-gray-200 text-gray-600 hover:border-[#1565C0]"
              }`}
            >
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
