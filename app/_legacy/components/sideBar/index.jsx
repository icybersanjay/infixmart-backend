"use client";

import React, { useState } from 'react'
import {Collapse} from 'react-collapse';
import { FaAngleDown } from "react-icons/fa6";
import { FaAngleUp } from "react-icons/fa6";
import RangeSlider from 'react-range-slider-input';
import Stars from '../ui/Stars';

// Tiny inline checkbox row matching the look of the previous MUI control.
const CheckRow = ({ label }) => (
  <label className='flex items-center gap-2 cursor-pointer text-[13px] text-gray-700 hover:text-[#1565C0] transition-colors w-full'>
    <input type='checkbox' className='accent-[#1565C0] w-4 h-4' />
    <span>{label}</span>
  </label>
);

const TogglePill = ({ open, onClick }) => (
  <button type='button'
    className='!w-[30px] !h-[30px] inline-flex items-center justify-center rounded-full ml-auto text-black hover:bg-gray-100 transition-colors'
    onClick={onClick}>
    {open ? <FaAngleUp/> : <FaAngleDown/>}
  </button>
);



const SideBar = () => {
    
    const [isOpenCategoryFilter,setisOpenCategoryFilter] = useState(true)
    const [isOpenAvailabilityFilter,setisOpenAvailabilityFilter] = useState(true)
    const [isOpenSizeFilter,setisOpenSizeFilter] = useState(true)
    
  return (
    <aside className='py-5 sideBar'>
        <div className='box'>
            <h3 className='w-full mb-3 text-[16px] font-[600] flex items-center pr-5'>
                Shop by Category
                <TogglePill open={isOpenCategoryFilter} onClick={()=>setisOpenCategoryFilter(!isOpenCategoryFilter)} />
            </h3>
            <Collapse isOpened={isOpenCategoryFilter}>
                <div className='relative px-4 scroll -left-[13px] space-y-1'>
                    {Array.from({ length: 7 }, (_, i) => <CheckRow key={i} label="Fashion" />)}
                </div>
            </Collapse>
        </div>

        <div className='box'>
            <h3 className='w-full mb-3 text-[16px] font-[600] flex items-center pr-5'>
                Availability
                <TogglePill open={isOpenAvailabilityFilter} onClick={()=>setisOpenAvailabilityFilter(!isOpenAvailabilityFilter)} />
            </h3>
            <Collapse isOpened={isOpenAvailabilityFilter}>
                <div className='relative px-4 scroll -left-[13px] space-y-1'>
                    <CheckRow label="Available (17)" />
                    <CheckRow label="In Stock (10)" />
                    <CheckRow label="Not Available (1)" />
                </div>
            </Collapse>
        </div>

        <div className='mt-3 box'>
            <h3 className='w-full mb-3 text-[16px] font-[600] flex items-center pr-5'>
                Size
                <TogglePill open={isOpenSizeFilter} onClick={()=>setisOpenSizeFilter(!isOpenSizeFilter)} />
            </h3>
            <Collapse isOpened={isOpenSizeFilter}>
                <div className='relative px-4 scroll -left-[13px] space-y-1'>
                    <CheckRow label="Small (17)" />
                    <CheckRow label="Medium (10)" />
                    <CheckRow label="Large (1)" />
                    <CheckRow label="XL (1)" />
                    <CheckRow label="XXL (1)" />
                </div>
            </Collapse>
        </div>

        <div className='mt-4 box'>
            <h3 className='w-full mb-3 text-[16px] font-[600] flex items-center pr-5'>
                Filter By Price
            </h3>

            <RangeSlider />
            <div className='flex pt-4 pb-2 priceRange'>
                <span className='text-[13px] flex items-center'>
                    From:&nbsp;<div className='font-semibold text-dark'>Rs {100}</div>
                </span>
                <span className='ml-auto text-[13px]'>
                    From:&nbsp;<strong className='text-dark'>Rs {5000}</strong>
                </span>
            </div>
        </div>

        <div className='mt-4 box'>
            <h3 className='w-full mb-3 text-[16px] font-[600] flex items-center pr-5'>
                Filter By Rating
            </h3>
            
            <div>
                <div className='w-full'>
                    <Stars defaultValue={5} size="small" readOnly/>
                </div>
                <div className='w-full'>
                    <Stars defaultValue={4} size="small" readOnly/>
                </div>
                <div className='w-full'>
                    <Stars defaultValue={3} size="small" readOnly/>
                </div>
                <div className='w-full'>
                    <Stars defaultValue={2} size="small" readOnly/>
                </div>
                <div className='w-full'>
                    <Stars defaultValue={1} size="small" readOnly/>
                </div>
            </div>
        </div>
    </aside>
  )
}

export default SideBar
