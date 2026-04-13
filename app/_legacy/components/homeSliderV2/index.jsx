import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { EffectFade, Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Button } from '@mui/material';
import Link from 'next/link';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';

const HomeSliderV2 = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData('/api/homeSlide')
      .then((res) => {
        if (res && !res.error) {
          const data = res.homeSlides || res.slides || res.data || [];
          setSlides(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full rounded-md bg-gray-200 animate-pulse" style={{ height: 380 }} />
    );
  }

  if (slides.length === 0) {
    return (
      <div className="w-full rounded-md bg-gray-100 flex items-center justify-center" style={{ height: 380 }}>
        <p className="text-gray-400 text-sm">No slides available</p>
      </div>
    );
  }

  return (
    <Swiper
      spaceBetween={30}
      effect={'fade'}
      loop={slides.length > 1}
      navigation={true}
      pagination={{ clickable: true }}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      modules={[EffectFade, Navigation, Pagination, Autoplay]}
      className="homeSliderV2"
    >
      {slides.map((slide, idx) => {
        const image = imgUrl(slide.images?.[0] || slide.image);
        return (
          <SwiperSlide key={slide.id || idx}>
            <div className='relative w-full overflow-hidden rounded-md item' style={{ height: 400 }}>
              {image && (
                <NextImage src={image} alt={slide.title || `Slide ${idx + 1}`} fill className='object-cover' sizes="100vw" priority={idx === 0} />
              )}
              <div className='absolute top-0 -right-[100%] opacity-0 duration-700 transition-all info w-[50%] h-full flex flex-col justify-center items-center p-8 z-50'>
                {slide.subTitle && (
                  <h4 className='text-[18px] font-[500] mb-4 w-full text-left relative -right-[100%] opacity-0'>
                    {slide.subTitle}
                  </h4>
                )}
                {slide.title && (
                  <h2 className='text-[30px] font-[600] w-full relative -right-[100%] opacity-0'>
                    {slide.title}
                  </h2>
                )}
                {slide.price && (
                  <h3 className='flex items-center text-[18px] font-[500] mb-4 mt-3 w-full text-left gap-3 relative -right-[100%] opacity-0'>
                    Starting At Only <span className='text-primary text-[35px] font-[700]'>₹{slide.price}</span>
                  </h3>
                )}
                <div className='w-full relative -bottom-[100%] opacity-0 btn_'>
                  <Link href={slide.link || '/productListing'}>
                    <Button className='btn-org'>SHOP NOW</Button>
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};

export default HomeSliderV2;
