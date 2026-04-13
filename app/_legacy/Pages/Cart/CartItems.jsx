import React, { useState } from 'react'
import Link from 'next/link';
import { IoClose } from "react-icons/io5";
import { FaAngleDown } from "react-icons/fa";
import { FaAngleUp } from "react-icons/fa";


import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Rating } from '@mui/material';

const CartItems = (props) => {
    // State for size selection
    const [sizeAnchorEl, setSizeAnchorEl] = useState(null);
    const [selectedSize, setSelectedSize] = useState(props.size);
    const openSize = Boolean(sizeAnchorEl);
    
    // State for quantity selection
    const [qtyAnchorEl, setQtyAnchorEl] = useState(null);
    const [selectedQty, setSelectedQty] = useState(props.qty);
    const openQty = Boolean(qtyAnchorEl);
    
    // Handlers for size selection
    const handleClickSize = (event) => {
        setSizeAnchorEl(event.currentTarget);
    };
    const handleCloseSize = (value) => {
        setSizeAnchorEl(null);
        if (value !== null) {
            setSelectedSize(value)
        }
    }

    // Handlers for quantity selection
    const handleClickQty = (event) => {
        setQtyAnchorEl(event.currentTarget);
    };
    const handleCloseQty = (value) => {
        setQtyAnchorEl(null);
        if (value !== null) {
            setSelectedQty(value)
        }
    }

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

                            <div className='flex items-center gap-4 mt-2'>
                                <div className='relative'>
                                    <span 
                                    className='flex py-1 px-2 items-center justify-center bg-[#f1f1f1] text-[12px] font-[600] rounded-md cursor-pointer'
                                    onClick={handleClickSize}
                                    >
                                        Size: {selectedSize} <FaAngleDown className='text-[14px] ml-1'/>
                                    </span>

                                    <Menu
                                        id="size-menu"
                                        anchorEl={sizeAnchorEl}
                                        open={openSize}
                                        onClose={()=>handleCloseSize(null)}
                                        slotProps={{
                                        list: {
                                            'aria-labelledby': 'basic-button',
                                        },
                                        }}
                                    >
                                        <MenuItem onClick={()=>handleCloseSize('S')}>S</MenuItem>
                                        <MenuItem onClick={()=>handleCloseSize('M')}>M</MenuItem>
                                        <MenuItem onClick={()=>handleCloseSize('L')}>L</MenuItem>
                                        <MenuItem onClick={()=>handleCloseSize('XL')}>XL</MenuItem>
                                        <MenuItem onClick={()=>handleCloseSize('XXL')}>XXL</MenuItem>
                                    </Menu>
                                </div>
                                <div>
                                    <span className='flex py-1 px-2 items-center justify-center bg-[#f1f1f1] text-[12px] font-[600] rounded-md cursor-pointer'
                                    onClick={handleClickQty}
                                    >
                                        Qty: {selectedQty} <FaAngleDown className='text-[14px] ml-1'/>
                                    </span>

                                    <Menu
                                        id="size-menu"
                                        anchorEl={qtyAnchorEl}
                                        open={openQty}
                                        onClose={()=>handleCloseQty(null)}
                                        slotProps={{
                                        list: {
                                            'aria-labelledby': 'basic-button',
                                        },
                                        }}
                                    >
                                        <MenuItem onClick={()=>handleCloseQty(1)}>1</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(2)}>2</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(3)}>3</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(4)}>4</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(5)}>5</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(6)}>6</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(7)}>7</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(8)}>8</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(9)}>9</MenuItem>
                                        <MenuItem onClick={()=>handleCloseQty(10)}>10</MenuItem>
                                    </Menu>
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