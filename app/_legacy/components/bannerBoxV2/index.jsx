import React from 'react'
import { Link } from 'react-router-dom'
import NextImage from 'next/image'

const BannerBoxV2 = (props) => {
  return (
    <div className='relative w-full overflow-hidden rounded-md bannerBoxV2 group' style={{ aspectRatio: '4/3' }}>
        <NextImage src={props.image} alt="" fill className='object-cover transition-all duration-150 group-hover:scale-105' sizes="(max-width:768px) 100vw, 33vw" />
         
         <div className={`flex flex-col gap-2 items-center justify-center info absolute p-5 top-0 ${props.info ==='left' ? 'left-0' : 'right-0'} w-[70%] h-[100%] z-50
            ${props.info ==='left' ? '' : 'pl-12'}`}>
            <h2 className='text-[18px] font-[600]'>Samsung Gear VR Camera</h2>
            
            <span className='text-[20px] w-full font-[600] text-primary'>499</span>

            <div className='w-full'>
                <Link to='/' className='text-[16px] font-[600] link underline'>SHOP NOW</Link>
            </div>
         </div>
    </div>
  )
}

export default BannerBoxV2
