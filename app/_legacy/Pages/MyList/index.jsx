"use client";

import React, { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaRegHeart, FaHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar, FaWhatsapp, FaLink } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import AccountSidebar from "../../components/AccountSidebar";
import AccountMobileNav from "../../components/AccountMobileNav";
import EmptyState from "../../components/EmptyState";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { imgUrl } from "../../utils/imageUrl";

function StarRating({ value = 0 }) {
  const stars = [];
  const filled = Math.floor(value);
  const half   = value - filled >= 0.5;
  for (let i = 1; i <= 5; i++) {
    if (i <= filled)      stars.push(<FaStar key={i} className="text-amber-400 text-[13px]" />);
    else if (i === filled + 1 && half) stars.push(<FaStarHalfAlt key={i} className="text-amber-400 text-[13px]" />);
    else stars.push(<FaRegStar key={i} className="text-gray-300 text-[13px]" />);
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

const WishlistRow = ({ item, onRemove, onMoveToCart }) => (
  <div className="flex items-start gap-3 sm:gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
    {/* Image */}
    <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] flex-shrink-0 rounded-xl overflow-hidden relative border border-gray-100">
      <Link href={`/product/${item.productId}`}>
        <img
          src={imgUrl(item.image) || "/placeholder.png"}
          alt={item.productTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </Link>
      <div
        onClick={onMoveToCart}
        className="absolute inset-0 bg-[rgba(21,101,192,0.85)] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <FaShoppingCart className="text-white text-[16px] mb-1" />
        <span className="text-white text-[10px] font-[600] text-center leading-tight px-1">Move to Cart</span>
      </div>
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <Link href={`/product/${item.productId}`}>
        <h3 className="text-[13px] sm:text-[14px] font-[500] text-gray-800 hover:text-[#1565C0] transition-colors line-clamp-2">
          {item.productTitle}
        </h3>
      </Link>
      {item.brand && <span className="text-[11px] text-gray-400">{item.brand}</span>}
      <div className="mt-1">
        <StarRating value={Number(item.rating) || 0} />
      </div>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-[14px] sm:text-[15px] font-[700] text-gray-900">
          ₹{Number(item.price).toLocaleString("en-IN")}
        </span>
        {item.oldPrice > 0 && (
          <span className="text-[12px] text-gray-400 line-through">
            ₹{Number(item.oldPrice).toLocaleString("en-IN")}
          </span>
        )}
        {item.discount > 0 && (
          <span className="text-[11px] font-[600] text-green-600">{item.discount}% off</span>
        )}
      </div>
    </div>

    {/* Actions */}
    <div className="flex flex-col items-end gap-2 flex-shrink-0">
      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors text-gray-400 hover:text-[#E53935]"
        title="Remove"
      >
        <IoClose className="text-[18px]" />
      </button>
      <button
        onClick={onMoveToCart}
        className="flex items-center gap-1 text-[11px] sm:text-[12px] font-[600] text-[#1565C0] hover:text-[#0D47A1] transition-colors whitespace-nowrap"
      >
        <FaShoppingCart className="text-[11px]" /> Add to Cart
      </button>
    </div>
  </div>
);

const MyList = () => {
  const { wishlistItems, wishlistCount, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [copied, setCopied] = useState(false);

  const handleMoveToCart = async (item) => {
    await addToCart(item.productId);
    toggleWishlist({ id: item.productId });
  };

  const buildShareText = () => {
    const lines = wishlistItems.slice(0, 12).map((it) => {
      const name = it.productTitle || 'Product';
      const price = Number(it.price || 0);
      const url = typeof window !== 'undefined' ? `${window.location.origin}/product/${it.productId}` : `/product/${it.productId}`;
      return `• ${name} — ₹${price.toLocaleString('en-IN')}\n  ${url}`;
    });
    const more = wishlistItems.length > 12 ? `\n…and ${wishlistItems.length - 12} more` : '';
    return `My InfixMart wishlist:\n\n${lines.join('\n\n')}${more}`;
  };

  const handleShareWhatsApp = () => {
    if (wishlistItems.length === 0) return;
    const text = buildShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleCopyLink = async () => {
    if (wishlistItems.length === 0) return;
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Wishlist copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Try the WhatsApp share instead.');
    }
  };

  const handleNativeShare = async () => {
    if (wishlistItems.length === 0) return;
    if (typeof navigator === 'undefined' || !navigator.share) {
      handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: 'My InfixMart wishlist', text: buildShareText() });
    } catch {
      // User cancelled or share failed — silently ignore.
    }
  };

  return (
    <section className="w-full py-8 bg-[#F5F7FF] min-h-screen">
      <div className="container">
        <AccountMobileNav />
        <div className="flex flex-col md:flex-row gap-6">

          {/* Sidebar */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <AccountSidebar />
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className='min-w-0'>
                  <h2 className="text-[16px] font-[700] text-gray-800">My Wishlist</h2>
                  <p className="mt-0 mb-0 text-[12px] text-gray-500">
                    <span className="font-[600] text-[#1565C0]">{wishlistCount}</span>{" "}
                    {wishlistCount === 1 ? "item" : "items"} saved
                  </p>
                </div>

                {wishlistItems.length > 0 && (
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={handleShareWhatsApp}
                      title='Share on WhatsApp'
                      aria-label='Share wishlist on WhatsApp'
                      className='hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#25D366] text-white text-[12px] font-[600] hover:bg-[#1da851] transition-colors'
                    >
                      <FaWhatsapp className='text-[14px]' /> Share
                    </button>
                    <button
                      onClick={handleCopyLink}
                      title='Copy wishlist text'
                      aria-label='Copy wishlist'
                      className='hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0] text-[12px] font-[600] transition-colors'
                    >
                      <FaLink className='text-[12px]' /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    {/* Mobile: single native share button */}
                    <button
                      onClick={handleNativeShare}
                      title='Share wishlist'
                      aria-label='Share wishlist'
                      className='sm:hidden w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#1da851] transition-colors'
                    >
                      <FaWhatsapp className='text-[16px]' />
                    </button>
                  </div>
                )}
              </div>

              {wishlistItems.length === 0 ? (
                <EmptyState
                  icon={<FaRegHeart />}
                  title="Your wishlist is empty"
                  subtitle="Save items you love by clicking the heart icon on any product."
                  actionLabel="Explore Products"
                  onAction={() => (window.location.href = "/productListing")}
                />
              ) : (
                <div>
                  {wishlistItems.map((item) => (
                    <WishlistRow
                      key={item.id}
                      item={item}
                      onRemove={() => toggleWishlist({ id: item.productId })}
                      onMoveToCart={() => handleMoveToCart(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default MyList;
