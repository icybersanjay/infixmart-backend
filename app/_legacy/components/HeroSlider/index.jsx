/**
 * HeroSlider — clean, full-bleed image slider
 *
 * Design: minimal arrows inside the image, small dot indicators,
 * smooth fade transition. No colored wrapper — stands alone.
 *
 * Recommended banner size: 1400 × 500 px
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import { getData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

const FALLBACK = [
  'https://serviceapi.spicezgold.com/download/1745504025727_NewProject(1).jpg',
  'https://serviceapi.spicezgold.com/download/1741660907985_NewProject.jpg',
  'https://serviceapi.spicezgold.com/download/1741660881858_NewProject(11).jpg',
  'https://serviceapi.spicezgold.com/download/1741660862304_NewProject(8).jpg',
];

const HeroSlider = () => {
  const [apiSlides, setApiSlides] = useState(null);

  useEffect(() => {
    getData('/api/homeSlide')
      .then((res) => {
        const raw = res?.homeSlides || res?.slides || res?.data || [];
        setApiSlides(!res?.error && Array.isArray(raw) && raw.length > 0 ? raw : []);
      })
      .catch(() => setApiSlides([]));
  }, []);

  const slides =
    apiSlides && apiSlides.length > 0
      ? apiSlides.map((s) => ({
          src  : imgUrl(s.images?.[0] || s.image),
          link : s.link || '/productListing',
          alt  : s.title || 'Banner',
        }))
      : FALLBACK.map((src, i) => ({ src, link: '/productListing', alt: `Banner ${i + 1}` }));

  const loading = apiSlides === null;

  return (
    <div className='hero-root'>
      {loading ? (
        <div className='hero-skeleton' />
      ) : (
        <>
          <Swiper
            loop
            effect='fade'
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            navigation={{ prevEl: '.hero-prev', nextEl: '.hero-next' }}
            pagination={{ clickable: true, el: '.hero-dots' }}
            modules={[Autoplay, Navigation, Pagination, EffectFade]}
            className='hero-swiper'
          >
            {slides.map((slide, i) => (
              <SwiperSlide key={i}>
                <Link href={slide.link} className='block w-full h-full'>
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className='w-full h-full object-cover object-center'
                    onError={(e) => { e.target.src = FALLBACK[0]; }}
                  />
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Prev arrow */}
          <button className='hero-prev hero-arrow' aria-label='Previous'>
            <IoChevronBack />
          </button>

          {/* Next arrow */}
          <button className='hero-next hero-arrow' aria-label='Next'>
            <IoChevronForward />
          </button>

          {/* Dot pagination */}
          <div className='hero-dots' />
        </>
      )}
    </div>
  );
};

export default HeroSlider;
