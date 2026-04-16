"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IoSearch, IoClose } from 'react-icons/io5';
import { MdHistory, MdTrendingUp } from 'react-icons/md';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';

const MOST_SEARCHED = ['Cricket bat', 'Bat', 'Drone', 'Swimming pool', 'Pool'];
const RECENT_KEY = 'infix_recent_searches';
const MAX_RECENT = 5;

function saveRecentSearch(term) {
  try {
    const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [term, ...prev.filter((t) => t !== term)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function getRecentSearches() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

const Search = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();

  // Fetch categories
  useEffect(() => {
    getData('/api/category').then((res) => {
      if (res && !res.error) setCategories(res.categoryList || res.data || []);
    });
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live suggestions
  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); setActiveIndex(-1); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await getData(`/api/product?search=${encodeURIComponent(q)}&perPage=6`);
      if (res && !res.error) {
        setSuggestions(res.products || res.data || []);
      }
      setLoading(false);
      setActiveIndex(-1);
    }, 350);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    fetchSuggestions(val);
  };

  const navigate = (path) => {
    setOpen(false);
    setActiveIndex(-1);
    router.push(path);
  };

  const handleSubmit = (e, overrideQuery) => {
    e?.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    saveRecentSearch(q);
    setRecentSearches(getRecentSearches());
    const params = new URLSearchParams();
    params.set('search', q);
    if (category) params.set('category', category);
    navigate(`/productListing?${params.toString()}`);
  };

  const handleSuggestionClick = (item) => {
    saveRecentSearch(item.name);
    setRecentSearches(getRecentSearches());
    navigate(`/product/${item.slug || item.id}`);
  };

  const handleTermClick = (term) => {
    setQuery(term);
    handleSubmit(null, term);
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleClearRecent = (e) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!open) return;

    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const total = suggestions.length; // navigable items when query is active
    if (total === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = suggestions[activeIndex];
      if (item) handleSuggestionClick(item);
    }
  };

  const handleFocus = () => {
    setRecentSearches(getRecentSearches());
    setOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className={`flex items-center h-[46px] rounded-lg border-2 bg-white overflow-hidden transition-all ${open ? 'border-[#1565C0] shadow-[0_0_0_3px_rgba(21,101,192,0.15)]' : 'border-gray-200'}`}>
          {/* Category select */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-full px-3 text-[12px] text-gray-600 bg-gray-50 border-r border-gray-200 focus:outline-none cursor-pointer min-w-[120px] max-w-[150px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat, index) => (
              <option
                key={cat.id ?? cat._id ?? cat.slug ?? cat.name ?? `search-category-${index}`}
                value={cat.id}
              >
                {cat.name}
              </option>
            ))}
          </select>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search for products..."
            autoComplete="off"
            className="flex-1 h-full px-3 text-[14px] text-gray-700 bg-white focus:outline-none placeholder-gray-400"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="px-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <IoClose className="text-[16px]" />
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            className="h-full px-4 bg-[#1565C0] text-white flex items-center justify-center hover:bg-[#0D47A1] transition-colors flex-shrink-0"
          >
            <IoSearch className="text-[18px]" />
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-gray-100 z-50 overflow-hidden">

          {/* Empty state: recent searches + most searched */}
          {!query.trim() && (
            <>
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-gray-400 font-[600] uppercase tracking-wide flex items-center gap-1">
                      <MdHistory className="text-[14px]" /> Recent
                    </p>
                    <button
                      onClick={handleClearRecent}
                      className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleTermClick(term)}
                        className="text-[12px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors font-[500] flex items-center gap-1"
                      >
                        <MdHistory className="text-[12px] text-gray-400" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Most searched */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-gray-400 font-[600] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <MdTrendingUp className="text-[14px]" /> Popular searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {MOST_SEARCHED.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleTermClick(term)}
                      className="text-[12px] text-[#1565C0] bg-[#e3f0ff] px-3 py-1 rounded-full hover:bg-[#1565C0] hover:text-white transition-colors font-[500]"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Live suggestions */}
          {query.trim() && (
            <>
              {loading ? (
                <div className="px-4 py-3 flex items-center gap-2 text-[13px] text-gray-400">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-[#1565C0] rounded-full animate-spin inline-block" />
                  Searching…
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <p className="px-4 pt-3 pb-1 text-[11px] text-gray-400 font-[600] uppercase tracking-wide">
                    Suggestions
                  </p>
                  {suggestions.map((item, index) => {
                    const images = Array.isArray(item.images) ? item.images : [];
                    const isActive = index === activeIndex;
                    const hasDiscount = item.oldprice && Number(item.oldprice) > Number(item.price);
                    const discountPct = hasDiscount
                      ? Math.round(((item.oldprice - item.price) / item.oldprice) * 100)
                      : 0;

                    return (
                      <button
                        key={item.id ?? item._id ?? item.slug ?? `suggestion-${index}`}
                        onClick={() => handleSuggestionClick(item)}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                        className={`w-full flex items-center gap-3 px-4 py-2 transition-colors text-left ${isActive ? 'bg-[#f0f5ff]' : 'hover:bg-[#f0f5ff]'}`}
                      >
                        <div className="w-9 h-9 rounded-md overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                          {images[0] ? (
                            <img
                              src={imgUrl(images[0])}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const fb = imgUrl(images[1]);
                                if (fb && e.target.src !== fb) { e.target.src = fb; } else { e.target.style.display = 'none'; }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-700 font-[500] truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[12px] text-[#1565C0] font-[700]">
                              ₹{Number(item.price).toLocaleString('en-IN')}
                            </p>
                            {hasDiscount && (
                              <>
                                <p className="text-[11px] text-gray-400 line-through">
                                  ₹{Number(item.oldprice).toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] font-[700] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                  {discountPct}% off
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <IoSearch className="text-gray-300 text-[14px] flex-shrink-0" />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handleSubmit(null)}
                    className="w-full px-4 py-2.5 text-[12px] text-[#1565C0] font-[600] text-center border-t border-gray-100 hover:bg-[#f0f5ff] transition-colors"
                  >
                    See all results for &ldquo;{query}&rdquo; →
                  </button>
                </>
              ) : (
                <div className="px-4 py-4 text-[13px] text-gray-400 text-center">
                  No products found for &ldquo;{query}&rdquo;
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
