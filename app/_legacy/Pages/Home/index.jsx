"use client";
/**
 * Home — InfixMart Enhanced
 *
 * Every section is 100% driven by the admin panel via /api/homepage/:section
 * and /api/homepage/section_config. Nothing is hard-coded except loading states.
 */

import React, { useState, useEffect, useRef } from 'react';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeroSlider from '../../components/HeroSlider';
import ProductItem from '../../components/ProductItem';
import BlogItem from '../../components/BLogItem';
import EmptyState from '../../components/EmptyState';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation, Autoplay } from 'swiper/modules';
import { getData } from '../../utils/api';
import ProductCardSkeleton from '../../components/skeletons/ProductCardSkeleton';
import { buildAbsoluteUrl } from '../../utils/siteMeta';

import { MdLocalShipping, MdVerified } from 'react-icons/md';
import { FaShieldAlt, FaUndo, FaFire } from 'react-icons/fa';
import { BsBoxSeam, BsPatchCheckFill } from 'react-icons/bs';
import { TbPackage, TbTruckDelivery } from 'react-icons/tb';
import { IoIosArrowRoundForward } from 'react-icons/io';
import { HiOutlineMail } from 'react-icons/hi';

const ICON_MAP = {
  MdLocalShipping: <MdLocalShipping className='text-[2.2rem]' />,
  MdVerified: <MdVerified className='text-[2.2rem]' />,
  FaShieldAlt: <FaShieldAlt className='text-[2rem]' />,
  FaUndo: <FaUndo className='text-[2rem]' />,
  BsBoxSeam: <BsBoxSeam className='text-[2rem] text-sky-400' />,
  BsPatchCheckFill: <BsPatchCheckFill className='text-[2rem] text-sky-400' />,
  TbPackage: <TbPackage className='text-[2rem] text-sky-400' />,
  TbTruckDelivery: <TbTruckDelivery className='text-[2rem] text-sky-400' />,
};

const parseMeta = (item) => {
  try { return item.meta ? JSON.parse(item.meta) : {}; } catch { return {}; }
};

/* ── Enhanced Section Header ─────────────────────────────────────────────── */
const SectionHead = ({ tag, title, accent, sub, viewAll, tight = false }) => (
  <div className={`flex items-end justify-between ${tight ? 'mb-4 sm:mb-6' : 'mb-8 sm:mb-10'}`}>
    <div>
      {tag && <p className='text-[12px] font-[800] uppercase tracking-[4px] text-blue-600 mb-2'>{tag}</p>}
      <h2 className='text-[28px] md:text-[36px] font-[900] text-slate-900 tracking-tight leading-none'>
        {title}{accent && <span className='text-blue-600'> {accent}</span>}
      </h2>
      {sub && <p className='text-[15px] text-slate-500 mt-3 font-medium'>{sub}</p>}
    </div>
    {viewAll && (
      <Link href={viewAll} className='group flex items-center gap-1 text-[14px] font-[700] text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap ml-4 flex-shrink-0'>
        View All <IoIosArrowRoundForward className='text-[24px] group-hover:translate-x-1.5 transition-transform' />
      </Link>
    )}
  </div>
);

const toSlug = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* Observes a grid container; when it enters the viewport all direct
   children with `.infix-reveal` get `.is-visible` added (one-shot). */
