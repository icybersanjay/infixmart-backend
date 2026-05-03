"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { IoGrid, IoMenu } from 'react-icons/io5';
import { IoClose } from 'react-icons/io5';
import { FaStar, FaBox } from 'react-icons/fa';
import { FiFilter, FiX } from 'react-icons/fi';
import { MdOutlineShoppingCart } from 'react-icons/md';
import { getData } from '../../utils/api';
import ProductItem from '../../components/ProductItem';
import ProductCardSkeleton from '../../components/skeletons/ProductCardSkeleton';
import { imgUrl } from '../../utils/imageUrl';
import { useCart } from '../../context/CartContext';
import Stars from '../../components/ui/Stars';
import { stripHtml } from '../../utils/html';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating-desc',label: 'Top Rated' },
  { value: 'name-asc',   label: 'Name A–Z' },
];

const PRICE_PRESETS = [
  { label: 'Under ₹99',       min: '',    max: '99'   },
  { label: '₹99 – ₹499',     min: '99',  max: '499'  },
  { label: '₹500 – ₹999',    min: '500', max: '999'  },
  { label: '₹1k – ₹2,499',  min: '1000',max: '2499' },
  { label: '₹2,500+',        min: '2500',max: ''     },
];

/* ── Active filter chip ──────────────────────────────────────────────────── */
const FilterChip = ({ label, onRemove }) => (
  <span className='inline-flex items-center gap-1.5 bg-[#EEF4FF] border border-[#C5D9F5] text-[#1565C0] text-[12px] font-[600] px-3 py-1 rounded-full'>
    {label}
    <button onClick={onRemove} className='hover:text-red-500 transition-colors'><FiX className='text-[11px]' /></button>
  </span>
);

