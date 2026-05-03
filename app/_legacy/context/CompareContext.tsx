"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'infix_compare';
const MAX_COMPARE = 3;

interface CompareProduct {
  id: number | string;
  [key: string]: unknown;
}

interface CompareContextValue {
  compareList: CompareProduct[];
  addToCompare: (product: CompareProduct) => void;
  removeFromCompare: (productId: number | string) => void;
  clearCompare: () => void;
  isComparing: (productId: number | string) => boolean;
  maxCompare: number;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<CompareProduct[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) setCompareList(stored);
    } catch {}
  }, []);

  const save = (list: CompareProduct[]) => {
    setCompareList(list);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const addToCompare = (product: CompareProduct) => {
    setCompareList(prev => {
      if (prev.find(p => p.id === product.id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      const next = [...prev, product];
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeFromCompare = (productId: number | string) => {
    save(compareList.filter(p => p.id !== productId));
  };

  const clearCompare = () => save([]);

  const isComparing = (productId: number | string) => compareList.some(p => p.id === productId);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isComparing, maxCompare: MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
