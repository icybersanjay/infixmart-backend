"use client";
import React, { useEffect, useState } from 'react';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import { IoMdTime } from 'react-icons/io';
import { IoArrowBack } from 'react-icons/io5';
import { stripHtml } from '../../utils/html';

const fmt = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const BlogDetail = () => {
  const { slug } = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    getData(`/api/blog/${slug}`)
      .then((res) => {
        if (res && !res.error && res.blog) {
          setBlog(res.blog);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <section className='py-10 bg-[#F5F7FF] min-h-screen'>
        <div className='container max-w-3xl mx-auto animate-pulse'>
          <div className='h-6 bg-gray-200 rounded w-1/4 mb-6' />
          <div className='h-[340px] bg-gray-200 rounded-xl mb-6' />
          <div className='h-8 bg-gray-200 rounded w-3/4 mb-3' />
          <div className='h-4 bg-gray-200 rounded w-1/3 mb-6' />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className='h-3 bg-gray-200 rounded mb-2' />
          ))}
        </div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className='py-20 text-center bg-[#F5F7FF] min-h-screen'>
        <SEO title='Blog Not Found' url='/blog' noIndex />
        <p className='text-[3rem] mb-3'>404</p>
        <h2 className='text-[20px] font-[700] text-gray-700 mb-2'>Blog post not found</h2>
        <Link href='/blog' className='text-[#1565C0] font-[600] hover:underline text-[14px]'>
          Back to Blog
        </Link>
      </section>
    );
  }

  const blogDescription = stripHtml(blog.excerpt || blog.content || '').slice(0, 155);
  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blogDescription || blog.title,
    image: blog.image ? [imgUrl(blog.image)] : undefined,
    author: {
      '@type': 'Person',
      name: blog.author || 'InfixMart Team',
    },
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    mainEntityOfPage: `/blog/${blog.slug}`,
  };
  const blogBreadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: '/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: '/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: blog.title,
        item: `/blog/${blog.slug}`,
      },
    ],
  };

  return (
    <section className='py-10 bg-[#F5F7FF] min-h-screen'>
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
      <div className='container max-w-3xl mx-auto'>
        <button
          onClick={() => router.push(-1)}
          className='flex items-center gap-1.5 text-[13px] font-[600] text-[#1565C0] mb-6 hover:underline'
        >
          <IoArrowBack /> Back to Blog
        </button>

        {blog.image && (
          <div className='w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-6 shadow-md'>
            <img src={imgUrl(blog.image)} alt={blog.title} className='w-full h-full object-cover' />
          </div>
        )}

        <div className='flex items-center gap-3 mb-3 flex-wrap'>
          <span className='bg-[#EEF4FF] text-[#1565C0] text-[12px] font-[700] px-3 py-1 rounded-full'>
            {blog.author}
          </span>
          <span className='flex items-center gap-1 text-[12px] text-gray-400'>
            <IoMdTime /> {fmt(blog.createdAt)}
          </span>
        </div>

        <h1 className='text-[24px] md:text-[30px] font-[800] text-gray-900 mb-4 leading-tight'>
          {blog.title}
        </h1>

        {blog.excerpt && (
          <p className='text-[15px] text-gray-500 border-l-4 border-[#1565C0] pl-4 mb-6 italic leading-6'>
            {blog.excerpt}
          </p>
        )}

        <hr className='border-gray-200 mb-6' />

        <div className='prose prose-sm max-w-none text-gray-700 leading-7 text-[15px] whitespace-pre-wrap'>
          {blog.content || <span className='text-gray-400 italic'>No content yet.</span>}
        </div>

        <div className='mt-10 pt-6 border-t border-gray-200'>
          <Link
            href='/blog'
            className='inline-flex items-center gap-2 text-[13px] font-[600] text-[#1565C0] border border-[#1565C0] px-5 py-2.5 rounded-full hover:bg-[#1565C0] hover:text-white transition-colors'
          >
            All Blog Posts
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogDetail;
