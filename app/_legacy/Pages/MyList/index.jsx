import React from 'react';
import Link from 'next/link';
import { FaRegHeart, FaHeart, FaShoppingCart } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { Rating } from '@mui/material';
import AccountSidebar from '../../components/AccountSidebar';
import EmptyState from '../../components/EmptyState';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { imgUrl } from '../../utils/imageUrl';

const MyList = () => {
  const { wishlistItems, wishlistCount, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleMoveToCart = async (item) => {
    await addToCart(item.productId);
    // remove from wishlist after adding to cart
    toggleWishlist({ id: item.productId });
  };

  return (
    <section className="w-full py-10">
      <div className="container flex flex-col md:flex-row gap-5">
        <div className="col1 hidden md:block md:w-[20%]">
          <AccountSidebar />
        </div>

        <div className="col2 w-full md:w-[80%]">
          <div className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-[600] text-gray-800">My Wishlist</h2>
                <p className="mt-0 mb-0 text-[13px] text-gray-500">
                  <span className="font-[600] text-[#1565C0]">{wishlistCount}</span>{' '}
                  {wishlistCount === 1 ? 'item' : 'items'} saved
                </p>
              </div>
              <FaHeart className="text-[#1565C0] text-[22px]" />
            </div>

            {wishlistItems.length === 0 ? (
              <EmptyState
                icon={<FaRegHeart />}
                title="Your wishlist is empty"
                subtitle="Save items you love by clicking the heart icon on any product."
                actionLabel="Explore Products"
                onAction={() => window.location.href = '/productListing'}
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
    </section>
  );
};

const WishlistRow = ({ item, onRemove, onMoveToCart }) => {
  return (
    <div className="flex items-center w-full gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
      {/* Image */}
      <div className="w-[100px] h-[100px] flex-shrink-0 rounded-md overflow-hidden relative">
        <Link href={`/product/${item.productId}`}>
          <img
            src={imgUrl(item.image) || 'https://via.placeholder.com/100'}
            alt={item.productTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {/* Move to Cart overlay */}
        <div
          onClick={onMoveToCart}
          className="absolute inset-0 bg-[rgba(21,101,192,0.85)] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <FaShoppingCart className="text-white text-[18px] mb-1" />
          <span className="text-white text-[10px] font-[600] text-center leading-tight px-1">
            Move to Cart
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/product/${item.productId}`}>
          <h3 className="text-[14px] font-[500] text-gray-800 hover:text-[#1565C0] transition-colors line-clamp-2">
            {item.productTitle}
          </h3>
        </Link>
        {item.brand && (
          <span className="text-[12px] text-gray-400">{item.brand}</span>
        )}
        <div className="mt-1">
          <Rating value={Number(item.rating) || 0} size="small" readOnly precision={0.5} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[15px] font-[700] text-gray-900">
            ₹{Number(item.price).toLocaleString('en-IN')}
          </span>
          {item.oldPrice > 0 && (
            <span className="text-[13px] text-gray-400 line-through">
              ₹{Number(item.oldPrice).toLocaleString('en-IN')}
            </span>
          )}
          {item.discount > 0 && (
            <span className="text-[12px] font-[600] text-[#1565C0]">{item.discount}% off</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors text-gray-400 hover:text-[#E53935]"
          title="Remove from wishlist"
        >
          <IoClose className="text-[18px]" />
        </button>
        <button
          onClick={onMoveToCart}
          className="flex items-center gap-1 text-[12px] font-[600] text-[#1565C0] hover:text-[#0D47A1] transition-colors whitespace-nowrap"
        >
          <FaShoppingCart className="text-[12px]" /> Add to Cart
        </button>
      </div>
    </div>
  );
};

export default MyList;