/* ── Sidebar filter panel ────────────────────────────────────────────────── */
const FilterPanel = ({
  categories, selectedCatId, handleCatChange,
  minPrice, maxPrice, setMinPrice, setMaxPrice, applyPrice, appliedMin, appliedMax,
  selectedRating, setSelectedRating,
  inStockOnly, setInStockOnly,
  brands, selectedBrand, setSelectedBrand,
  clearFilters,
  onDone,
}) => (
  <div className='space-y-6'>
    <div className='flex items-center justify-between'>
      <h3 className='font-[700] text-[15px] text-gray-800'>Filters</h3>
      <button className='text-[#1565C0] text-[12px] font-[600] hover:underline' onClick={clearFilters}>
        Clear all
      </button>
    </div>

    {/* In Stock */}
    <div>
      <label className='flex items-center gap-2.5 cursor-pointer group'>
        <input
          type='checkbox'
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className='accent-[#1565C0] w-4 h-4'
        />
        <span className='text-[13px] font-[600] text-gray-700 group-hover:text-[#1565C0] transition-colors'>
          In Stock Only
        </span>
      </label>
    </div>

    {/* Category */}
    <div>
      <h4 className='text-[11px] font-[700] uppercase tracking-wide text-gray-400 mb-3'>Category</h4>
      <div className='space-y-1.5 max-h-[220px] overflow-y-auto pr-1'>
        {categories.map(cat => (
          <label key={cat.id} className='flex items-center gap-2.5 cursor-pointer group'>
            <input
              type='checkbox'
              checked={selectedCatId === String(cat.id)}
              onChange={() => handleCatChange(String(cat.id))}
              className='accent-[#1565C0] w-4 h-4'
            />
            <span className='text-[13px] text-gray-700 group-hover:text-[#1565C0] transition-colors'>{cat.name}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Brand */}
    {brands.length > 0 && (
      <div>
        <h4 className='text-[11px] font-[700] uppercase tracking-wide text-gray-400 mb-3'>Brand</h4>
        <div className='space-y-1.5 max-h-[180px] overflow-y-auto pr-1'>
          {brands.map(b => (
            <label key={b} className='flex items-center gap-2.5 cursor-pointer group'>
              <input
                type='checkbox'
                checked={selectedBrand === b}
                onChange={() => setSelectedBrand(prev => prev === b ? '' : b)}
                className='accent-[#1565C0] w-4 h-4'
              />
              <span className='text-[13px] text-gray-700 group-hover:text-[#1565C0] transition-colors'>{b}</span>
            </label>
          ))}
        </div>
      </div>
    )}

    {/* Price range */}
    <div>
      <h4 className='text-[11px] font-[700] uppercase tracking-wide text-gray-400 mb-3'>Price (₹)</h4>
      {/* Quick presets */}
      <div className='flex flex-wrap gap-1.5 mb-3'>
        {PRICE_PRESETS.map(p => {
          const active = appliedMin === p.min && appliedMax === p.max;
          return (
            <button
              key={p.label}
              onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); setTimeout(() => { document.getElementById('apply-price-btn')?.click(); }, 0); }}
              className={`text-[11px] font-[600] px-2.5 py-1 rounded-full border transition-all ${
                active ? 'bg-[#1565C0] text-white border-[#1565C0]' : 'border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className='flex gap-2 items-center mb-2'>
        <input
          type='number'
          placeholder='Min'
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          className='w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-[#1565C0]'
        />
        <span className='text-gray-300 font-[300]'>–</span>
        <input
          type='number'
          placeholder='Max'
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          className='w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-[#1565C0]'
        />
      </div>
      <button
        id='apply-price-btn'
        onClick={applyPrice}
        className='w-full bg-[#1565C0] text-white text-[12px] font-[600] py-1.5 rounded-lg hover:bg-[#0D47A1] transition-colors'
      >
        Apply Price
      </button>
    </div>

    {/* Rating */}
    <div>
      <h4 className='text-[11px] font-[700] uppercase tracking-wide text-gray-400 mb-3'>Min Rating</h4>
      <div className='space-y-1'>
        {[4, 3, 2, 1].map(r => (
          <button
            key={r}
            onClick={() => setSelectedRating(prev => prev === r ? null : r)}
            className={`flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-[13px] transition-all ${
              selectedRating === r ? 'bg-[#1565C0] text-white' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <Stars value={r} size='small' readOnly />
            <span className='text-[12px] font-[500]'>& up</span>
          </button>
        ))}
      </div>
    </div>

    {onDone && (
      <button
        onClick={onDone}
        className='w-full py-3 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#0D47A1] transition-colors'
      >
        Show Results
      </button>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */

const ProductListing = ({
  initialProducts = null,
  initialTotalPages = 1,
  initialTotalCount = 0,
  initialCategories = [],
  initialBrands = [],
  initialFilters = null,
} = {}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const { addToCart } = useCart();

  const [selectedCatId, setSelectedCatId]   = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice]             = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice]             = useState(searchParams.get('maxPrice') || '');
  const [appliedMin, setAppliedMin]         = useState(searchParams.get('minPrice') || '');
  const [appliedMax, setAppliedMax]         = useState(searchParams.get('maxPrice') || '');
  const [selectedRating, setSelectedRating] = useState(searchParams.get('minRating') ? Number(searchParams.get('minRating')) : null);
  const [inStockOnly, setInStockOnly]       = useState(searchParams.get('inStockOnly') === 'true');
  const [selectedBrand, setSelectedBrand]   = useState(searchParams.get('brand') || '');
  const [sortBy, setSortBy]                 = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode]             = useState('grid');
  const [page, setPage]                     = useState(1);
  const [loadingMore, setLoadingMore]       = useState(false);

  const [products, setProducts]         = useState(initialProducts);
  const [totalPages, setTotalPages]     = useState(initialTotalPages);
  const [totalCount, setTotalCount]     = useState(initialTotalCount);
  const [categories, setCategories]     = useState(initialCategories);
  const [brands, setBrands]             = useState(initialBrands);

  // The very first render already has products from the server — skip the
  // client-side initial fetch. After any filter change, refetch normally.
  const skipInitialFetchRef = useRef(initialProducts !== null);

  const PER_PAGE = 20;

  useEffect(() => {
    // Skip the network round-trip when the server already seeded these.
    if (!initialCategories || initialCategories.length === 0) {
      getData('/api/category').then(res => {
        if (res && !res.error) setCategories(res.categories || []);
      });
    }
    if (!initialBrands || initialBrands.length === 0) {
      getData('/api/product/brands').then(res => {
        if (res && !res.error) setBrands(res.brands || []);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildParams = useCallback((p = 1) => {
    const params = new URLSearchParams({ page: String(p), perPage: String(PER_PAGE) });
    if (selectedCatId) params.set('category', selectedCatId);
    if (appliedMin !== '') params.set('minPrice', appliedMin);
    if (appliedMax !== '') params.set('maxPrice', appliedMax);
    if (selectedRating) params.set('minRating', String(selectedRating));
    if (inStockOnly) params.set('inStockOnly', 'true');
    if (selectedBrand) params.set('brand', selectedBrand);
    if (sortBy && sortBy !== 'newest') params.set('sort', sortBy);
    const search = searchParams.get('search');
    if (search) params.set('search', search);
    return params;
  }, [selectedCatId, appliedMin, appliedMax, selectedRating, inStockOnly, selectedBrand, sortBy, searchParams]);

  // Fresh fetch (filter/sort change) — resets list
  const fetchProducts = useCallback(() => {
    setProducts(null);
    setPage(1);
    getData(`/api/product?${buildParams(1).toString()}`).then(res => {
      if (res && !res.error) {
        setProducts(res.products || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalProducts || (res.products || []).length);
      } else {
        setProducts([]);
      }
    });
  }, [buildParams]);

  // Load more — appends to existing list
  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setLoadingMore(true);
    getData(`/api/product?${buildParams(nextPage).toString()}`).then(res => {
      if (res && !res.error) {
        setProducts(prev => [...(prev || []), ...(res.products || [])]);
        setPage(nextPage);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalProducts || 0);
      }
      setLoadingMore(false);
    });
  }, [page, buildParams]);

  useEffect(() => {
    // First render is hydrated from the server-rendered list; only fetch on
    // subsequent filter/sort changes.
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    setSelectedCatId(''); setMinPrice(''); setMaxPrice('');
    setAppliedMin(''); setAppliedMax(''); setSelectedRating(null);
    setInStockOnly(false); setSelectedBrand(''); setSortBy('newest'); setPage(1);
    router.push(pathname);
  };

  const handleCatChange = (catId) => {
    setSelectedCatId(prev => prev === catId ? '' : catId);
    setPage(1);
  };

  const applyPrice = () => {
    setAppliedMin(minPrice); setAppliedMax(maxPrice); setPage(1);
  };

  const isLoading = products === null;
  const isEmpty   = !isLoading && products.length === 0;

  const activeCatName = selectedCatId ? categories.find(c => c.id == selectedCatId)?.name : null;
  const seoTitle = activeCatName || 'All Products';
  const searchQuery = searchParams.get('search');

  // Fire `search` analytics + log query server-side once results are in.
  // Keyed on (query + zero-result flag) so we don't double-fire on filter
  // tweaks within the same search.
  const lastTrackedSearchRef = useRef('');
  useEffect(() => {
    if (!searchQuery || isLoading) return;
    const key = `${searchQuery}::${products.length}`;
    if (lastTrackedSearchRef.current === key) return;
    lastTrackedSearchRef.current = key;
    import('../../utils/analytics').then(({ trackSearch }) => trackSearch(searchQuery, products.length)).catch(() => {});
    // Server-side log (no-auth, fire-and-forget) for admin search analytics.
    fetch('/api/search-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery, resultCount: products.length }),
    }).catch(() => {});
  }, [searchQuery, products, isLoading]);
  const listingQuery = searchParams.toString();
  const listingDescription = activeCatName
    ? `Shop ${activeCatName} at best wholesale prices on InfixMart.`
    : searchQuery
      ? `Search results for ${searchQuery} on InfixMart.`
      : 'Browse 10,000+ genuine products at wholesale prices.';
  const listingStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seoTitle,
    description: listingDescription,
    url: `/productListing${listingQuery ? `?${listingQuery}` : ''}`,
    mainEntity: (products || []).map((product) => ({
      '@type': 'Product',
      name: product.name,
      url: `/product/${product.slug || product.id}`,
      image: product.images?.[0] ? imgUrl(product.images[0]) : undefined,
      description: stripHtml(product.description || '').slice(0, 160) || undefined,
    })),
  };

  // Active filter chips
  const activeFilters = [
    activeCatName && { key: 'cat', label: `Category: ${activeCatName}`, clear: () => { setSelectedCatId(''); setPage(1); } },
    (appliedMin || appliedMax) && { key: 'price', label: `Price: ₹${appliedMin || '0'} – ₹${appliedMax || '∞'}`, clear: () => { setMinPrice(''); setMaxPrice(''); setAppliedMin(''); setAppliedMax(''); setPage(1); } },
    selectedRating && { key: 'rating', label: `${selectedRating}★ & up`, clear: () => setSelectedRating(null) },
    inStockOnly && { key: 'stock', label: 'In Stock Only', clear: () => setInStockOnly(false) },
    selectedBrand && { key: 'brand', label: `Brand: ${selectedBrand}`, clear: () => setSelectedBrand('') },
    searchQuery && { key: 'search', label: `Search: "${searchQuery}"`, clear: () => { const p = new URLSearchParams(searchParams.toString()); p.delete('search'); router.push(p.toString() ? `${pathname}?${p.toString()}` : pathname); } },
  ].filter(Boolean);

  const filterProps = {
    categories, selectedCatId, handleCatChange,
    minPrice, maxPrice, setMinPrice, setMaxPrice, applyPrice, appliedMin, appliedMax,
    selectedRating, setSelectedRating,
    inStockOnly, setInStockOnly,
    brands, selectedBrand, setSelectedBrand,
    clearFilters,
  };

  return (
    <section className='py-5 pb-10 bg-[#F7F8FC] min-h-screen'>
      <SEO
        title={seoTitle}
        description={listingDescription}
        url={`/productListing${listingQuery ? `?${listingQuery}` : ''}`}
        structuredData={listingStructuredData}
      />
      <div className='container'>
        {/* Breadcrumb */}
        <nav className='text-[12px] text-gray-400 mb-4 flex gap-1.5 items-center flex-wrap'>
          <Link href='/' className='hover:text-[#1565C0] transition-colors'>Home</Link>
          <span>/</span>
          <span className='text-gray-600'>Products</span>
          {activeCatName && (<><span>/</span><span className='text-gray-800 font-[500]'>{activeCatName}</span></>)}
        </nav>

        {/* ── Mobile filter toggle ── */}
        <div className='md:hidden mb-3 flex items-center justify-between'>
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className='flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-[600] shadow-sm hover:border-[#1565C0] transition-colors'
          >
            <FiFilter className='text-[14px] text-[#1565C0]' /> Filters
            {activeFilters.length > 0 && (
              <span className='bg-[#1565C0] text-white text-[10px] font-[800] w-5 h-5 rounded-full flex items-center justify-center'>
                {activeFilters.length}
              </span>
            )}
          </button>
          <span className='text-[13px] text-gray-500'>
            {isLoading ? 'Loading…' : `${products.length} item${products.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Mobile bottom-sheet filters ── */}
        {filterDrawerOpen && (
          <>
            <div
              className='fixed inset-0 bg-black/50 z-50 md:hidden animate-fadeIn'
              onClick={() => setFilterDrawerOpen(false)}
              aria-hidden='true'
            />
            <div
              className='fixed bottom-0 left-0 right-0 bg-white z-50 shadow-2xl md:hidden rounded-t-2xl flex flex-col max-h-[85vh] animate-slideUp'
              role='dialog'
              aria-modal='true'
              aria-label='Filters'
            >
              {/* Drag handle */}
              <div
                className='flex justify-center pt-2.5 pb-1.5 cursor-grab'
                onClick={() => setFilterDrawerOpen(false)}
              >
                <span className='w-12 h-1.5 bg-gray-300 rounded-full' />
              </div>
              <div className='flex items-center justify-between px-4 pb-3 border-b border-gray-100'>
                <h3 className='font-[700] text-[16px]'>Filters</h3>
                <button
                  onClick={() => setFilterDrawerOpen(false)}
                  aria-label='Close filters'
                  className='w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors'
                >
                  <IoClose className='text-[20px]' />
                </button>
              </div>
              <div className='p-4 overflow-y-auto flex-1'>
                <FilterPanel {...filterProps} onDone={() => setFilterDrawerOpen(false)} />
              </div>
            </div>
          </>
        )}

        <div className='flex gap-5'>
          {/* ── Desktop sidebar ── */}
          <aside className='hidden md:block w-[240px] flex-shrink-0'>
            <div className='bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-[72px]'>
              <FilterPanel {...filterProps} />
            </div>
          </aside>

          {/* ── Right content ── */}
          <div className='flex-1 min-w-0'>
            {/* Top toolbar */}
            <div className='bg-white rounded-xl px-4 py-3 mb-4 flex items-center justify-between shadow-sm border border-gray-100 gap-2 flex-wrap'>
              <div className='flex items-center gap-2'>
                <button
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-[#1565C0] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                  onClick={() => setViewMode('list')}
                  title='List view'
                >
                  <IoMenu className='text-[18px]' />
                </button>
                <button
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#1565C0] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                  onClick={() => setViewMode('grid')}
                  title='Grid view'
                >
                  <IoGrid className='text-[18px]' />
                </button>
                <span className='hidden md:inline text-[13px] text-gray-400 ml-1'>
                  {isLoading ? 'Loading…' : <>{products.length} <span className='text-gray-600 font-[500]'>item{products.length !== 1 ? 's' : ''}</span></>}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-[12px] text-gray-400 hidden sm:block'>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setPage(1); }}
                  className='border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] font-[500] focus:outline-none focus:border-[#1565C0] cursor-pointer bg-white'
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className='flex flex-wrap gap-2 mb-4'>
                {activeFilters.map(f => (
                  <FilterChip key={f.key} label={f.label} onRemove={f.clear} />
                ))}
                {activeFilters.length > 1 && (
                  <button onClick={clearFilters} className='text-[12px] text-red-500 font-[600] hover:underline px-2'>
                    Clear all
                  </button>
                )}
              </div>
            )}

            {/* Products */}
            {isLoading ? (
              <div className='grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                {Array(12).fill(null).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : isEmpty ? (
              <div className='flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100'>
                <div className='w-20 h-20 bg-[#F0F5FF] rounded-full flex items-center justify-center mb-4'>
                  <FaBox className='text-[2rem] text-[#1565C0]/30' />
                </div>
                <h3 className='text-[18px] font-[700] text-gray-700 mb-1'>No products available</h3>
                <p className='text-[13px] text-gray-400 mb-5'>Try adjusting your filters</p>
                <button
                  onClick={clearFilters}
                  className='bg-[#1565C0] text-white px-6 py-2.5 rounded-xl hover:bg-[#0D47A1] transition-colors text-[13px] font-[600]'
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className='infix-stagger grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                {products.map(p => <ProductItem key={p.id} item={p} />)}
              </div>
            ) : (
              <div className='infix-stagger flex flex-col gap-3'>
                {products.map(p => (
                  <div key={p.id} className='bg-white rounded-xl border border-gray-100 p-3 flex gap-4 items-start shadow-sm hover:shadow-md hover:border-[#1565C0]/20 transition-all'>
                    <Link href={`/product/${p.id}`} className='flex-shrink-0'>
                      <div className='w-[110px] h-[110px] bg-[#F8FAFF] rounded-xl overflow-hidden flex items-center justify-center'>
                        <img
                          src={imgUrl(p.images?.[0])}
                          alt={p.name}
                          className='w-full h-full object-contain p-2'
                        />
                      </div>
                    </Link>
                    <div className='flex-1 min-w-0 flex flex-col gap-1'>
                      {p.brand && <p className='text-[10px] font-[700] uppercase text-[#1565C0] tracking-wide'>{p.brand}</p>}
                      <Link href={`/product/${p.id}`} className='font-[600] text-[14px] text-gray-800 hover:text-[#1565C0] transition-colors line-clamp-2 leading-snug'>
                        {p.name}
                      </Link>
                      <Stars value={Number(p.rating) || 0} size='small' readOnly precision={0.5} />
                      <div className='flex items-center gap-2 mt-0.5'>
                        <span className='font-[800] text-[#1565C0] text-[16px]'>₹{fmt(p.price)}</span>
                        {p.oldprice > 0 && <span className='text-gray-400 line-through text-[13px]'>₹{fmt(p.oldprice)}</span>}
                        {p.discount > 0 && <span className='text-[11px] font-[700] text-green-600 bg-green-50 px-1.5 py-0.5 rounded'>{p.discount}% off</span>}
                      </div>
                      {Number(p.countInStock) === 0
                        ? <span className='text-[11px] text-red-500 font-[600]'>Out of Stock</span>
                        : <button
                            onClick={() => addToCart(p.id)}
                            className='mt-1 self-start flex items-center gap-1.5 bg-[#111827] text-white text-[12px] font-[700] px-4 py-1.5 rounded-lg hover:bg-[#1565C0] transition-colors'
                          >
                            <MdOutlineShoppingCart className='text-[13px]' /> Add to Cart
                          </button>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {!isLoading && products && (
              <div className='flex flex-col items-center gap-3 mt-8'>
                <p className='text-[13px] text-gray-500'>
                  Showing <span className='font-[700] text-gray-800'>{products.length}</span>
                  {totalCount > 0 && <> of <span className='font-[700] text-gray-800'>{totalCount}</span></>} products
                </p>
                {page < totalPages && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className='px-8 py-3 border-2 border-[#1565C0] text-[#1565C0] font-[700] text-[14px] rounded-xl hover:bg-[#1565C0] hover:text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed'
                  >
                    {loadingMore ? 'Loading…' : 'Load More Products'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductListing;
