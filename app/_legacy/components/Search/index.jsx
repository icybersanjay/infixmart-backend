import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IoSearch, IoClose } from 'react-icons/io5';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';

const MOST_SEARCHED = ['Cricket bat', 'Bat', 'Drone', 'Swimming pool', 'Pool'];

const Search = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();

  // Fetch categories for dropdown
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
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Debounced live suggestions
  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await getData(`/api/product?search=${encodeURIComponent(q)}&perPage=5`);
      if (res && !res.error) {
        setSuggestions(res.products || res.data || []);
      }
      setLoading(false);
    }, 350);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    fetchSuggestions(val);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    const params = new URLSearchParams();
    params.set('search', query.trim());
    if (category) params.set('category', category);
    router.push(`/productListing?${params.toString()}`);
  };

  const handleSuggestionClick = (item) => {
    setOpen(false);
    router.push(`/product/${item.id}`);
  };

  const handleMostSearched = (term) => {
    setQuery(term);
    setOpen(false);
    router.push(`/productListing?search=${encodeURIComponent(term)}`);
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  const showDropdown = open && (query.trim() || true);

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
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Text input */}
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            placeholder="Search for products..."
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
          {/* Most searched row — always shown when input is empty */}
          {!query.trim() && (
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-[11px] text-gray-400 font-[600] uppercase tracking-wide mb-2">
                Most searched
              </p>
              <div className="flex flex-wrap gap-2">
                {MOST_SEARCHED.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleMostSearched(term)}
                    className="text-[12px] text-[#1565C0] bg-[#e3f0ff] px-3 py-1 rounded-full hover:bg-[#1565C0] hover:text-white transition-colors font-[500]"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live suggestions */}
          {query.trim() && (
            <>
              {loading ? (
                <div className="px-4 py-3 text-[13px] text-gray-400">Searching...</div>
              ) : suggestions.length > 0 ? (
                <>
                  <p className="px-4 pt-3 pb-1 text-[11px] text-gray-400 font-[600] uppercase tracking-wide">
                    Suggestions
                  </p>
                  {suggestions.map((item) => {
                    const images = Array.isArray(item.images) ? item.images : [];
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSuggestionClick(item)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f0f5ff] transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-md overflow-hidden border border-gray-100 flex-shrink-0">
                          <img
                            src={imgUrl(images[0]) || 'https://via.placeholder.com/36'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-700 font-[500] truncate">{item.name}</p>
                          <p className="text-[12px] text-[#1565C0] font-[600]">
                            ₹{Number(item.price).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    onClick={handleSubmit}
                    className="w-full px-4 py-2 text-[12px] text-[#1565C0] font-[600] text-center border-t border-gray-100 hover:bg-[#f0f5ff] transition-colors"
                  >
                    See all results for "{query}"
                  </button>
                </>
              ) : (
                <div className="px-4 py-4 text-[13px] text-gray-400 text-center">
                  No products available for "{query}"
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
