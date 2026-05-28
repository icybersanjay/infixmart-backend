import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation } from 'swiper/modules';
import ProductItem from '../ProductItem';

const SkeletonCard = () => (
  <div className='overflow-hidden rounded-md border border-[rgba(0,0,0,0.08)] bg-white animate-pulse'>
    <div className='h-[220px] bg-gray-200' />
    <div className='p-3 py-5 space-y-2'>
      <div className='h-3 bg-gray-200 rounded w-1/2' />
      <div className='h-4 bg-gray-200 rounded w-3/4' />
      <div className='h-3 bg-gray-200 rounded w-1/3' />
      <div className='h-4 bg-gray-200 rounded w-2/5' />
    </div>
  </div>
);

const ProductSlider = ({ items = 6, products }) => {
  const isLoading = products === undefined || products === null;
  const displayItems = isLoading
    ? Array(items).fill(null)
    : products;

  if (!isLoading && displayItems.length === 0) return null;

  const count = displayItems.length;

  return (
    <div className='py-3 productSlider'>
      <Swiper
        slidesPerView={Math.min(2, count)}
        spaceBetween={8}
        modules={[Navigation]}
        navigation={count > 2}
        breakpoints={{
          480:  { slidesPerView: Math.min(2, count), spaceBetween: 10 },
          640:  { slidesPerView: Math.min(3, count), spaceBetween: 10 },
          1024: { slidesPerView: Math.min(items, 5, count), spaceBetween: 10 },
          1280: { slidesPerView: Math.min(items, count), spaceBetween: 10 },
        }}
        className="mySwiper"
      >
        {isLoading
          ? displayItems.map((_, i) => (
              <SwiperSlide key={i}><SkeletonCard /></SwiperSlide>
            ))
          : displayItems.map((product, index) => (
              <SwiperSlide key={product.id ?? product._id ?? product.slug ?? product.name ?? `product-slide-${index}`}>
                <ProductItem item={product} />
              </SwiperSlide>
            ))
        }
      </Swiper>
    </div>
  );
};

export default ProductSlider;
