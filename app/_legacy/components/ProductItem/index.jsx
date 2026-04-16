"use client";

import React, { useContext } from 'react';
import Link from 'next/link';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { MdOutlineShoppingCart, MdZoomOutMap } from 'react-icons/md';
import { MyContext } from '../../LegacyProviders';
import { imgUrl } from '../../utils/imageUrl';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const ProductItem = ({ item }) => {
  const context = useContext(MyContext);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  if (!item) return null;

  const primaryImg  = imgUrl(item.images?.[0]);
  const hoverImg    = imgUrl(item.images?.[1] || item.images?.[0]);
  const productLink = `/product/${item.id}`;
  const wishlisted  = isWishlisted(item.id);
  const outOfStock  = Number(item.countInStock) === 0;
  const discountPct = Number(item.discount) || 0;
  const isNew       = item.createdAt
    ? (Date.now() - new Date(item.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className='group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1565C0]/30 hover:shadow-xl transition-all duration-300 flex flex-col'>

      {/* ── Image area ── */}
      <div className='relative overflow-hidden bg-[#F8FAFF]' style={{ aspectRatio: '3/4' }}>

        {/* Discount badge — top left, big and bold like 99wholesale */}
        {discountPct > 0 && !outOfStock && (
          <div className='absolute top-2.5 left-2.5 z-20 bg-[#E53935] text-white text-[11px] font-[800] px-2 py-1 rounded-lg shadow-md leading-none'>
            -{discountPct}%
          </div>
        )}
        {isNew && !discountPct && !outOfStock && (
          <div className='absolute top-2.5 left-2.5 z-20 bg-[#1565C0] text-white text-[11px] font-[800] px-2 py-1 rounded-lg shadow-md leading-none'>
            NEW
          </div>
        )}
        {outOfStock && (
          <div className='absolute top-2.5 left-2.5 z-20 bg-gray-400 text-white text-[11px] font-[800] px-2 py-1 rounded-lg shadow-md leading-none'>
            SOLD OUT
          </div>
        )}

        {/* Wishlist — top right */}
        <button
          onClick={() => toggleWishlist(item)}
          className='absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#1565C0] group/wl transition-all duration-200'
        >
          {wishlisted
            ? <FaHeart className='text-[13px] text-[#E53935]' />
            : <FaRegHeart className='text-[13px] text-gray-400 group-hover/wl:text-white transition-colors' />
          }
        </button>

        {/* Product image */}
        <Link href={productLink} className='block w-full h-full'>
          {primaryImg && (
            <img
              src={primaryImg}
              alt={item.name}
              className='w-full h-full object-contain p-3 transition-all duration-500 group-hover:scale-105'
              onError={(e) => {
                if (hoverImg && e.target.src !== hoverImg) {
                  e.target.src = hoverImg;
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
          )}
          {hoverImg && hoverImg !== primaryImg && (
            <img
              src={hoverImg}
              alt={item.name}
              className='absolute inset-0 w-full h-full object-contain p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500'
            />
          )}
        </Link>

        {/* Quick view — slides up on hover */}
        <div className='absolute bottom-0 left-0 right-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300'>
          <Tooltip title='Quick View' placement='top'>
            <button
              onClick={() => context.openProductDetailsModalFor(item)}
              className='w-full bg-[#1565C0]/90 hover:bg-[#1565C0] text-white text-[11px] font-[700] py-2 flex items-center justify-center gap-1.5 backdrop-blur-sm transition-colors'
            >
              <MdZoomOutMap className='text-[14px]' /> Quick View
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Info area ── */}
      <div className='p-3 flex flex-col flex-1'>
        {/* Brand */}
        {item.brand && (
          <p className='text-[10px] text-[#1565C0] font-[700] uppercase tracking-wide mb-0.5'>{item.brand}</p>
        )}

        {/* Name */}
        <h3 className='text-[12.5px] font-[500] text-gray-800 line-clamp-2 mb-2 leading-snug flex-1'>
          <Link href={productLink} className='hover:text-[#1565C0] transition-colors'>
            {item.name}
          </Link>
        </h3>

        {/* Rating */}
        <div className='mb-1.5'>
          <Rating value={Number(item.rating) || 0} size='small' readOnly precision={0.5} />
        </div>

        {/* Price row — prominent like 99wholesale */}
        <div className='flex items-baseline gap-2 mb-3'>
          <span className='text-[17px] font-[800] text-[#1565C0]'>₹{fmt(item.price)}</span>
          {item.oldprice > 0 && (
            <span className='text-[12px] text-gray-400 line-through'>₹{fmt(item.oldprice)}</span>
          )}
          {discountPct > 0 && (
            <span className='text-[11px] font-[700] text-[#E53935]'>{discountPct}% off</span>
          )}
        </div>

        {/* Add to Cart button — full width, pill style like 99wholesale */}
        <button
          disabled={outOfStock}
          onClick={() => addToCart(item.id)}
          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-[700] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'
          style={{
            background: outOfStock ? '#e5e7eb' : '#111827',
            color: outOfStock ? '#9ca3af' : '#fff',
          }}
        >
          {!outOfStock && <MdOutlineShoppingCart className='text-[15px]' />}
          {outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductItem;
