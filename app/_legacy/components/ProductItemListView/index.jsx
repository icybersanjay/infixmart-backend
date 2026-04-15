"use client";

import React from 'react'
import Link from 'next/link';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import { FaRegHeart } from "react-icons/fa";
import { IoGitCompareOutline } from "react-icons/io5";
import { MdZoomOutMap } from "react-icons/md";
import Tooltip from '@mui/material/Tooltip';
import { MdOutlineShoppingCart } from "react-icons/md";
import { useContext } from 'react';
import { MyContext } from '../../LegacyProviders';



const ProductItemListView = () => {
    
    const context = useContext(MyContext);
    
  return (
    <div className='overflow-hidden shadow-lg border-[rgba(0,0,0,0.1)] flex items-center rounded-md productItem border'>
        <div className='group m-4 imgWrapper w-[25%] rounded-md relative'>
            <Link href='/'>
                <div className='h-auto overflow-hidden rounded-md img'>
                    <img src="https://serviceapi.spicezgold.com/download/1742463096955_hbhb1.jpg"
                    alt=""
                    className='w-full'/>

                    <img src="https://serviceapi.spicezgold.com/download/1742463096956_hbhb2.jpg"
                    alt=""
                    className='absolute top-0 left-0 object-cover w-full h-full transition-all duration-700 rounded-md opacity-0 group-hover:opacity-100 group-hover:scale-105'/>
                </div>
             </Link>
             <span className='absolute flex items-center discount top-[10px] left-[10px] z-50 bg-primary text-white rounded-lg px-2 py-1 font-[500] text-[12px]'
             >
                10%
             </span>

             <div className='absolute actions top-[-200px] right-[5px] z-50 flex items-center gap-2 flex-col w-[50px] transition-all duration-300 group-hover:top-[15px] opacity-0 group-hover:opacity-100'>
                <Tooltip title="View product details" placement="left-start">
                    <Button className='!w-[35px] !h-[35px] !min-w-[35px] !rounded-full !bg-white text-black hover:!bg-primary hover:text-white'
                    onClick={()=>context.openProductDetailsModalFor(null)}>
                        <MdZoomOutMap className='text-[18px] !text-black group-hover:text-white hover:!text-white'/>
                    </Button>
                </Tooltip>
                <Tooltip title="Compare product" placement="left-start">
                    <Button className='!w-[35px] !h-[35px] !min-w-[35px] !rounded-full !bg-white text-black hover:!bg-primary hover:text-white'
                    >
                        <IoGitCompareOutline className='text-[18px] !text-black group-hover:text-white hover:!text-white'/>
                    </Button>
                </Tooltip>
                <Tooltip title="Add to wishlist" placement="left-start">
                    <Button className='!w-[35px] !h-[35px] !min-w-[35px] !rounded-full !bg-white text-black hover:!bg-primary hover:text-white'
                    >
                        <FaRegHeart className='text-[18px] !text-black group-hover:text-white hover:!text-white'/>
                    </Button>
                </Tooltip>
             </div>
        </div>

        <div className='p-3 py-5 px-8 info w-[75%]'>
            <h6 className='text-[15px] !font-[400]'>
                <Link href='/' className='transition-all link'>Soylent Green</Link>
            </h6>
            <h3 className='text-[18px] title mt-3 mb-3 font-[500] text-[#000]'>
                <Link href='/' className='transition-all link'>Sirii Georgette Pink Color Saree with Blouse piece</Link>
            </h3>
            <p className='text-[14px] mb-3'>
                Lorem ipsum dolor sit, amet consectetur adipisicing elit. Asperiores dignissimos obcaecati rerum corporis beatae quasi unde provident expedita qui ducimus totam doloribus quis voluptatum dolorem, libero accusamus ex culpa atque!
            </p>
            <Rating name="size-small" defaultValue={4} size="small" readOnly/>
            <div className='flex items-center gap-4'>
                <span className='text-gray-500 font-[500] line-through oldPrice text-[15px]'>580</span>
                <span className='font-[600] newPrice text-primary text-[15px]'>580</span>
            </div>

            <div className='mt-3'>
                <Button className='flex gap-2 btn-org'>
                    <MdOutlineShoppingCart className='text-[20px]'/>
                    Add to Cart
                </Button>
            </div>
        </div>
    </div>
  )
}

export default ProductItemListView
