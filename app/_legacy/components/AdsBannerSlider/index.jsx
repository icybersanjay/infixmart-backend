import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

// import required modules
import { Navigation } from 'swiper/modules';
import BannerBox from '../BannerBox';

export const AdsBannerSlider = (props) => {
  return (
    <div className='w-full py-5 pb-0'>
        <Swiper
        slidesPerView={props.items}
        spaceBetween={10}
        modules={[Navigation]}
        navigation={true}
        className="mySwiper"
        >
            <SwiperSlide>
                <BannerBox 
                img={'https://serviceapi.spicezgold.com/download/1741663408792_1737020756772_New_Project_1.png'}
                link={'/'}/>
            </SwiperSlide>
            
            <SwiperSlide>
                <BannerBox 
                img={'https://serviceapi.spicezgold.com/download/1741663408792_1737020756772_New_Project_1.png'}
                link={'/'}/>
            </SwiperSlide>

            <SwiperSlide>
                <BannerBox 
                img={'https://serviceapi.spicezgold.com/download/1741663408792_1737020756772_New_Project_1.png'}
                link={'/'}/>
            </SwiperSlide>
            
        </Swiper>
    </div>
  )
}

export const AdsBannerSlider2 = (props) => {
    return (
      <div className='w-full py-5 pb-0'>
          <Swiper
          slidesPerView={props.items}
          spaceBetween={10}
          modules={[Navigation]}
          navigation={true}
          className="mySwiper"
          >
              <SwiperSlide>
                  <BannerBox 
                  img={'/images/strechBanner.png'}
                  link={'/'}/>
              </SwiperSlide>
              
          </Swiper>
      </div>
    )
 }