import React from 'react';
import { IoMdTime } from 'react-icons/io';
import { IoIosArrowForward } from 'react-icons/io';
import Link from 'next/link';
import { imgUrl } from '../../utils/imageUrl';

const FALLBACK_IMG = 'https://serviceapi.spicezgold.com/download/1741759053899_5-2.jpg';

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const BlogItem = ({ blog }) => {
  const title   = blog?.title    || 'Sustainable living through cutting-edge technology';
  const excerpt = blog?.excerpt  || 'Tips and guides on how to make the most of your InfixMart purchases...';
  const date    = blog?.createdAt ? fmt(blog.createdAt) : '4 Oct 2024';
  const image   = blog?.image    ? imgUrl(blog.image) : FALLBACK_IMG;
  const link    = blog?.slug     ? `/blog/${blog.slug}` : '/blog';

  return (
    <div className='blogItem group'>
      <div className='relative w-full overflow-hidden rounded-xl imgWrapper'>
        <img
          src={image}
          alt={title}
          className='w-full h-[200px] object-cover transition-all duration-500 cursor-pointer group-hover:scale-105'
        />
        <span className='absolute font-[600] gap-1 rounded-full px-3 py-1.5 text-[11px] bottom-3 right-3 z-50 flex items-center justify-center text-white bg-[#1565C0]'>
          <IoMdTime className='text-[13px]' /> {date}
        </span>
      </div>

      <div className='py-4 info'>
        <h2 className='text-[15px] font-[700] text-gray-800 mb-2 line-clamp-2 leading-snug'>
          <Link href={link} className='hover:text-[#1565C0] transition-colors'>
            {title}
          </Link>
        </h2>
        <p className='text-[13px] text-gray-500 mb-3 line-clamp-2 leading-5'>
          {excerpt}
        </p>
        <Link
          href={link}
          className='flex items-center gap-1 font-[600] text-[13px] text-[#1565C0] hover:underline'
        >
          Read More <IoIosArrowForward />
        </Link>
      </div>
    </div>
  );
};

export default BlogItem;
