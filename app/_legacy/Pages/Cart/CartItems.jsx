"use client";

import React, { useState, useRef } from 'react'
import Link from 'next/link';
import { IoClose } from "react-icons/io5";
import { FaAngleDown } from "react-icons/fa";
import Stars from '../../components/ui/Stars';
import DropdownMenu, { MenuItem } from '../../components/ui/DropdownMenu';

const CartItems = (props) => {
    const sizeTriggerRef = useRef(null);
    const qtyTriggerRef = useRef(null);
    const [sizeOpen, setSizeOpen] = useState(false);
    const [qtyOpen, setQtyOpen] = useState(false);
    const [selectedSize, setSelectedSize] = useState(props.size);
    const [selectedQty, setSelectedQty] = useState(props.qty);

    const pickSize = (value) => { setSelectedSize(value); setSizeOpen(false); };
    const pickQty = (value) => { setSelectedQty(value); setQtyOpen(false); };

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

                            <Stars defaultValue={4} size="small" readOnly/>

                            <div className='flex items-center gap-4 mt-2'>
                                <div className='relative'>
                                    <button
                                      ref={sizeTriggerRef}
                                      type="button"
                                      className='flex py-1 px-2 items-center justify-center bg-[#f1f1f1] text-[12px] font-[600] rounded-md cursor-pointer'
                                      onClick={() => setSizeOpen((o) => !o)}
                                    >
                                        Size: {selectedSize} <FaAngleDown className='text-[14px] ml-1'/>
                                    </button>
                                    <DropdownMenu open={sizeOpen} onClose={() => setSizeOpen(false)} anchorRef={sizeTriggerRef}>
                                      {['S','M','L','XL','XXL'].map((s) => (
                                        <MenuItem key={s} onClick={() => pickSize(s)}>{s}</MenuItem>
                                      ))}
                                    </DropdownMenu>
                                </div>
                                <div className='relative'>
                                    <button
                                      ref={qtyTriggerRef}
                                      type="button"
                                      className='flex py-1 px-2 items-center justify-center bg-[#f1f1f1] text-[12px] font-[600] rounded-md cursor-pointer'
                                      onClick={() => setQtyOpen((o) => !o)}
                                    >
                                        Qty: {selectedQty} <FaAngleDown className='text-[14px] ml-1'/>
                                    </button>
                                    <DropdownMenu open={qtyOpen} onClose={() => setQtyOpen(false)} anchorRef={qtyTriggerRef}>
                                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                        <MenuItem key={n} onClick={() => pickQty(n)}>{n}</MenuItem>
                                      ))}
                                    </DropdownMenu>
                                </div>
                            </div>
                            
                            <div className='flex items-center gap-4 mt-2'>
                                <span className='font-[600] newPrice text-[14px]'>580</span>
                                <span className='text-gray-500 font-[500] line-through oldPrice text-[14px]'>580</span>
                                <span className='font-[600] newPrice text-primary text-[14px]'>55% off</span>
                            </div>
                        </div>
                    </div>
  )
}

export default CartItems