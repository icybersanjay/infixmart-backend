"use client";

import React from 'react'
import Link from 'next/link';
import { FaRegMinusSquare } from "react-icons/fa"
import { FaRegPlusSquare } from "react-icons/fa";
import { useState } from 'react';

const CategoryCollapse = () => {

    const [submenuIndex, setSubmenuIndex] = useState(null);
    const [innerSubmenuIndex, setinnerSubmenuIndex] = useState(null);
    
    const openSubmenu = (index) => {
        if(submenuIndex === index) {
            setSubmenuIndex(null);
        }
        else{
            setSubmenuIndex(index);
        }
    }

    const openInnerSubmenu = (index) => {
        if(innerSubmenuIndex === index) {
            setinnerSubmenuIndex(null);
        }
        else{
            setinnerSubmenuIndex(index);
        }
    }
    
  return (
    <>
        <div className='scroll'>
            <ul className='w-full'>
                <li className='relative flex flex-col items-center list-none'>
                    <Link href='/' className='w-full'>
                        <button type="button" className='w-full text-left flex items-center justify-start px-3 py-2 text-[14px] font-[500] text-[rgba(0,0,0,0.8)] hover:bg-gray-50 rounded transition-colors'>
                            Fashion
                        </button>
                    </Link>
                    {
                        submenuIndex === 0 ?
                        <FaRegMinusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                        onClick={()=>openSubmenu(0)}
                        />
                        :
                        <FaRegPlusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                        onClick={()=>openSubmenu(0)}
                        />
                    }

                    {
                        submenuIndex === 0 && (
                        <ul className='w-full pl-3 submenu'>
                            <li className='relative list-none'>
                                <Link href='/' className='w-full'>
                                    <button type="button" className='w-full text-left flex items-center justify-start px-3 py-2 text-[14px] font-[500] text-[rgba(0,0,0,0.8)] hover:bg-gray-50 rounded transition-colors'>
                                        Apparel
                                    </button>
                                </Link>
                                {
                                    innerSubmenuIndex === 0 ?
                                    <FaRegMinusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                                    onClick={()=>openInnerSubmenu(0)}
                                    />
                                    :
                                    <FaRegPlusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                                    onClick={()=>openInnerSubmenu(0)}
                                    />
                                }

                                {
                                    innerSubmenuIndex === 0 && (
                                        <ul className='w-full pl-3 inner_submenu'>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Smart Tablet
                                            </Link>                                
                                        </li>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Crepe T-shirt
                                            </Link>                                
                                        </li>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Leather Watch
                                            </Link>                                
                                        </li>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Rolling Diamond
                                            </Link>                                
                                        </li>
                                    </ul>
                                    )
                                }

                            </li>
                        </ul>
                        )
                    }

                    
                </li>

                <li className='relative flex flex-col items-center list-none'>
                    <Link href='/' className='w-full'>
                        <button type="button" className='w-full text-left flex items-center justify-start px-3 py-2 text-[14px] font-[500] text-[rgba(0,0,0,0.8)] hover:bg-gray-50 rounded transition-colors'>
                            Outwear
                        </button>
                    </Link>
                    {
                        submenuIndex === 1 ?
                        <FaRegMinusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                        onClick={()=>openSubmenu(1)}
                        />
                        :
                        <FaRegPlusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                        onClick={()=>openSubmenu(1)}
                        />
                    }

                    {
                        submenuIndex === 1 && (
                        <ul className='w-full pl-3 submenu'>
                            <li className='relative list-none'>
                                <Link href='/' className='w-full'>
                                    <button type="button" className='w-full text-left flex items-center justify-start px-3 py-2 text-[14px] font-[500] text-[rgba(0,0,0,0.8)] hover:bg-gray-50 rounded transition-colors'>
                                        Apparel
                                    </button>
                                </Link>
                                {
                                    innerSubmenuIndex === 1 ?
                                    <FaRegMinusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                                    onClick={()=>openInnerSubmenu(1)}
                                    />
                                    :
                                    <FaRegPlusSquare className='absolute top-[10px] right-[15px] cursor-pointer' 
                                    onClick={()=>openInnerSubmenu(1)}
                                    />
                                }

                                {
                                    innerSubmenuIndex === 1 && (
                                        <ul className='w-full pl-3 inner_submenu'>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Smart Tablet
                                            </Link>                                
                                        </li>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Crepe T-shirt
                                            </Link>                                
                                        </li>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Leather Watch
                                            </Link>                                
                                        </li>
                                        <li className='relative mb-1 list-none'>
                                            <Link href='/' className='link w-full !text-left !justify-start !px-3 transition text-[14px]'>
                                                Rolling Diamond
                                            </Link>                                
                                        </li>
                                    </ul>
                                    )
                                }

                            </li>
                        </ul>
                        )
                    }

                    
                </li>
            </ul>
        </div>
    </>
  )
}

export default CategoryCollapse