function useRevealGrid(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          Array.from(el.children).forEach((c) => c.classList.add('is-visible'));
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const CAT_BG = [
  '#EEF4FF', '#FFF3E0', '#E8F5E9', '#F3E5F5',
  '#FCE4EC', '#E0F2F1', '#F9FBE7', '#E8EAF6',
  '#FBE9E7', '#E1F5FE',
];

/* Resolve a category's icon — returns { type:'emoji'|'img'|'letter', value:string } */
const resolveCatIcon = (cat) => {
  const raw = cat?.images?.[0];
  if (!raw) return { type: 'letter', value: (cat?.name || '?').charAt(0).toUpperCase() };
  if (raw.startsWith('emoji:')) return { type: 'emoji', value: raw.slice(6) };
  return { type: 'img', value: raw };
};

/* 1. Category Strip ─────────────────────────────────────────────────────────── */
const CategoryGrid = ({ initialCategories = null }) => {
  const seeded = Array.isArray(initialCategories) && initialCategories.length > 0;
  const [cats, setCats] = useState(seeded ? initialCategories.slice(0, 12) : []);
  const [loaded, setLoaded] = useState(seeded);
  const router = useRouter();

  useEffect(() => {
    if (seeded) return;
    getData('/api/category').then((res) => {
      if (res && !res.error) {
        const data = res.categories || res.data || [];
        setCats(Array.isArray(data) ? data.slice(0, 12) : []);
      }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, [seeded]);

  if (loaded && cats.length === 0) return null;

  const tiles = cats.length > 0 ? cats : Array(8).fill(null);

  return (
    <section className='py-6 sm:py-8 bg-white overflow-hidden'>
      <div className='container'>
        <SectionHead tag='Browse' title='Shop by' accent='Category' viewAll='/productListing' tight />
        <Swiper
          modules={[Autoplay]}
          loop
          autoplay={{ delay: 2000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          speed={500}
          slidesPerView={3.5}
          spaceBetween={10}
          breakpoints={{
            480: { slidesPerView: 4.5, spaceBetween: 10 },
            640: { slidesPerView: 5.5, spaceBetween: 12 },
            900: { slidesPerView: 7,   spaceBetween: 12 },
            1200: { slidesPerView: 8,  spaceBetween: 14 },
          }}
        >
          {tiles.map((cat, i) => {
            const bg = CAT_BG[i % CAT_BG.length];
            const icon = cat ? resolveCatIcon(cat) : null;
            return (
              <SwiperSlide key={cat?.id ?? `cat-${i}`}>
                {cat ? (
                  <button
                    onClick={() => router.push(`/category/${toSlug(cat.name)}`)}
                    className='flex flex-col items-center justify-center gap-2 p-3 rounded-2xl w-full h-[88px] cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-md transition-all duration-200'
                    style={{ background: bg }}
                  >
                    {icon.type === 'img' ? (
                      <img
                        src={icon.value}
                        alt={cat.name}
                        className='w-9 h-9 object-contain flex-shrink-0'
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : icon.type === 'emoji' ? (
                      <span className='text-[1.9rem] leading-none flex-shrink-0'>{icon.value}</span>
                    ) : (
                      <span className='w-9 h-9 rounded-full bg-white/70 flex items-center justify-center text-[15px] font-[800] text-gray-600 flex-shrink-0'>
                        {icon.value}
                      </span>
                    )}
                    <p className='text-[11px] font-[700] text-center line-clamp-2 leading-tight w-full text-gray-700'>{cat.name}</p>
                  </button>
                ) : (
                  <div className='flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 animate-pulse h-[88px]'>
                    <div className='w-9 h-9 bg-slate-200 rounded-xl flex-shrink-0' />
                    <div className='w-14 h-2 bg-slate-200 rounded' />
                  </div>
                )}
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
};

/* 2. Shop by Price ─────────────────────────────────────────────────────────── */
const ShopByPrice = ({ items }) => {
  const router = useRouter();
  if (!items || items.length === 0) return null;
  return (
    <section className='py-6 sm:py-8 bg-slate-50 overflow-hidden'>
      <div className='container'>
        <SectionHead tag='Best Value' title='Find Your Perfect' accent='Deal' sub='Shop smarter — filter exactly by your budget' tight />
        <Swiper
          modules={[Autoplay, Navigation]}
          loop
          autoplay={{ delay: 2500, disableOnInteraction: false, pauseOnMouseEnter: true }}
          speed={500}
          navigation
          slidesPerView={2}
          spaceBetween={12}
          breakpoints={{
            480: { slidesPerView: 2.5, spaceBetween: 12 },
            640: { slidesPerView: 3,   spaceBetween: 14 },
            900: { slidesPerView: 4,   spaceBetween: 16 },
            1200: { slidesPerView: 5,  spaceBetween: 16 },
          }}
          className='!pb-1'
        >
          {items.map((tier, index) => {
            const meta = parseMeta(tier);
            return (
              <SwiperSlide key={tier.id ?? tier._id ?? tier.slug ?? tier.title ?? `price-tier-${index}`}>
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (meta.maxPrice) params.set('maxPrice', meta.maxPrice);
                    if (meta.minPrice) params.set('minPrice', meta.minPrice);
                    router.push(params.toString() ? `/productListing?${params.toString()}` : (tier.link || '/productListing'));
                  }}
                  className='group flex flex-col items-center justify-center gap-1.5 p-4 sm:p-5 rounded-2xl border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center relative overflow-hidden w-full'
                  style={{ background: tier.bgColor, borderColor: tier.badgeColor || 'transparent' }}
                >
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300' />
                  <p className='text-[11px] font-[800] uppercase tracking-wider relative z-10' style={{ color: tier.textColor, opacity: 0.8 }}>{tier.badge}</p>
                  <p className='text-[22px] sm:text-[26px] font-[900] leading-none tracking-tight relative z-10' style={{ color: tier.textColor }}>{tier.title}</p>
                  <p className='text-[11px] font-[600] leading-tight relative z-10' style={{ color: tier.textColor, opacity: 0.7 }}>{tier.subtitle}</p>
                  <span className='mt-2 text-[11px] font-[700] px-3 py-1 rounded-full inline-flex items-center gap-1 group-hover:scale-105 transition-transform' style={{ background: tier.textColor, color: '#fff' }}>
                    Explore <IoIosArrowRoundForward className='text-[14px]' />
                  </span>
                </button>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
};

/* 3. Today's Best Deals ─────────────────────────────────────────────────────── */
const TodaysBestDeals = ({ products }) => (
  <section className='py-10 sm:py-16 bg-white'>
    <div className='container'>
      <SectionHead tag="Limited Offers" title="Today's" accent='Best Deals' sub='Heavily discounted picks — updated daily for you' viewAll='/productListing' />
      {products === null ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
          {Array(5).fill(null).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title='No products available'
          subtitle='Best deals will appear here once products are added.'
        />
      ) : (
        <Swiper slidesPerView={2} spaceBetween={20} modules={[Navigation, Autoplay]} navigation autoplay={{ delay: 3500, disableOnInteraction: false }}
          breakpoints={{ 480: { slidesPerView: 2 }, 640: { slidesPerView: 3 }, 900: { slidesPerView: 4 }, 1200: { slidesPerView: 5 } }}
          className="pb-4"
        >
          {products.map((p, index) => (
            <SwiperSlide key={p.id ?? p._id ?? p.slug ?? p.name ?? `deal-product-${index}`} className="pt-2">
              <ProductItem item={p} hideRating />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
      <div className='flex justify-center mt-8'>
        <Link
          href='/productListing'
          className='inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-[800] px-8 py-3 rounded-full shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)] transition-all duration-300 group'
        >
          View All Products
          <IoIosArrowRoundForward className='text-[20px] group-hover:translate-x-1.5 transition-transform' />
        </Link>
      </div>
    </div>
  </section>
);

/* 4. Flash Deals Grid ─────────────────────────────────────────────────────── */
const FlashDealsGrid = ({ products, config }) => {
  const cfg = config || {};
  const maxPrice = parseMeta(cfg).maxPrice || 499;
  const filtered = products
    ? (products.filter((p) => Number(p.price) < maxPrice).slice(0, 20) || products.slice(0, 20))
    : null;

  return (
    <section className='py-10 sm:py-16 bg-[#FFF4F4] relative overflow-hidden'>
      {/* Decorative pulse */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className='container relative z-10'>
        <div className='flex items-end justify-between mb-10'>
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <FaFire className='text-[22px] animate-bounce' style={{ color: cfg.textColor || '#E53935' }} />
              <p className='text-[13px] font-[900] uppercase tracking-[4px]' style={{ color: cfg.textColor || '#E53935' }}>
                {cfg.badge || 'Flash Deals'}
              </p>
            </div>
            <h2 className='text-[28px] md:text-[36px] font-[900] text-slate-900 tracking-tight'>
              {cfg.title || 'Incredible Steals'} <span style={{ color: cfg.textColor || '#E53935' }}>Under ₹{maxPrice}</span>
            </h2>
            <p className='text-[15px] text-slate-500 mt-2 font-medium'>{cfg.subtitle || 'Unbeatable prices — grab them before they\'re absolutely gone!'}</p>
          </div>
          <Link href={cfg.link || `/productListing?maxPrice=${maxPrice}`} className='group flex items-center gap-1 text-[14px] font-[700] text-red-600 hover:text-red-800 transition-colors whitespace-nowrap ml-4'>
            View All <IoIosArrowRoundForward className='text-[24px] group-hover:translate-x-1.5 transition-transform' />
          </Link>
        </div>
        {filtered === null ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {Array(20).fill(null).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title='No products available'
            subtitle='Flash deals will appear here once matching products are added.'
          />
        ) : (
          <div className='infix-stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {filtered.map((p) => <ProductItem key={p.id} item={p} hideRating />)}
          </div>
        )}
      </div>
    </section>
  );
};

/* 5. Shop by Collection ─────────────────────────────────────────────────────── */
const ShopByCollection = ({ items }) => {
  const gridRef = useRevealGrid([items]);
  return (
    <section className='py-10 sm:py-16 bg-white'>
      <div className='container'>
        <SectionHead tag='Curated' title='Shop by' accent='Collection' />
        {!items || items.length === 0 ? (
          <EmptyState
            title='No products available'
            subtitle='Collections will appear here once they are configured.'
          />
        ) : (
        <div ref={gridRef} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          {items.map((col, index) => (
            <Link key={col.id ?? col._id ?? col.slug ?? col.title ?? `collection-${index}`} href={col.link || '/productListing'} className={`infix-reveal infix-d${Math.min(index + 1, 8)} group relative overflow-hidden rounded-3xl h-[280px] sm:h-[320px] shadow-sm hover:shadow-2xl transition-all duration-500 block`}>
              <img src={col.image} alt={col.title} className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110' />
              <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent' />
              {col.badge && (
                <span className='absolute top-4 left-4 text-white text-[11px] font-[800] px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md'
                  style={{ background: col.badgeColor || 'rgba(21, 101, 192, 0.9)' }}>
                  {col.badge}
                </span>
              )}
              <div className='absolute bottom-0 left-0 right-0 p-6'>
                <h3 className='text-white text-[22px] font-[800] leading-tight tracking-tight drop-shadow-sm'>{col.title}</h3>
                {col.subtitle && <p className='text-slate-200 text-[14px] mt-1 mb-4 font-medium'>{col.subtitle}</p>}
                <span className='inline-flex items-center gap-1 bg-white text-slate-900 text-[13px] font-[800] tracking-wide px-4 py-2 rounded-full group-hover:bg-[#1565C0] group-hover:text-white transition-colors duration-300'>
                  Shop Now <IoIosArrowRoundForward className='text-[20px]' />
                </span>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </section>
  );
};

/* 6. Why Choose Us ─────────────────────────────────────────────────────────── */
const WhyChooseUs = ({ items }) => {
  const gridRef = useRevealGrid([items]);
  return (
    <section className='py-12 sm:py-20 bg-slate-50 relative overflow-hidden'>
      {/* Decorative bg blobs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      <div className='container relative z-10'>
        <div className='text-center mb-12'>
          <h2 className='text-[32px] font-[900] text-slate-900'>The <span className="text-blue-600">InfixMart</span> Promise</h2>
          <p className="text-slate-500 mt-3 font-medium text-[15px]">Why thousands of businesses and shoppers trust us.</p>
        </div>
        {!items || items.length === 0 ? (
          <EmptyState
            title='No products available'
            subtitle='This section will appear once content is added.'
          />
        ) : (
        <div ref={gridRef} className='grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8'>
          {items.map((w, index) => {
            const meta = parseMeta(w);
            const icon = ICON_MAP[meta.icon] || <BsBoxSeam className='text-[2rem]' />;
            return (
              <div key={w.id ?? w._id ?? w.slug ?? w.title ?? `why-${index}`} className={`infix-reveal infix-d${Math.min(index + 1, 8)} group flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 border border-slate-100`}>
                <div className='w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 shadow-inner'
                  style={{ background: w.bgColor, color: w.textColor }}>
                  {icon}
                </div>
                <h4 className='text-[16px] font-[800] text-slate-900 mb-2'>{w.title}</h4>
                {w.subtitle && <p className='text-[13px] text-slate-500 font-medium leading-relaxed'>{w.subtitle}</p>}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
};

/* 7. Stats Bar ─────────────────────────────────────────────────────────────── */
const StatsBar = ({ items }) => {
  const gridRef = useRevealGrid([items]);
  return (
    <section className='py-10 sm:py-16' style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div className='container'>
        {!items || items.length === 0 ? (
          <EmptyState
            title='No products available'
            subtitle='Stats will appear here once content is added.'
            className='text-white'
          />
        ) : (
        <div ref={gridRef} className='grid grid-cols-2 md:grid-cols-4 gap-8'>
          {items.map((s, index) => {
            const meta = parseMeta(s);
            const icon = ICON_MAP[meta.icon] || <BsBoxSeam className='text-[2rem] text-sky-400' />;
            return (
              <div key={s.id ?? s._id ?? s.slug ?? s.title ?? `stat-${index}`} className={`infix-reveal infix-d${Math.min(index + 1, 8)} flex flex-col items-center text-center group`}>
                <div className='w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]'>
                  {icon}
                </div>
                <p className='text-[36px] md:text-[44px] font-[900] text-white leading-none tracking-tight'>{s.title}</p>
                <p className='text-sky-300 text-[14px] font-[600] mt-2 uppercase tracking-wide'>{s.subtitle}</p>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
};

/* 8. Blog Section ─────────────────────────────────────────────────────────── */
const BlogSection = ({ blogs }) => {
  return (
    <section className='py-12 sm:py-20 bg-white'>
      <div className='container'>
        <SectionHead tag='Insights' title='From the' accent='Blog' sub='Expert tips, guides & product highlights directly from us' viewAll='/blog' />
        {!blogs || blogs.length === 0 ? (
          <EmptyState
            title='No products available'
            subtitle='Blog posts will appear here once content is published.'
          />
        ) : (
          <Swiper slidesPerView={1} spaceBetween={24} modules={[Navigation, Autoplay]} navigation autoplay={{ delay: 5000, disableOnInteraction: false }}
            breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            className="pb-6"
          >
            {blogs.map((blog, i) => (
              <SwiperSlide key={blog?.id ?? blog?.slug ?? blog?.title ?? `blog-${i}`} className="pt-2">
                <BlogItem blog={blog} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
};

/* 9. Newsletter ─────────────────────────────────────────────────────────────── */
const Newsletter = ({ config }) => {
  const [email, setEmail] = useState('');
  const cfg = config || {};
  return (
    <section className='py-12 sm:py-20 border-t border-slate-200' style={{ background: cfg.bgColor || '#F8FAFC' }}>
      <div className='container'>
        <div className='max-w-3xl mx-auto text-center bg-white p-10 sm:p-14 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden'>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

          <HiOutlineMail className='text-[3.5rem] mx-auto mb-4 relative z-10' style={{ color: cfg.textColor || '#1565C0' }} />
          <h2 className='text-[28px] sm:text-[34px] font-[900] text-slate-900 mb-2 relative z-10 tracking-tight'>
            {cfg.title ? (
              cfg.title.includes('Best Deals') ? (
                <>Stay Updated on <span style={{ color: cfg.textColor || '#1565C0' }}>Best Deals</span></>
              ) : cfg.title
            ) : 'Stay Updated'}
          </h2>
          <p className='text-slate-500 text-[15px] sm:text-[16px] mb-8 font-medium relative z-10'>{cfg.subtitle || 'Subscribe to get exclusive retail & wholesale deals straight to your inbox.'}</p>
          <form onSubmit={(e) => e.preventDefault()} className='flex flex-col sm:flex-row gap-3 max-w-lg mx-auto relative z-10'>
            <input type='email' value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email address'
              className='flex-1 h-[54px] px-6 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none text-[15px] font-medium transition-colors bg-slate-50 focus:bg-white shadow-inner'
            />
            <button type='submit'
              className='h-[54px] px-8 text-white font-[800] text-[15px] rounded-2xl transition-all shadow-[0_4px_14px_rgba(21,101,192,0.4)] hover:shadow-[0_6px_20px_rgba(21,101,192,0.6)] hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap'
              style={{ background: cfg.textColor || '#1565C0' }}
            >
              Subscribe
            </button>
          </form>
          {cfg.badge && <p className='text-[13px] font-bold text-slate-400 mt-5 uppercase tracking-widest relative z-10'>{cfg.badge}</p>}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HOME
═══════════════════════════════════════════════════════════════════════════ */
const SECTION_COMPONENTS = {
  hero: ({ products, blogs, sectionData, initialSlides }) => <div className='w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[480px]'><HeroSlider initialSlides={initialSlides} /></div>,
  categories: ({ products, blogs, sectionData, initialCategories }) => <CategoryGrid initialCategories={initialCategories} />,
  price_tiers: ({ products, blogs, sectionData }) => <ShopByPrice items={sectionData.price_tiers} />,
  todays_deals: ({ products, blogs, sectionData }) => <TodaysBestDeals products={products} />,
  flash_deals: ({ products, blogs, sectionData }) => <FlashDealsGrid products={products} config={sectionData.flash_deals?.[0]} />,
  collections: ({ products, blogs, sectionData }) => <ShopByCollection items={sectionData.collection} />,
  why_choose_us: ({ products, blogs, sectionData }) => <WhyChooseUs items={sectionData.why_choose_us} />,
  stats: ({ products, blogs, sectionData }) => <StatsBar items={sectionData.stats} />,
  blog: ({ products, blogs, sectionData }) => <BlogSection blogs={blogs} />,
  newsletter: ({ products, blogs, sectionData }) => <Newsletter config={sectionData.newsletter?.[0]} />,
};

const Home = ({
  initialProducts = null,
  initialBlogs = null,
  initialCategories = null,
  initialSlides = null,
  initialSectionConfig = null,
  initialSectionData = null,
} = {}) => {
  const seededProducts = Array.isArray(initialProducts);
  const seededBlogs = Array.isArray(initialBlogs);
  const seededConfig = Array.isArray(initialSectionConfig) && initialSectionConfig.length > 0;
  const seededSectionData = initialSectionData && typeof initialSectionData === 'object';

  const [products, setProducts] = useState(seededProducts ? initialProducts : null);
  const [blogs, setBlogs] = useState(seededBlogs ? initialBlogs : []);
  const [sectionConfig, setSectionConfig] = useState(seededConfig ? initialSectionConfig : []);
  const [sectionData, setSectionData] = useState(seededSectionData ? initialSectionData : {});

  useEffect(() => {
    // Server-prefetched everything — stay quiet on first paint.
    if (seededProducts && seededBlogs && seededConfig && seededSectionData) return;

    if (!seededProducts) {
      getData('/api/product?page=1&perPage=50')
        .then((res) => { if (res && !res.error) setProducts(res.products || []); else setProducts([]); })
        .catch(() => setProducts([]));
    }

    if (!seededBlogs) {
      getData('/api/blog?perPage=6')
        .then((res) => { if (res && !res.error) setBlogs(res.blogs || []); });
    }

    if (!seededConfig) {
      getData('/api/homepage/section_config')
        .then((res) => { if (res && !res.error) setSectionConfig(res.items || []); });
    }

    if (!seededSectionData) {
      const contentSections = ['collection', 'price_tiers', 'why_choose_us', 'stats', 'newsletter', 'flash_deals'];
      Promise.all(contentSections.map((s) => getData(`/api/homepage/${s}`).then((r) => ({ key: s, items: r?.items || [] }))))
        .then((results) => {
          const data = {};
          results.forEach(({ key, items }) => { data[key] = items; });
          setSectionData(data);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort visible sections by admin-defined order
  const visibleSections = sectionConfig
    .filter((s) => s.isActive)
    .sort((a, b) => a.order - b.order);

  // Fallback: if section_config hasn't loaded yet, show all in default order
  const sectionsToRender = visibleSections.length > 0
    ? visibleSections
    : Object.keys(SECTION_COMPONENTS).map((key, i) => ({ key, order: i }));
  const homeStructuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'InfixMart Wholesale',
      url: buildAbsoluteUrl('/'),
      logo: buildAbsoluteUrl('/images/strechBanner.png'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'InfixMart Wholesale',
      url: buildAbsoluteUrl('/'),
      potentialAction: {
        '@type': 'SearchAction',
        target: `${buildAbsoluteUrl('/productListing')}?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <main className="font-['Inter',_sans-serif] bg-slate-50">
      {/* Screen-reader h1 — keeps heading hierarchy valid for SEO without visual impact */}
      <h1 className='sr-only'>InfixMart — India&apos;s Wholesale Marketplace</h1>
      <SEO
        description="India's trusted wholesale store — buy single pieces or bulk at best prices. 10,000+ genuine products across all categories."
        url="/"
        structuredData={homeStructuredData}
      />
      {sectionsToRender.map((section) => {
        const Component = SECTION_COMPONENTS[section.key];
        if (!Component) return null;
        return (
          <React.Fragment key={section.key}>
            {Component({ products, blogs, sectionData, initialSlides, initialCategories })}
          </React.Fragment>
        );
      })}
    </main>
  );
};

export default Home;
