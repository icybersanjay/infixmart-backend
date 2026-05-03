"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MdSearch, MdClose } from "react-icons/md";
import { FaShoppingBag, FaBoxOpen, FaUser } from "react-icons/fa";
import adminAxios from "../_lib/adminAxios";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Admin command-bar style quick search.
 *
 * Triggered by:
 *   • the Search button in the header
 *   • the global "/" key (focus is not in an input)
 *
 * Hits GET /api/admin/search?q=… and groups results into Orders / Products /
 * Users. Up/Down + Enter are handled — Enter on the highlighted row
 * navigates to the relevant admin page.
 */

const TYPE_ICONS = {
  order:   FaShoppingBag,
  product: FaBoxOpen,
  user:    FaUser,
};

export default function AdminQuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ orders: [], products: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Open via "/" globally; close via Esc.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !open) {
        const tag = document.activeElement?.tagName;
        const isEditable = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          setOpen(true);
        }
      }
      if (open && e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll + focus input when opening.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset state on close.
  useEffect(() => {
    if (open) return;
    setQ("");
    setResults({ orders: [], products: [], users: [] });
    setHighlighted(0);
  }, [open]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults({ orders: [], products: [], users: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await adminAxios.get(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);
        setResults({
          orders: res.data?.orders || [],
          products: res.data?.products || [],
          users: res.data?.users || [],
        });
        setHighlighted(0);
      } catch {
        setResults({ orders: [], products: [], users: [] });
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [q, open]);

  // Flatten into one indexed list for keyboard nav.
  const flat = [
    ...results.orders.map((o)   => ({ type: "order",   id: o.id, label: `#${o.id}`, sub: `${o.paymentMethod || "—"} · ${inr(o.totalPrice)}`, href: "/admin/orders" })),
    ...results.products.map((p) => ({ type: "product", id: p.id, label: p.name,     sub: `${p.brand || "—"} · ${inr(p.price)} · ${p.countInStock} in stock`, href: `/admin/products/${p.id}/edit` })),
    ...results.users.map((u)    => ({ type: "user",    id: u.id, label: u.name || u.email, sub: u.email + (u.mobile ? ` · ${u.mobile}` : ""), href: "/admin/users" })),
  ];

  const navigate = (item) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  const handleKeyDown = (e) => {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(flat[highlighted]);
    }
  };

  return (
    <>
      {/* Trigger pill in header — keyboard hint included */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0] text-gray-500 text-[12.5px] font-[500] transition-colors"
        aria-label="Open quick search (slash)"
      >
        <MdSearch className="text-[16px]" />
        <span>Search…</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-400 bg-gray-50 font-mono">/</kbd>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Quick search" className="fixed inset-0 z-[80] flex items-start justify-center px-3 sm:px-6 pt-16 sm:pt-24 animate-fadeIn">
          <button
            type="button"
            aria-label="Close search"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-slideUp">
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-gray-100">
              <MdSearch className="text-gray-400 text-[20px] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search orders by id, products, users by name or email…"
                className="flex-1 bg-transparent text-[14px] text-gray-800 placeholder:text-gray-400 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0"
              >
                <MdClose className="text-[18px]" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!q.trim() ? (
                <div className="px-5 py-10 text-center text-[12.5px] text-gray-400">
                  Start typing to search across orders, products, and users.
                </div>
              ) : loading ? (
                <div className="px-5 py-10 text-center text-[12.5px] text-gray-400">Searching…</div>
              ) : flat.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12.5px] text-gray-400">No matches for "{q}".</div>
              ) : (
                <ResultGroups
                  results={results}
                  flat={flat}
                  highlighted={highlighted}
                  onHover={(i) => setHighlighted(i)}
                  onPick={navigate}
                />
              )}
            </div>

            {/* Footer hint */}
            <div className="hidden sm:flex items-center justify-between px-5 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">↑</kbd>/<kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">↓</kbd> Navigate</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">↵</kbd> Open</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">Esc</kbd> Close</span>
              </div>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">/</kbd> anywhere</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroups({ results, flat, highlighted, onHover, onPick }) {
  let cursor = 0;
  const groups = [
    { key: "orders",   label: "Orders",   items: results.orders   },
    { key: "products", label: "Products", items: results.products },
    { key: "users",    label: "Users",    items: results.users    },
  ];

  return (
    <div className="py-1">
      {groups.map((g) => {
        if (!g.items.length) return null;
        return (
          <div key={g.key} className="px-2 py-1">
            <p className="px-3 py-1.5 text-[10px] font-[700] uppercase tracking-wider text-gray-400">{g.label}</p>
            {g.items.map((it) => {
              const idx = cursor;
              cursor += 1;
              const flatItem = flat[idx];
              const Icon = TYPE_ICONS[flatItem.type];
              const isHi = idx === highlighted;
              return (
                <button
                  key={`${flatItem.type}-${flatItem.id}`}
                  type="button"
                  onMouseEnter={() => onHover(idx)}
                  onClick={() => onPick(flatItem)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isHi ? "bg-[#1565C0] text-white" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${isHi ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Icon className="text-[12px]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-[600] truncate ${isHi ? "text-white" : "text-gray-800"}`}>
                      {flatItem.label}
                    </p>
                    <p className={`text-[11px] truncate ${isHi ? "text-white/80" : "text-gray-400"}`}>
                      {flatItem.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
