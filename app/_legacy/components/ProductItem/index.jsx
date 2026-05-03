"use client";

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import Stars from '../ui/Stars';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

// Particle offsets for the wishlist heart burst — picked once so all hearts
// don't fly to the same spot.
const HEART_BURST_PARTICLES = [
  { tx: '-14px', ty: '-18px' },
  { tx: '14px',  ty: '-18px' },
  { tx: '-20px', ty: '-2px'  },
  { tx: '20px',  ty: '-2px'  },
  { tx: '0px',   ty: '-22px' },
];
import { MdOutlineShoppingCart, MdZoomOutMap } from 'react-icons/md';
import { MyContext } from '../../LegacyProviders';
import { imgUrl } from '../../utils/imageUrl';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCompare } from '../../context/CompareContext';
import useCountdown from '../../hooks/useCountdown';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const ProductItem = ({ item }) => {
  const context = useContext(MyContext);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCompare, removeFromCompare, isComparing, compareList, maxCompare } = useCompare();
  const saleCountdown = useCountdown(item.saleEndsAt);
  const [heartBurst, setHeartBurst] = useState(false);

  if (!item) return null;

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wasWishlisted = isWishlisted(item.id);
    toggleWishlist(item);
    if (!wasWishlisted) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    }
  };

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
    <div className='group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#1565C0]/30 hover:shadow-xl hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-300 ease-out flex flex-col will-change-transform'>

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
          onClick={handleWishlistClick}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          className='absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#1565C0] group/wl transition-all duration-200'
        >
          <span className={`relative inline-flex items-center justify-center ${heartBurst ? 'infix-heart-pop' : ''}`}>
            {wishlisted
              ? <FaHeart className='text-[13px] text-[#E53935]' />
              : <FaRegHeart className='text-[13px] text-gray-400 group-hover/wl:text-white transition-colors' />
            }
          </span>
          {heartBurst && (
            <span className='infix-heart-burst' aria-hidden='true'>
              {HEART_BURST_PARTICLES.map((p, i) => (
                <span key={i} style={{ '--tx': p.tx, '--ty': p.ty }}>♥</span>
              ))}
            </span>
          )}
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

        {/* Quick view + ATC — slides up on hover (desktop) */}
        <div className='absolute bottom-0 left-0 right-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden sm:block'>
          <div className='flex'>
            <button
              title='Quick View'
              onClick={() => context.openProductDetailsModalFor(item)}
              className='flex-1 bg-[#1565C0]/90 hover:bg-[#1565C0] text-white text-[11px] font-[700] py-2 flex items-center justify-center gap-1.5 backdrop-blur-sm transition-colors border-r border-white/20'
            >
              <MdZoomOutMap className='text-[14px]' /> Quick View
            </button>
            {!outOfStock && (
              <button
                title='Add to Cart'
                onClick={(e) => { e.preventDefault(); addToCart(item.id); }}
                className='flex-1 bg-[#111827]/90 hover:bg-[#111827] text-white text-[11px] font-[700] py-2 flex items-center justify-center gap-1.5 backdrop-blur-sm transition-colors'
              >
                <MdOutlineShoppingCart className='text-[14px]' /> Add to Cart
              </button>
            )}
          </div>
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
          <Stars value={Number(item.rating) || 0} size='small' readOnly precision={0.5} />
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

        {/* Flash sale countdown */}
        {saleCountdown && (
          <div className='flex items-center gap-1.5 bg-[#FFF3E0] border border-[#FFB74D] rounded-lg px-2 py-1 mb-1.5'>
            <span className='text-[10px] font-[700] text-[#E65100]'>⚡ Ends:</span>
            <span className='text-[10px] font-[800] text-[#E65100] tabular-nums'>
              {String(saleCountdown.h).padStart(2,'0')}:{String(saleCountdown.m).padStart(2,'0')}:{String(saleCountdown.s).padStart(2,'0')}
            </span>
          </div>
        )}

        {/* Low stock urgency label */}
        {!outOfStock && item.countInStock > 0 && item.countInStock <= 10 && (
          item.countInStock <= 4 ? (
            <p className='text-[11px] text-[#E53935] font-[700] mb-2 flex items-center gap-1.5 leading-none'>
              <span className='infix-stock-dot' aria-hidden='true' />
              Only {item.countInStock} left — selling fast
            </p>
          ) : (
            <p className='text-[11px] text-amber-600 font-[600] mb-2 flex items-center gap-1 leading-none'>
              ⚠️ Only {item.countInStock} left
            </p>
          )
        )}

        {/* Compare toggle */}
        {(() => {
          const comparing = isComparing(item.id);
          const full = !comparing && compareList.length >= maxCompare;
          return (
            <button
              onClick={() => comparing ? removeFromCompare(item.id) : addToCompare(item)}
              disabled={full}
              title={full ? 'Max 3 products' : comparing ? 'Remove from compare' : 'Add to compare'}
              className={`w-full text-[11px] font-[600] py-1.5 rounded-xl mb-1.5 border transition-all ${
                comparing
                  ? 'bg-[#EEF4FF] border-[#1565C0] text-[#1565C0]'
                  : full
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-500 hover:border-[#1565C0] hover:text-[#1565C0]'
              }`}
            >
              {comparing ? '✓ Comparing' : '⇄ Compare'}
            </button>
          );
        })()}

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
