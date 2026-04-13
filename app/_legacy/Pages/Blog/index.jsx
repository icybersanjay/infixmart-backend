"use client";
import React, { useEffect, useState } from 'react';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import { IoMdTime } from 'react-icons/io';
import { IoIosArrowForward } from 'react-icons/io';

const fmt = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const BlogCard = ({ blog }) => (
  <div className='group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300'>
    <div className='relative overflow-hidden h-[200px] bg-gray-100'>
      <img
        src={imgUrl(blog.image) || 'https://serviceapi.spicezgold.com/download/1741759053899_5-2.jpg'}
        alt={blog.title}
        className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
      />
      <span className='absolute bottom-3 right-3 bg-[#1565C0] text-white text-[11px] font-[600] px-2.5 py-1 rounded-full flex items-center gap-1'>
        <IoMdTime className='text-[13px]' />
        {fmt(blog.createdAt)}
      </span>
    </div>
    <div className='p-4'>
      <p className='text-[11px] text-[#1565C0] font-[700] uppercase tracking-wider mb-1'>{blog.author}</p>
      <h2 className='text-[15px] font-[700] text-gray-800 mb-2 line-clamp-2 leading-snug'>
        <Link href={`/blog/${blog.slug}`} className='hover:text-[#1565C0] transition-colors'>
          {blog.title}
        </Link>
      </h2>
      {blog.excerpt ? (
        <p className='text-[13px] text-gray-500 mb-3 line-clamp-2 leading-5'>{blog.excerpt}</p>
      ) : null}
      <Link
        href={`/blog/${blog.slug}`}
        className='inline-flex items-center gap-1 text-[13px] font-[600] text-[#1565C0] hover:underline'
      >
        Read More <IoIosArrowForward />
      </Link>
    </div>
  </div>
);

const BlogSkeleton = () => (
  <div className='bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse'>
    <div className='h-[200px] bg-gray-200' />
    <div className='p-4 space-y-2'>
      <div className='h-3 bg-gray-200 rounded w-1/4' />
      <div className='h-4 bg-gray-200 rounded w-3/4' />
      <div className='h-3 bg-gray-200 rounded w-full' />
      <div className='h-3 bg-gray-200 rounded w-2/3' />
    </div>
  </div>
);

const BlogListing = () => {
  const [blogs, setBlogs] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 9;

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
  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'InfixMart Blog',
    description: 'Tips, guides, and news from InfixMart - your wholesale partner.',
    blogPost: (blogs || []).map((blog) => ({
      '@type': 'BlogPosting',
      headline: blog.title,
      url: `/blog/${blog.slug}`,
      datePublished: blog.createdAt,
      author: {
        '@type': 'Person',
        name: blog.author,
      },
    })),
  };

  return (
    <section className='py-10 bg-[#F5F7FF] min-h-screen'>
      <SEO
        title='Blog'
        description='Tips, guides, and news from InfixMart - your wholesale partner.'
        url='/blog'
        structuredData={blogStructuredData}
      />
      <div className='container'>
        <div className='mb-8'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='w-1 h-5 bg-[#1565C0] rounded-full block' />
            <h1 className='text-[24px] font-[700] text-gray-900'>Our Blog</h1>
          </div>
          <p className='text-[14px] text-gray-400 ml-3'>Tips, guides and product highlights from InfixMart</p>
        </div>

        {blogs === null ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {Array.from({ length: 6 }).map((_, index) => <BlogSkeleton key={index} />)}
          </div>
        ) : blogs.length === 0 ? (
          <div className='text-center py-20 text-gray-400'>
            <p className='text-[3rem] mb-3'>404</p>
            <p className='font-[600] text-[18px]'>No blog posts yet</p>
            <p className='text-[14px]'>Check back soon!</p>
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)}
            </div>

            {totalPages > 1 ? (
              <div className='flex justify-center gap-2 mt-10'>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    onClick={() => setPage(value)}
                    className={`w-9 h-9 rounded-full text-[13px] font-[600] transition-colors ${
                      value === page
                        ? 'bg-[#1565C0] text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0]'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
};

export default BlogListing;
