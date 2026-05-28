"use client";
import React, { useEffect, useState } from 'react';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import { FiClock, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { IoMdTime } from 'react-icons/io';
import { stripHtml, sanitizeHtml } from '../../utils/html';

const fmt = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const readingTime = (content) => {
  const text = String(content || '').replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const BlogDetail = () => {
  const { slug } = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    getData(`/api/blog/${slug}`)
      .then((res) => {
        if (res && !res.error && res.blog) {
          setBlog(res.blog);
          const cat = res.blog.catName;
          if (cat) {
            getData(`/api/product?search=${encodeURIComponent(cat)}&perPage=4`).then((r) => {
              if (r && !r.error) setRelatedProducts(r.products || []);
            });
          }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <section className='py-10 bg-[#F5F7FF] min-h-screen'>
        <div className='container max-w-3xl mx-auto animate-pulse'>
          <div className='h-5 bg-gray-200 rounded w-28 mb-8' />
          <div className='h-[300px] sm:h-[400px] bg-gray-200 rounded-2xl mb-8' />
          <div className='flex gap-3 mb-5'>
            <div className='h-7 bg-gray-200 rounded-full w-28' />
            <div className='h-7 bg-gray-200 rounded-full w-36' />
          </div>
          <div className='h-9 bg-gray-200 rounded w-3/4 mb-2' />
          <div className='h-6 bg-gray-200 rounded w-1/2 mb-8' />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='h-3 bg-gray-200 rounded mb-2.5' style={{ width: i % 3 === 2 ? '70%' : '100%' }} />
          ))}
        </div>
      </section>
    );
  }

  /* ── Not found ── */
  if (notFound) {
    return (
      <section className='py-20 text-center bg-[#F5F7FF] min-h-screen'>
        <SEO title='Blog Not Found' url='/blog' noIndex />
        <div className='w-16 h-16 bg-[#EEF4FF] rounded-2xl flex items-center justify-center mx-auto mb-4'>
          <span className='text-[28px]'>📄</span>
        </div>
        <h2 className='text-[20px] font-[800] text-gray-700 mb-2'>Post not found</h2>
        <p className='text-[14px] text-gray-400 mb-6'>This article may have been moved or deleted.</p>
        <Link href='/blog' className='inline-flex items-center gap-2 text-[13px] font-[700] text-[#1565C0] bg-[#EEF4FF] px-5 py-2.5 rounded-full hover:bg-[#1565C0] hover:text-white transition-colors'>
          <FiArrowLeft /> Back to Blog
        </Link>
      </section>
    );
  }

  const mins = readingTime(blog.content);
  const blogDescription = stripHtml(blog.excerpt || blog.content || '').slice(0, 155);

  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blogDescription || blog.title,
    image: blog.image ? [imgUrl(blog.image)] : undefined,
    author: { '@type': 'Person', name: blog.author || 'InfixMart Team' },
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    mainEntityOfPage: `/blog/${blog.slug}`,
  };
  const blogBreadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: '/blog' },
      { '@type': 'ListItem', position: 3, name: blog.title, item: `/blog/${blog.slug}` },
    ],
  };

  return (
    <section className='min-h-screen bg-[#F5F7FF]'>
      <SEO
        title={blog.title}
        description={blogDescription}
        image={blog.image ? imgUrl(blog.image) : undefined}
        url={`/blog/${blog.slug}`}
        type='article'
        author={blog.author}
        publishedTime={blog.createdAt}
        modifiedTime={blog.updatedAt || blog.createdAt}
        structuredData={[blogStructuredData, blogBreadcrumbs]}
      />

      {/* ── Hero image ── */}
      {blog.image && (
        <div className='w-full h-[260px] sm:h-[420px] overflow-hidden relative'>
          <img
            src={imgUrl(blog.image)}
            alt={blog.title}
            className='w-full h-full object-cover'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-[#F5F7FF] via-transparent to-transparent' />
        </div>
      )}

      <div className='container max-w-3xl mx-auto py-8 sm:py-10'>

        {/* ── Back link ── */}
        <Link
          href='/blog'
          className='inline-flex items-center gap-1.5 text-[13px] font-[600] text-[#1565C0] hover:text-[#0D47A1] mb-6 group'
        >
          <FiArrowLeft className='group-hover:-translate-x-0.5 transition-transform' />
          Back to Blog
        </Link>

        {/* ── Article card ── */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>

          {/* Header */}
          <div className='px-6 sm:px-10 pt-8 sm:pt-10 pb-6'>
            {/* Meta chips */}
            <div className='flex items-center flex-wrap gap-2 mb-4'>
              <span className='bg-[#EEF4FF] text-[#1565C0] text-[12px] font-[700] px-3 py-1 rounded-full'>
                {blog.author}
              </span>
              <span className='flex items-center gap-1 text-[12px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full'>
                <IoMdTime className='text-[13px]' /> {fmt(blog.createdAt)}
              </span>
              <span className='flex items-center gap-1 text-[12px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full'>
                <FiClock className='text-[12px]' /> {mins} min read
              </span>
            </div>

            {/* Title */}
            <h1 className='text-[22px] sm:text-[30px] font-[900] text-gray-900 leading-tight tracking-tight mb-4'>
              {blog.title}
            </h1>

            {/* Excerpt */}
            {blog.excerpt && (
              <p className='text-[14px] sm:text-[15px] text-gray-500 border-l-4 border-[#1565C0] pl-4 py-1 italic leading-6 bg-[#F8FAFF] rounded-r-xl'>
                {blog.excerpt}
              </p>
            )}
          </div>

          <hr className='border-gray-100 mx-6 sm:mx-10' />

          {/* ── Body ── */}
          <div className='px-6 sm:px-10 py-8'>
            {blog.content ? (
              <div
                className='blog-prose'
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(blog.content) }}
              />
            ) : (
              <p className='text-gray-400 italic text-[14px]'>No content yet.</p>
            )}
          </div>

          {/* ── Related products ── */}
          {relatedProducts.length > 0 && (
            <div className='px-6 sm:px-10 pb-8'>
              <hr className='border-gray-100 mb-6' />
              <h3 className='text-[15px] font-[800] text-gray-800 mb-4 flex items-center gap-2'>
                🛍️ Shop Related Products
              </h3>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                {relatedProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug || p.id}`}
                    className='group bg-[#F8FAFF] border border-gray-100 rounded-xl p-3 hover:border-[#1565C0]/30 hover:shadow-md transition-all duration-200'
                  >
                    <div className='w-full aspect-square bg-white rounded-lg overflow-hidden mb-2'>
                      <img
                        src={imgUrl(p.images?.[0])}
                        alt={p.name}
                        className='w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300'
                      />
                    </div>
                    <p className='text-[12px] font-[600] text-gray-700 line-clamp-2 leading-snug'>{p.name}</p>
                    <p className='text-[13px] font-[800] text-[#1565C0] mt-1'>
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer nav ── */}
          <div className='px-6 sm:px-10 pb-8'>
            <hr className='border-gray-100 mb-6' />
            <div className='flex items-center justify-between'>
              <Link
                href='/blog'
                className='inline-flex items-center gap-2 text-[13px] font-[700] text-[#1565C0] border border-[#1565C0] px-5 py-2.5 rounded-full hover:bg-[#1565C0] hover:text-white transition-colors duration-200'
              >
                <FiArrowLeft /> All Posts
              </Link>
              <Link
                href='/productListing'
                className='inline-flex items-center gap-2 text-[13px] font-[700] text-white bg-[#1565C0] px-5 py-2.5 rounded-full hover:bg-[#0D47A1] transition-colors duration-200 shadow-md'
              >
                Shop Now <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogDetail;
