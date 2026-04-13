import React, { useState } from 'react'
import Link from 'next/link';
import { IoClose } from "react-icons/io5";
import { Button, Rating } from '@mui/material';

const MyListItems = (props) => {
  return (
        <div className='flex items-center w-full gap-4 p-3 pb-5 border-b border-[rgba(0,0,0,0.1)] cartItem'>
                        <div className='img w-[15%] rounded-md overflow-hidden group'>
                            <Link href='/product/834'>
                                <img src='https://serviceapi.spicezgold.com/download/1742463096955_hbhb1.jpg' alt='Product' 
                                className='w-full transition-all group-hover:scale-105' />
                            </Link>
                        </div>
                        
                        <div className='info w-[85%] relative'>
                            <IoClose className='absolute cursor-pointer top-[0px] right-[0px] text-[22px]'/>
                            <span className='text-[13px]'>Stylato</span>
                            <h3 className='text-[15px] w-[85%]'>
                                <Link className='link'>
                                    Large 33 L Laptop 
                                    Backpack 33 L Waterproof 5-Zipper Compartment 
                                    Premium Daily Use Bags For All Day Support Blue
                                </Link>
                            </h3>

                            <Rating name="size-small" defaultValue={4} size="small" readOnly/>
                            
                            <div className='flex items-center gap-4 mt-2 mb-2'>
                                <span className='font-[600] newPrice text-[14px]'>580</span>
                                <span className='text-gray-500 font-[500] line-through oldPrice text-[14px]'>580</span>
                                <span className='font-[600] newPrice text-primary text-[14px]'>55% off</span>
                            </div>
                            

                            <Button className='btn-org btn-sm'>
                                Add to Cart
                            </Button>
                        </div>
        </div>
  )
}

export default MyListItems