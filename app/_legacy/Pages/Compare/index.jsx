"use client";

import React from 'react';
import Link from 'next/link';
import Stars from '../../components/ui/Stars';
import { MdCompareArrows, MdOutlineShoppingCart } from 'react-icons/md';
import { IoClose } from 'react-icons/io5';
import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { imgUrl } from '../../utils/imageUrl';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const ROWS = [
  { label: 'Price',       key: (p) => `₹${fmt(p.price)}` },
  { label: 'Old Price',   key: (p) => p.oldprice > 0 ? `₹${fmt(p.oldprice)}` : '—' },
  { label: 'Discount',    key: (p) => p.discount > 0 ? `${p.discount}%` : '—' },
  { label: 'Brand',       key: (p) => p.brand || '—' },
  { label: 'Category',    key: (p) => p.catName || '—' },
  { label: 'Rating',      key: (p) => p.rating ? `${p.rating} / 5` : '—', rating: true },
  { label: 'In Stock',    key: (p) => Number(p.countInStock) > 0 ? `Yes (${p.countInStock})` : 'No' },
  { label: 'Colors',      key: (p) => Array.isArray(p.productRam) && p.productRam.length ? p.productRam.join(', ') : '—' },
  { label: 'Sizes',       key: (p) => Array.isArray(p.size) && p.size.length ? p.size.join(', ') : '—' },
  { label: 'Weight',      key: (p) => Array.isArray(p.productWeight) && p.productWeight.length ? p.productWeight.join(', ') : '—' },
];

const ComparePage = () => {
  const { compareList, removeFromCompare, clearCompare, maxCompare } = useCompare();
  const { addToCart } = useCart();

  if (compareList.length === 0) {
    return (
      <section className='min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center py-24'>
        <MdCompareArrows className='text-[64px] text-gray-200 mb-4' />
        <h2 className='text-[20px] font-[700] text-gray-600 mb-2'>No products selected for comparison</h2>
        <p className='text-[14px] text-gray-400 mb-6'>Browse products and click "Compare" to add them here</p>
        <Link href='/productListing' className='bg-[#1565C0] text-white font-[700] px-6 py-3 rounded-xl hover:bg-[#0D47A1] transition-colors'>
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <section className='min-h-screen bg-[#F7F8FC] py-8'>
      <div className='container'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6 gap-2'>
          <div className='min-w-0'>
            <h1 className='text-[18px] sm:text-[22px] font-[800] text-gray-800 flex items-center gap-2'>
              <MdCompareArrows className='text-[#1565C0] flex-shrink-0' /> <span className='truncate'>Compare Products</span>
            </h1>
            <p className='text-[12px] sm:text-[13px] text-gray-400 mt-0.5'>Comparing {compareList.length} of {maxCompare} max products</p>
          </div>
          <button onClick={clearCompare} className='text-[12px] sm:text-[13px] text-red-500 hover:underline font-[600] flex-shrink-0'>
            Clear All
          </button>
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto'>
          <table className='w-full border-collapse min-w-[480px] sm:min-w-[640px]'>
            <thead>
              <tr>
                <th className='w-[100px] sm:w-[140px] p-3 sm:p-4 border-b border-gray-100 text-left text-[10px] sm:text-[11px] font-[700] uppercase text-gray-400 tracking-wide bg-gray-50 sticky left-0 z-10'>
                  Feature
                </th>
                {compareList.map(p => (
                  <th key={p.id} className='p-4 border-b border-gray-100 text-center align-top'>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='relative'>
                        <button
                          onClick={() => removeFromCompare(p.id)}
                          className='absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors'
                        >
                          <IoClose className='text-[10px]' />
                        </button>
                        <div className='w-[100px] h-[100px] bg-[#F8FAFF] rounded-xl overflow-hidden flex items-center justify-center'>
                          {p.images?.[0]
                            ? <img src={imgUrl(p.images[0])} alt={p.name} className='w-full h-full object-contain p-2' />
                            : <span className='text-gray-200 text-[40px]'>📦</span>
                          }
                        </div>
                      </div>
                      <Link href={`/product/${p.id}`} className='text-[13px] font-[600] text-gray-800 hover:text-[#1565C0] transition-colors line-clamp-2 text-center leading-snug'>
                        {p.name}
                      </Link>
                      <button
                        disabled={Number(p.countInStock) === 0}
                        onClick={() => addToCart(p.id)}
                        className='flex items-center gap-1.5 bg-[#111827] hover:bg-[#1565C0] text-white text-[11px] font-[700] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                      >
                        <MdOutlineShoppingCart className='text-[13px]' />
                        {Number(p.countInStock) === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                  <td className={`py-3 px-3 sm:px-4 text-[11px] sm:text-[12px] font-[700] text-gray-500 border-b border-gray-50 sticky left-0 z-10 ${i % 2 === 0 ? 'bg-gray-50/95' : 'bg-white/95'} backdrop-blur-sm`}>
                    {row.label}
                  </td>
                  {compareList.map(p => (
                    <td key={p.id} className='py-3 px-3 sm:px-4 text-[12px] sm:text-[13px] text-gray-700 text-center border-b border-gray-50'>
                      {row.rating
                        ? <div className='flex justify-center'><Stars value={Number(p.rating) || 0} size='small' readOnly precision={0.5} /></div>
                        : row.key(p)
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='mt-6 text-center'>
          <Link href='/productListing' className='text-[13px] text-[#1565C0] hover:underline font-[600]'>
            ← Back to Products
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ComparePage;
