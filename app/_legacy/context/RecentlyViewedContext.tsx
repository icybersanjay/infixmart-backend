"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const KEY = "infix_recently_viewed";
const MAX = 10;

interface RecentlyViewedProduct {
  id: number | string;
  [key: string]: unknown;
}

interface RecentlyViewedContextValue {
  items: RecentlyViewedProduct[];
  track: (product: RecentlyViewedProduct) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue>({
  items: [],
  track: () => {},
});

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(stored)) setItems(stored);
    } catch {}
  }, []);

  const track = useCallback((product: RecentlyViewedProduct) => {
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

export function useRecentlyViewed(): RecentlyViewedContextValue {
  return useContext(RecentlyViewedContext);
}
