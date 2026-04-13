/**
 * HomeCatSlider — horizontal category row with hexagonal icon shapes
 * Matches triple.co.id's category section (flat-top hexagons, blue theme)
 */
import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { useRouter } from 'next/navigation';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation } from 'swiper/modules';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';


/* ── Hexagon clip-path (flat-top, like triple.co.id) ─────────────── */
const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

const CatSkeleton = () => (
  <div className='flex flex-col items-center py-4 gap-3 animate-pulse'>
    <div className='w-[82px] h-[82px]' style={{ clipPath: HEX_CLIP, background: '#E2E8F0' }} />
    <div className='h-3 w-16 bg-gray-200 rounded' />
  </div>
);

const HomeCatSlider = () => {
  const [categories, setCategories] = useState(null);
  const router = useRouter();

  useEffect(() => {
    getData('/api/category')
      .then((res) => {
        if (res && !res.error) {
          const data = res.categories || res.data || [];
          setCategories(Array.isArray(data) ? data.slice(0, 12) : []);
        } else {
          setCategories([]);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <div className='py-6 pt-4 homeCatSlider'>
      <div className='container'>
        <Swiper
          slidesPerView={4}
          spaceBetween={4}
          modules={[Navigation]}
          navigation={true}
          breakpoints={{
            480:  { slidesPerView: 5, spaceBetween: 6 },
            640:  { slidesPerView: 6, spaceBetween: 8 },
            768:  { slidesPerView: 7, spaceBetween: 8 },
            1024: { slidesPerView: 8, spaceBetween: 10 },
          }}
          className='mySwiper catSwiper'
        >
          {(categories === null ? Array(8).fill(null) : categories).map((cat, i) => {
            if (!cat) return <SwiperSlide key={i}><CatSkeleton /></SwiperSlide>;

            const catImage = imgUrl(cat.images?.[0]);
            return (
              <SwiperSlide key={cat.id}>
                <div
                  className='flex flex-col items-center py-3 cursor-pointer group'
                  onClick={() => router.push(`/productListing?category=${cat.id}`)}
                >
                  {/* Hexagon container */}
                  <div className='relative mb-3 transition-transform duration-300 group-hover:scale-110'>
                    {/* Outer hexagon border (slightly larger, creates a border effect) */}
                    <div
                      className='w-[88px] h-[88px] flex items-center justify-center'
                      style={{ clipPath: HEX_CLIP, background: '#BBDEFB' }}
                    >
                      {/* Inner hexagon (the visible shape with bg) */}
                      <div
                        className='w-[80px] h-[80px] flex items-center justify-center transition-all duration-300'
                        style={{
                          clipPath: HEX_CLIP,
                          background: 'white',
                        }}
                      >
                        <img
                          src={catImage || 'https://via.placeholder.com/48'}
                          alt={cat.name}
                          className='w-[46px] h-[46px] object-contain'
                        />
                      </div>
                    </div>

                    {/* Hover: fill inner hex with blue */}
                    <div
                      className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                      style={{ clipPath: HEX_CLIP, background: '#EEF4FF' }}
                    >
                      <div
                        className='w-[80px] h-[80px] flex items-center justify-center'
                        style={{ clipPath: HEX_CLIP, background: '#1565C0' }}
                      >
                        <img
                          src={catImage || 'https://via.placeholder.com/48'}
                          alt={cat.name}
                          className='w-[46px] h-[46px] object-contain brightness-0 invert'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category name */}
                  <h3 className='text-[11px] sm:text-[12px] font-[600] text-gray-700 text-center leading-tight group-hover:text-[#1565C0] transition-colors duration-200 px-1'>
                    {cat.name}
                  </h3>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </div>
  );
};

export default HomeCatSlider;
