"use client";

import React from 'react';
import { IoMdClose } from "react-icons/io";
import CategoryCollapse from '../../CategoryCollapse';
import SlideOver from '../../ui/SlideOver';

const CategoryPanel = (props) => {
  const close = () => props.openCategoryPanel(false);

  return (
    <SlideOver open={!!props.isopenCatPanel} onClose={close} side="left" width="w-[250px]">
      <div className="categoryPanel h-full overflow-y-auto" role="presentation">
        <h3 className='p-3 text-[16px] font-[500] flex items-center justify-between'>
          Shop By Categories
          <IoMdClose onClick={close} className='cursor-pointer text-[20px]' />
        </h3>
        <CategoryCollapse />
      </div>
    </SlideOver>
  );
};

export default CategoryPanel;
