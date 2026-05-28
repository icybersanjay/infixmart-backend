"use client";
import React, { useEffect, useRef, useState } from 'react';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import { FiArrowRight, FiClock } from 'react-icons/fi';
import { IoMdTime } from 'react-icons/io';
import { MdOutlineArticle } from 'react-icons/md';

const FALLBACK_IMG = 'https://serviceapi.spicezgold.com/download/1741759053899_5-2.jpg';

const fmt = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const readingTime = (content) => {
  const text = String(content || '').replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

/* Observes a grid container; when visible adds .is-visible to all children */
function useRevealGrid() {
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
      { threshold: 0.04 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Featured (first post hero card) ──────────────────────────────────────── */
const FeaturedCard = ({ blog }) => {
  const mins = readingTime(blog.content);
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className='group relative block overflow-hidden rounded-2xl mb-10 h-[280px] sm:h-[400px] shadow-lg hover:shadow-2xl transition-all duration-500'
    >
      <img
        src={imgUrl(blog.image) || FALLBACK_IMG}
        alt={blog.title}
        className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
        onError={(e) => { e.target.src = FALLBACK_IMG; }}
      />
      <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent' />

      {/* Featured badge */}
      <div className='absolute top-4 left-4 z-10'>
        <span className='bg-[#1565C0] text-white text-[11px] font-[700] px-3 py-1.5 rounded-full uppercase tracking-wide shadow-lg'>
          Featured
        </span>
      </div>

      {/* Content */}
      <div className='absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10'>
        <h2 className='text-white text-[18px] sm:text-[24px] font-[800] leading-tight mb-2.5 line-clamp-2 group-hover:text-blue-200 transition-colors duration-300'>
          {blog.title}
        </h2>
        {blog.excerpt && (
          <p className='text-white/70 text-[13px] sm:text-[14px] line-clamp-2 mb-4 leading-relaxed'>{blog.excerpt}</p>
        )}
        <div className='flex items-center flex-wrap gap-x-3 gap-y-1 text-white/60 text-[12px] font-[500]'>
          <span className='font-[700] text-white/90'>{blog.author}</span>
          <span>·</span>
          <span className='flex items-center gap-1'><FiClock className='text-[11px]' /> {mins} min read</span>
          <span>·</span>
          <span>{fmt(blog.createdAt)}</span>
        </div>
      </div>

      {/* Arrow reveal on hover */}
      <div className='absolute right-6 bottom-6 sm:right-8 sm:bottom-8 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 shadow-lg z-10'>
        <FiArrowRight className='text-[#1565C0] text-[16px]' />
      </div>
    </Link>
  );
};

/* ── Regular blog card ─────────────────────────────────────────────────────── */
const BlogCard = ({ blog, delay = 0 }) => {
  const mins = readingTime(blog.content);
  return (
    <div
      className='infix-reveal group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col'
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Image */}
      <div className='relative overflow-hidden bg-gray-100' style={{ height: 188 }}>
        <img
          src={imgUrl(blog.image) || FALLBACK_IMG}
          alt={blog.title}
          className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
          onError={(e) => { e.target.src = FALLBACK_IMG; }}
        />
        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300' />
        <div className='absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-[700] px-2 py-1 rounded-full flex items-center gap-1'>
          <FiClock className='text-[10px]' /> {mins} min
        </div>
      </div>

      {/* Body */}
      <div className='p-5 flex flex-col flex-1'>
        <p className='text-[10px] text-[#1565C0] font-[700] uppercase tracking-widest mb-2'>{blog.author}</p>
        <h3 className='text-[14px] font-[800] text-gray-900 mb-2 line-clamp-2 leading-snug flex-1 group-hover:text-[#1565C0] transition-colors duration-200'>
          <Link href={`/blog/${blog.slug}`}>{blog.title}</Link>
        </h3>
        {blog.excerpt && (
          <p className='text-[12.5px] text-gray-500 line-clamp-2 leading-5 mb-3'>{blog.excerpt}</p>
        )}
        <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
          <span className='text-[11px] text-gray-400 flex items-center gap-1'>
            <IoMdTime className='text-[12px]' /> {fmt(blog.createdAt)}
          </span>
          <Link
            href={`/blog/${blog.slug}`}
            className='inline-flex items-center gap-1.5 text-[11px] font-[700] text-[#1565C0] bg-[#EEF4FF] hover:bg-[#1565C0] hover:text-white px-3 py-1.5 rounded-full transition-colors duration-200'
          >
            Read <FiArrowRight className='text-[12px]' />
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ── Loading skeleton ──────────────────────────────────────────────────────── */
const BlogSkeleton = () => (
  <div className='bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse'>
    <div className='bg-gray-200' style={{ height: 188 }} />
    <div className='p-5 space-y-2.5'>
      <div className='h-2 bg-gray-200 rounded w-1/4' />
      <div className='h-4 bg-gray-200 rounded w-3/4' />
      <div className='h-3 bg-gray-200 rounded w-full' />
      <div className='h-3 bg-gray-200 rounded w-2/3' />
      <div className='flex justify-between items-center pt-2 border-t border-gray-100'>
        <div className='h-3 bg-gray-200 rounded w-1/4' />
        <div className='h-6 bg-gray-200 rounded-full w-1/5' />
      </div>
    </div>
  </div>
);

/* ── Main page ─────────────────────────────────────────────────────────────── */
const BlogListing = () => {
  const [blogs, setBlogs] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 9;
  const gridRef = useRevealGrid();

  useEffect(() => {
    setBlogs(null);
    getData(`/api/blog?page=${page}&perPage=${perPage}`).then((res) => {
      if (res && !res.error) {
        setBlogs(res.blogs || []);
        setTotal(res.total || 0);
      } else {
        setBlogs([]);
      }
    });
  }, [page]);

  const totalPages = Math.ceil(total / perPage);
  const featured = blogs?.[0];
  const rest = blogs?.slice(1) ?? [];

  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'InfixMart Blog',
    description: 'Tips, guides, and news from InfixMart — your wholesale partner.',
    blogPost: (blogs || []).map((blog) => ({
      '@type': 'BlogPosting',
      headline: blog.title,
      url: `/blog/${blog.slug}`,
      datePublished: blog.createdAt,
      author: { '@type': 'Person', name: blog.author },
    })),
  };

  return (
    <section className='min-h-screen bg-[#F5F7FF]'>
      <SEO
        title='Blog'
        description='Tips, guides, and news from InfixMart — your wholesale partner.'
        url='/blog'
        structuredData={blogStructuredData}
      />

      {/* ── Page header ── */}
      <div className='bg-white border-b border-gray-100'>
        <div className='container py-10 sm:py-14'>
          <p className='text-[11px] font-[800] uppercase tracking-[4px] text-[#1565C0] mb-2'>InfixMart Blog</p>
          <h1 className='text-[28px] sm:text-[38px] font-[900] text-gray-900 tracking-tight leading-none mb-3'>
            Tips, Guides &amp;{' '}
            <span className='text-[#1565C0]'>Insights</span>
          </h1>
          <p className='text-[14px] text-gray-500 max-w-lg leading-relaxed'>
            Everything you need to know about wholesale buying, reselling, and growing your business in India.
          </p>
          {total > 0 && (
            <div className='flex items-center gap-2 mt-4'>
              <span className='inline-flex items-center gap-1.5 bg-[#EEF4FF] text-[#1565C0] text-[12px] font-[700] px-3 py-1 rounded-full'>
                <MdOutlineArticle className='text-[14px]' />
                {total} article{total !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className='container py-10'>
        {blogs === null ? (
          /* Loading */
          <div>
            <div className='h-[280px] sm:h-[400px] bg-gray-200 rounded-2xl mb-10 animate-pulse' />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {Array.from({ length: 6 }).map((_, i) => <BlogSkeleton key={i} />)}
            </div>
          </div>
        ) : blogs.length === 0 ? (
          /* Empty */
          <div className='text-center py-24'>
            <div className='w-16 h-16 bg-[#EEF4FF] rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <MdOutlineArticle className='text-[32px] text-[#1565C0]' />
            </div>
            <h2 className='text-[20px] font-[800] text-gray-700 mb-2'>No posts yet</h2>
            <p className='text-[14px] text-gray-400'>Check back soon — articles are on the way!</p>
          </div>
        ) : (
          <>
            {/* Featured — only on page 1 */}
            {featured && page === 1 && <FeaturedCard blog={featured} />}

            {/* Posts grid */}
            <div ref={gridRef} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {(page === 1 ? rest : blogs).map((blog, i) => (
                <BlogCard key={blog.id} blog={blog} delay={Math.min(i, 5) * 80} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex justify-center items-center gap-2 mt-12'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='w-9 h-9 rounded-full flex items-center justify-center text-[18px] border border-gray-200 text-gray-500 hover:border-[#1565C0] hover:text-[#1565C0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-9 h-9 rounded-full text-[13px] font-[700] transition-colors ${
                      n === page
                        ? 'bg-[#1565C0] text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='w-9 h-9 rounded-full flex items-center justify-center text-[18px] border border-gray-200 text-gray-500 hover:border-[#1565C0] hover:text-[#1565C0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default BlogListing;
