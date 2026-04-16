"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const KEY = "infix_recently_viewed";
const MAX = 10;

const RecentlyViewedContext = createContext({ items: [], track: () => {} });

export function RecentlyViewedProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(stored)) setItems(stored);
    } catch {}
  }, []);

  const track = useCallback((product) => {
    if (!product?.id) return;
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ items, track }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}
