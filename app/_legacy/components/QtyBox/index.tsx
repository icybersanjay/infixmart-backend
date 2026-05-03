"use client";

import { useState } from 'react';
import { FaMinus, FaPlus } from "react-icons/fa";

const QtyBox = () => {
    const [qtyVal, setQtyValue] = useState(1);

    const plusQty = () => setQtyValue((q) => q + 1);
    const minusQty = () => setQtyValue((q) => (q <= 1 ? 1 : q - 1));

    return (
        <div className='qtyBox flex items-center border border-[rgba(0,0,0,0.2)] rounded-md overflow-hidden h-[44px] w-full select-none'>
            <button
                type='button'
                aria-label='Decrease quantity'
                onClick={minusQty}
                className='w-[44px] h-[44px] flex items-center justify-center bg-[#f8f9fb] hover:bg-[#1565C0] hover:text-white active:bg-[#0d47a1] transition-colors disabled:opacity-50'
                disabled={qtyVal <= 1}
            >
                <FaMinus className='text-[12px]' />
            </button>
            <input
                type='number'
                inputMode='numeric'
                aria-label='Quantity'
                className='flex-1 min-w-0 h-full text-center text-[15px] font-[600] focus:outline-none border-x border-[rgba(0,0,0,0.2)]'
                value={qtyVal}
                readOnly
            />
            <button
                type='button'
                aria-label='Increase quantity'
                onClick={plusQty}
                className='w-[44px] h-[44px] flex items-center justify-center bg-[#f8f9fb] hover:bg-[#1565C0] hover:text-white active:bg-[#0d47a1] transition-colors'
            >
                <FaPlus className='text-[12px]' />
            </button>
        </div>
    );
};

export default QtyBox;
