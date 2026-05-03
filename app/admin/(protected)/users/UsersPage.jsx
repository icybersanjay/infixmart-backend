"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MdSearch, MdExpandMore, MdExpandLess, MdPeople } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import EmptyState from "../../../_legacy/components/EmptyState";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const SEGMENT_CFG = {
  new:        { bg: "bg-blue-100",   text: "text-blue-700",  label: "New" },
  returning:  { bg: "bg-green-100",  text: "text-green-700", label: "Returning" },
  high_value: { bg: "bg-amber-100",  text: "text-amber-700", label: "High Value" },
  inactive:   { bg: "bg-gray-100",   text: "text-gray-600",  label: "Inactive" },
};

function SegmentBadge({ segment }) {
  const cfg = SEGMENT_CFG[segment];
  if (!cfg) return null;
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-[600] ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex gap-1.5 justify-center py-4 flex-wrap px-4">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-[13px] font-[500] border transition-colors ${
            p === page ? "bg-[#1565C0] text-white border-[#1565C0]" : "bg-white text-gray-700 border-gray-200 hover:border-[#1565C0]"
          }`}>
          {p}
        </button>
      ))}
    </div>
  );
}

function UserStatsRow({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAxios.get(`/api/admin/users/${user.id}/stats`)
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, [user.id]);

  const cols = [
    { label: "Email",       val: user.email },
    { label: "Mobile",      val: user.mobile || "—" },
    { label: "Joined",      val: fmtDate(user.createdAt) },
    { label: "Last Login",  val: fmtDate(user.last_login_date) },
    { label: "Total Orders",val: stats ? stats.orderCount : "…" },
    { label: "Total Spent", val: stats ? inr(stats.totalSpent) : "…" },
  ];

  return (
    <tr>
      <td colSpan={9} className="bg-blue-50/60 border-b-2 border-gray-200 px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cols.map(({ label, val }) => (
            <div key={label}>
              <p className="text-[10px] font-[700] uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
              <p className="text-[13px] font-[600] text-[#1A237E] break-all">{val}</p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

function SuspendDialog({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-[16px] font-[700] text-[#1A237E] mb-2">Suspend User</h3>
        <p className="text-[13px] text-gray-600 mb-5 leading-relaxed">
          Are you sure you want to suspend <strong>{user.name}</strong>? They will no longer be able to log in.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-600 text-[13px] font-[600] rounded-xl hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 bg-red-600 text-white text-[13px] font-[600] rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
            {loading ? "Suspending…" : "Suspend"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlPage    = Math.max(1, Number(searchParams.get("page") || 1));
  const urlSearch  = searchParams.get("search") || "";
  const urlSegment = searchParams.get("segment") || "";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [expanded, setExpanded] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState("");
  const debounceRef = useRef(null);

  // Admins can never be suspended — exclude them from "select all".
  const selectableUsers = users.filter((u) => u.role !== "admin");
  const allOnPageSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.id));

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        for (const u of selectableUsers) next.delete(u.id);
        return next;
      }
      const next = new Set(prev);
      for (const u of selectableUsers) next.add(u.id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetStatus = async (isActive) => {
    if (selectedIds.size === 0) return;
    const action = isActive ? "activate" : "suspend";
    setBulkBusy(action);
    try {
      const ids = Array.from(selectedIds);
      const res = await adminAxios.post("/api/admin/users/bulk-status", { ids, isActive });
      toast.success(res.data?.message || "Updated");
      clearSelection();
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk update failed");
    } finally { setBulkBusy(""); }
  };

  const writeUrl = (next) => {
    const params = new URLSearchParams();
    const page = next.page ?? urlPage;
    const search = next.search !== undefined ? next.search : urlSearch;
    const segment = next.segment !== undefined ? next.segment : urlSegment;
    if (page > 1) params.set("page", String(page));
    if (search) params.set("search", search);
    if (segment) params.set("segment", segment);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const SEGMENTS = [
    { value: "",           label: "All" },
    { value: "new",        label: "New (30d)" },
    { value: "returning",  label: "Returning" },
    { value: "high_value", label: "High Value" },
    { value: "inactive",   label: "Inactive" },
  ];

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(urlPage), perPage: "20" });
      if (urlSearch)  params.set("search", urlSearch);
      if (urlSegment) params.set("segment", urlSegment);
      const res = await adminAxios.get(`/api/admin/users?${params}`);
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalUsers(res.data.totalUsers || 0);
      setExpanded(null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); /* eslint-disable-next-line */ }, [urlPage, urlSearch, urlSegment]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => writeUrl({ search: val, page: 1 }), 400);
  };

  const toggleStatus = async (user, isActive) => {
    setToggling(user.id);
    try {
      await adminAxios.put(`/api/admin/users/${user.id}/status`, { isActive });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: isActive ? "active" : "Suspended" } : u));
    } catch (err) { console.error(err); }
    finally { setToggling(null); setSuspendTarget(null); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-[16px] font-[700] text-[#1A237E]">
          Users <span className="font-[400] text-gray-400 text-[13px]">({totalUsers} total)</span>
        </h2>
        <div className="relative w-full sm:w-auto">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" />
          <input value={searchInput} onChange={handleSearchChange} placeholder="Search by name or email…"
            className="w-full sm:w-60 pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Segment filter */}
        <div className="flex gap-0 border-b border-gray-100 overflow-x-auto px-1 pt-1">
          {SEGMENTS.map((s) => (
            <button key={s.value} onClick={() => writeUrl({ segment: s.value, page: 1 })}
              className={`px-3 py-2.5 text-[12px] font-[600] whitespace-nowrap transition-colors border-b-2 -mb-px ${
                urlSegment === s.value
                  ? "border-[#1565C0] text-[#1565C0]"
                  : "border-transparent text-gray-500 hover:text-[#1565C0]"
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="sticky top-2 z-30 mx-3 mt-3 flex flex-wrap items-center gap-2 bg-[#1A237E] text-white shadow-lg rounded-2xl px-4 py-2.5">
            <span className="text-[13px] font-[700]">{selectedIds.size} selected</span>
            <span className="text-[12px] text-white/60 hidden sm:inline">·</span>
            <div className="flex gap-2 flex-wrap items-center ml-auto sm:ml-2">
              <button
                onClick={() => bulkSetStatus(true)}
                disabled={!!bulkBusy}
                className="h-8 px-3 rounded-lg text-[12px] font-[600] bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
              >
                {bulkBusy === "activate" ? "Activating…" : "Activate"}
              </button>
              <button
                onClick={() => bulkSetStatus(false)}
                disabled={!!bulkBusy}
                className="h-8 px-3 rounded-lg text-[12px] font-[600] bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
              >
                {bulkBusy === "suspend" ? "Suspending…" : "Suspend"}
              </button>
              <button
                onClick={clearSelection}
                disabled={!!bulkBusy}
                className="h-8 px-3 rounded-lg text-[12px] font-[600] bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFF]">
                <th scope="col" className="px-4 py-3 w-10 border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on this page"
                    className="w-4 h-4 accent-[#1565C0] cursor-pointer rounded"
                  />
                </th>
                {["", "Name", "Email", "Segment", "Role", "Joined", "Status", "Action"].map((h, i) => (
                  <th key={`${h}-${i}`} scope="col" className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: [16, 32, 120, 160, 70, 65, 75, 60, 80][j] }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.length === 0
                ? <tr><td colSpan={9}><EmptyState icon={<MdPeople style={{ fontSize: 64 }} />} title="No users found" subtitle="Try adjusting your search query." /></td></tr>
                : users.flatMap((user, i) => {
                    const isExpanded = expanded === user.id;
                    const isActive = user.status === "active";
                    const isBusy = toggling === user.id;
                    const checked = selectedIds.has(user.id);
                    const checkable = user.role !== "admin";

                    const row = (
                      <tr key={`row-${user.id}`}
                        className={`border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors cursor-pointer ${checked ? "bg-blue-50/40" : i % 2 !== 0 ? "bg-[#FAFAFA]" : ""} ${isExpanded ? "bg-blue-50/30" : ""}`}
                        onClick={() => setExpanded(isExpanded ? null : user.id)}>
                        {/* Bulk-select checkbox */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {checkable ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(user.id)}
                              aria-label={`Select ${user.name || user.email}`}
                              className="w-4 h-4 accent-[#1565C0] cursor-pointer rounded"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-300" title="Admins can't be bulk-suspended">—</span>
                          )}
                        </td>
                        {/* Avatar */}
                        <td className="px-4 py-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1565C0] to-[#1A237E] text-white flex items-center justify-center text-[12px] font-[700]">
                            {initials(user.name)}
                          </div>
                        </td>
                        {/* Name */}
                        <td className="px-4 py-3 font-[500] text-gray-800">
                          <div className="flex items-center gap-1.5">
                            {user.name}
                            {isExpanded ? <MdExpandLess className="text-gray-400 text-[16px]" /> : <MdExpandMore className="text-gray-300 text-[16px]" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{user.email}</td>
                        <td className="px-4 py-3"><SegmentBadge segment={user.segment} /></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-[600] ${user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {user.role === "admin" ? "Admin" : "Customer"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-[600] ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {user.role === "admin" ? (
                            <span className="text-gray-300 text-[12px]">—</span>
                          ) : isActive ? (
                            <button onClick={() => setSuspendTarget(user)} disabled={isBusy}
                              className="px-3 py-1 text-[12px] font-[600] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                              Suspend
                            </button>
                          ) : (
                            <button onClick={() => toggleStatus(user, true)} disabled={isBusy}
                              className="px-3 py-1 text-[12px] font-[600] text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50">
                              {isBusy ? "…" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );

                    if (isExpanded) return [row, <UserStatsRow key={`stats-${user.id}`} user={user} />];
                    return [row];
                  })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-44 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))
            : users.length === 0
            ? <div className="py-12 text-center text-gray-400 text-[13px]">No users found.</div>
            : users.map((user) => {
                const isExpanded = expanded === user.id;
                const isActive = user.status === "active";
                const isBusy = toggling === user.id;

                return (
                  <div key={user.id}>
                    <div className="p-4" onClick={() => setExpanded(isExpanded ? null : user.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1565C0] to-[#1A237E] text-white flex items-center justify-center text-[13px] font-[700] flex-shrink-0">
                          {initials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[14px] font-[600] text-gray-800 truncate">{user.name}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-[700] ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {isActive ? "Active" : "Suspended"}
                              </span>
                              {isExpanded ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-300" />}
                            </div>
                          </div>
                          <p className="text-[12px] text-gray-400 truncate mb-1">{user.email}</p>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-[600] ${user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                              {user.role === "admin" ? "Admin" : "Customer"}
                            </span>
                            <SegmentBadge segment={user.segment} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Stats */}
                        <MobileUserStats user={user} />
                        {/* Action */}
                        {user.role !== "admin" && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {isActive ? (
                              <button onClick={() => setSuspendTarget(user)} disabled={isBusy}
                                className="w-full py-2.5 text-[13px] font-[600] text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
                                Suspend User
                              </button>
                            ) : (
                              <button onClick={() => toggleStatus(user, true)} disabled={isBusy}
                                className="w-full py-2.5 text-[13px] font-[600] text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50">
                                {isBusy ? "Activating…" : "Activate User"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>

        <Pagination page={urlPage} totalPages={totalPages} onChange={(p) => writeUrl({ page: p })} />
      </div>

      {suspendTarget && (
        <SuspendDialog
          user={suspendTarget}
          onConfirm={() => toggleStatus(suspendTarget, false)}
          onCancel={() => setSuspendTarget(null)}
          loading={toggling === suspendTarget.id}
        />
      )}
    </div>
  );
}

function MobileUserStats({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAxios.get(`/api/admin/users/${user.id}/stats`)
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, [user.id]);

  return (
    <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3 grid grid-cols-2 gap-2">
      {[
        { label: "Mobile",       val: user.mobile || "—" },
        { label: "Joined",       val: fmtDate(user.createdAt) },
        { label: "Last Login",   val: fmtDate(user.last_login_date) },
        { label: "Total Orders", val: stats ? stats.orderCount : "…" },
        { label: "Total Spent",  val: stats ? inr(stats.totalSpent) : "…" },
      ].map(({ label, val }) => (
        <div key={label}>
          <p className="text-[10px] font-[700] uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
          <p className="text-[12px] font-[600] text-[#1A237E]">{val}</p>
        </div>
      ))}
    </div>
  );
}
