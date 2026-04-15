"use client";

import React, { useMemo, useState } from 'react'
import Link from 'next/link';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import { MdOutlineShoppingCart } from "react-icons/md";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { IoGitCompareOutline } from "react-icons/io5";
import QtyBox from '../QtyBox';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
};

const ProductDetailsComponent = ({ product }) => {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [productActionIndex , setProductActionIndex] = useState(0);

  const sizeOptions = useMemo(() => toArray(product?.size), [product?.size]);
  const weightOptions = useMemo(() => toArray(product?.productWeight), [product?.productWeight]);
  const colorOptions = useMemo(() => toArray(product?.productRam), [product?.productRam]);
  const primaryOptions = sizeOptions.length > 0
    ? { label: 'Size', items: sizeOptions }
    : colorOptions.length > 0
      ? { label: 'Color', items: colorOptions }
      : weightOptions.length > 0
        ? { label: 'Weight', items: weightOptions }
        : { label: '', items: [] };

  if (!product) {
    return (
      <div>
        <h1 className='text-[24px] font-[600] mb-2'>Product preview unavailable</h1>
        <p className='text-[14px] text-gray-500'>
          This quick view needs a product selection from the listing card.
        </p>
      </div>
    );
  }

  const outOfStock = Number(product.countInStock || 0) <= 0;
  const wishlisted = isWishlisted(product.id);

  return (
    <>
                    <h1 className='text-[24px] font-[600] mb-2'>{product.name}</h1>
                    <div className='flex items-center gap-2'>
                        <span className='text-gray-400 text-[13px]'>
                            Brands : <span className='font-[500] uppercase opacity-80 text-black'>{product.brand || 'N/A'}</span>
                        </span>

                        <Rating name="size-small" value={Number(product.rating) || 0} size="small" readOnly/>
                        <span className='text-[13px] cursor-pointer'>Rating ({Number(product.rating || 0).toFixed(1)})</span>
                    </div>

                    <div className='flex items-center gap-4 mt-4'>
                        {Number(product.oldprice) > 0 && (
                          <span className='text-gray-500 font-[500] line-through oldPrice text-[18px]'>{fmt(product.oldprice)}</span>
                        )}
                        <span className='font-[600] newPrice text-primary text-[20px]'>{fmt(product.price)}</span>

                        <span className='text-[14px]'>
                          Available in Stock : <span className={`font-semibold ${outOfStock ? 'text-red-500' : 'text-green-600'}`}>{Number(product.countInStock || 0)} Items</span>
                        </span>
                    </div>

                    <p className='pr-10 mt-3 mb-5'>
                        {product.description || 'No description available for this product yet.'}
                    </p>

                    {primaryOptions.items.length > 0 && (
                    <div className='flex items-center gap-3'>
                        <span className='text-[16px]'>{primaryOptions.label}:</span>
                        <div className='flex items-center gap-1 actions'>
                            {primaryOptions.items.map((option, index) => (
                              <Button
                                key={`${primaryOptions.label}-${option}`}
                                className={`${productActionIndex === index ? '!bg-primary !text-white' : ''}`}
                                onClick={()=>setProductActionIndex(index)}
                              >
                                {option}
                              </Button>
                            ))}
                        </div>
                    </div>
                    )}

                    <p className='text-[14px] opacity-80 mt-5 text-[#000] mb-2'>Free Shipping (Est. Delivery Time 2-3 Days)</p>

                    <div className='flex items-center gap-4 py-2'>
                        <div className='qtyBoxWrapper w-[70px]'>
                        <QtyBox/>
                        </div>
                        
                        <Button className='flex items-center gap-2 btn-org' disabled={outOfStock} onClick={() => addToCart(product.id)}>
                        <MdOutlineShoppingCart className='text-[22px]'/> Add to Cart
                        </Button>
                        <Link href={`/product/${product.id}`} className='text-[14px] font-[600] text-primary hover:underline'>
                          View Full Details
                        </Link>
                    </div>

                    <div className='flex items-center gap-4 mt-4'>
                        <button type="button" onClick={() => toggleWishlist(product)} className='flex items-center gap-1 text-[15px] link cursor-pointer font-[500]'>
                          {wishlisted ? <FaHeart className='text-[18px] text-red-500'/> : <FaRegHeart className='text-[18px]'/>}
                          {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                        </button>
                        <span className='flex items-center gap-1 text-[15px] link cursor-pointer font-[500] opacity-60'><IoGitCompareOutline className='text-[18px]'/>Add to Compare</span>
                    </div>
    </>
  )
}

export default ProductDetailsComponent
