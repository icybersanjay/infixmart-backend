import React from 'react'
import { Link } from 'react-router-dom'
import NextImage from 'next/image'

const BannerBox = (props) => {
  return (
    <div className='overflow-hidden rounded-lg box bannerBox group' style={{ position: 'relative', aspectRatio: '16/7' }}>
        <Link to='/'>
            <NextImage src={props.img} alt="Banner" fill className='object-cover transition-all group-hover:scale-110' sizes="(max-width:768px) 100vw, 50vw" />
        </Link>
    </div>
  )
}

export default BannerBox