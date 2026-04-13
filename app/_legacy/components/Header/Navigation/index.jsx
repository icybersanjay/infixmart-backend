import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getData } from '../../../utils/api';
import { IoGridOutline } from 'react-icons/io5';
import { FaAngleDown, FaFire } from 'react-icons/fa';
import { MdNewReleases, MdLocalOffer } from 'react-icons/md';
import { BsStars } from 'react-icons/bs';

const PRICE_RANGES = [
  { label: 'Under ₹99',    max: 99  },
  { label: 'Under ₹199',   max: 199 },
  { label: 'Under ₹499',   max: 499 },
  { label: 'Under ₹999',   max: 999 },
  { label: '₹999+ Premium', min: 999 },
];

const Navigation = () => {
  const [categories, setCategories] = useState([]);
  const [catOpen, setCatOpen]       = useState(false);
  const [priceOpen, setPriceOpen]   = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navRef    = useRef(null);

  useEffect(() => {
    getData('/api/category')
      .then((res) => {
        if (res && !res.error) {
          const data = res.categories || res.data || [];
          setCategories(Array.isArray(data) ? data.slice(0, 12) : []);
        }
      })
      .catch(() => {});
  }, []);

  // Close all dropdowns when route changes
  useEffect(() => {
    setCatOpen(false);
    setPriceOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setCatOpen(false);
        setPriceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { setCatOpen(false); setPriceOpen(false); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const closeAll = useCallback(() => { setCatOpen(false); setPriceOpen(false); }, []);

  const linkCls = (path) =>
    `flex-shrink-0 flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-[500] whitespace-nowrap transition-colors border-b-2 ${
      pathname === path
        ? 'text-yellow-300 border-yellow-300 font-[700]'
        : 'text-white/85 border-transparent hover:text-white hover:border-white/30'
    }`;

  return (
    <nav
      ref={navRef}
      className='hidden md:block bg-[#1565C0]'
      aria-label='Main navigation'
    >
      <div className='container'>
        <div className='flex items-center overflow-x-auto scrollbar-hide'>

          {/* All Categories dropdown */}
          <div
            className='relative flex-shrink-0'
            onMouseEnter={() => { setCatOpen(true); setPriceOpen(false); }}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button
              aria-haspopup='listbox'
              aria-expanded={catOpen}
              className='flex items-center gap-2 px-4 py-3 bg-[#0D47A1] hover:bg-[#0a3474] text-white text-[13px] font-[700] transition-colors h-full'
            >
              <IoGridOutline className='text-[15px]' />
              All Categories
              <FaAngleDown className={`text-[11px] transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
            </button>

            {catOpen && categories.length > 0 && (
              <div
                role='listbox'
                aria-label='Categories'
                className='absolute top-full left-0 bg-white shadow-2xl border border-gray-100 rounded-b-2xl z-50 min-w-[220px] py-2'
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    role='option'
                    onClick={() => { router.push(`/productListing?category=${cat.id}`); closeAll(); }}
                    className='w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-[#EEF4FF] hover:text-[#1565C0] transition-colors text-left'
                  >
                    <span className='w-1.5 h-1.5 rounded-full bg-[#1565C0] flex-shrink-0' />
                    {cat.name}
                  </button>
                ))}
                <div className='border-t border-gray-100 mt-1 pt-1'>
                  <button
                    onClick={() => { router.push('/productListing'); closeAll(); }}
                    className='w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#1565C0] font-[700] hover:bg-[#EEF4FF] transition-colors'
                  >
                    View All Categories →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className='w-px h-5 bg-white/20 flex-shrink-0 mx-0.5' />

          {/* Static nav links */}
          <Link href='/'                          className={linkCls('/')}>Home</Link>

          <Link href='/productListing?sort=newest' className={linkCls('/new-arrivals')}>
            <MdNewReleases className='text-yellow-300 text-[14px]' />
            New Arrivals
          </Link>

          <Link href='/productListing?sort=popular' className={linkCls('/trending')}>
            <FaFire className='text-orange-300 text-[12px]' />
            Trending
          </Link>

          <Link href='/productListing?onSale=true' className={linkCls('/on-sale')}>
            <MdLocalOffer className='text-yellow-300 text-[14px]' />
            On Sale
          </Link>

          <Link href='/productListing?sort=bestseller' className={linkCls('/best-sellers')}>
            <BsStars className='text-yellow-300 text-[12px]' />
            Best Sellers
          </Link>

          {/* Shop by Price dropdown */}
          <div
            className='relative flex-shrink-0'
            onMouseEnter={() => { setPriceOpen(true); setCatOpen(false); }}
            onMouseLeave={() => setPriceOpen(false)}
          >
            <button
              aria-haspopup='listbox'
              aria-expanded={priceOpen}
              className='flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-[500] text-white/85 hover:text-white border-b-2 border-transparent hover:border-white/30 transition-colors whitespace-nowrap'
            >
              Shop by Price
              <FaAngleDown className={`text-[11px] transition-transform duration-200 ${priceOpen ? 'rotate-180' : ''}`} />
            </button>

            {priceOpen && (
              <div
                role='listbox'
                aria-label='Price ranges'
                className='absolute top-full left-0 bg-white shadow-2xl border border-gray-100 rounded-b-2xl z-50 min-w-[180px] py-2'
              >
                {PRICE_RANGES.map((r, i) => (
                  <button
                    key={i}
                    role='option'
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (r.max) params.set('maxPrice', r.max);
                      if (r.min) params.set('minPrice', r.min);
                      router.push(`/productListing?${params.toString()}`);
                      closeAll();
                    }}
                    className='w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-[#EEF4FF] hover:text-[#1565C0] transition-colors text-left'
                  >
                    <span className='text-[#1565C0] font-[600]'>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category quick links */}
          {categories.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/productListing?category=${cat.id}`)}
              className='flex-shrink-0 px-3.5 py-3 text-[13px] font-[500] text-white/80 hover:text-white border-b-2 border-transparent hover:border-white/30 transition-colors whitespace-nowrap'
            >
              {cat.name}
            </button>
          ))}

          <div className='flex-1' />

          {/* View All */}
          <Link
            href='/productListing'
            className='flex-shrink-0 px-4 py-3 text-[13px] font-[700] text-yellow-300 hover:text-yellow-200 whitespace-nowrap transition-colors'
          >
            View All →
          </Link>

        </div>
      </div>
    </nav>
  );
};

export default Navigation;
