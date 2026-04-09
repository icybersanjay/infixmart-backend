import React, { useContext, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { RiFolderUploadFill } from "react-icons/ri";
import { FaRegUser, FaRegHeart, FaMapMarkerAlt } from "react-icons/fa";
import { LuClipboardCheck } from "react-icons/lu";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { NavLink } from "react-router-dom";
import NextImage from "next/image";
import { MyContext } from "../../LegacyProviders";
import CircularProgress from "@mui/material/CircularProgress";
import { putDataForImage } from "../../utils/api";
import { imgUrl } from "../../utils/imageUrl";
import useLogout from "../../hooks/useLogout";

const AccountSidebar = () => {
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const context = useContext(MyContext);
  const logout = useLogout();

  useEffect(() => {
    if (context?.userData?.avatar) setPreviews([context.userData.avatar]);
  }, [context?.userData]);

  const onChangeFile = async (e) => {
    const files = e.target.files;
    const allowed = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];
    const formdata = new FormData();
    setUploading(true);
    for (let file of files) {
      if (!allowed.includes(file.type)) {
        context.openAlertBox('error', 'Please select a valid JPG/JPEG/PNG/WEBP image.');
        setUploading(false);
        return;
      }
      formdata.append('avatar', file);
    }
    const res = await putDataForImage('/api/user/user-avatar', formdata);
    setUploading(false);
    if (res?.avatar) setPreviews([res.avatar]);
  };

  const avatarSrc = previews[0]
    ? imgUrl(previews[0])
    : context?.userData?.avatar
      ? imgUrl(context.userData.avatar)
      : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  const navCls = ({ isActive }) =>
    `flex py-2 px-5 text-left justify-start items-center w-full gap-2 rounded-none text-[13px] font-[500] transition-colors ${isActive ? 'text-[#1565C0] bg-[#e3f0ff]' : 'text-[rgba(0,0,0,0.7)] hover:text-[#1565C0] hover:bg-[#f0f5ff]'}`;

  return (
    <div className="sticky bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)] card top-[80px]">
      {/* Avatar */}
      <div className="flex flex-col items-center justify-center w-full p-5 border-b border-gray-100">
        <div className="w-[90px] h-[90px] mb-3 rounded-full relative overflow-hidden group flex items-center justify-center bg-gray-100">
          {uploading ? (
            <CircularProgress size={28} />
          ) : (
            <NextImage src={avatarSrc} alt="profile" fill className="object-cover" sizes="90px" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.55)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <RiFolderUploadFill className="text-white text-[18px]" />
            <input
              type="file"
              onChange={onChangeFile}
              name="avatar"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <h3 className="text-[15px] font-[600] text-gray-800">{context?.userData?.name}</h3>
        <p className="text-[12px] text-gray-500 mb-0 mt-0">{context?.userData?.email}</p>
      </div>

      {/* Nav links */}
      <ul className="list-none py-2 myAccountTabs">
        <li>
          <NavLink to="/my-account" className={navCls}>
            <FaRegUser className="text-[16px]" /> My Profile
          </NavLink>
        </li>
        <li>
          <NavLink to="/my-list" className={navCls}>
            <FaRegHeart className="text-[16px]" /> My Wishlist
          </NavLink>
        </li>
        <li>
          <NavLink to="/my-orders" className={navCls}>
            <LuClipboardCheck className="text-[16px]" /> My Orders
          </NavLink>
        </li>
        <li>
          <NavLink to="/my-address" className={navCls}>
            <FaMapMarkerAlt className="text-[16px]" /> My Addresses
          </NavLink>
        </li>
        <li className="border-t border-gray-100 mt-1 pt-1">
          <button
            onClick={logout}
            className="flex py-2 px-5 text-left justify-start items-center w-full gap-2 text-[13px] font-[500] text-[#E53935] hover:bg-red-50 transition-colors"
          >
            <RiLogoutBoxRLine className="text-[16px]" /> Logout
          </button>
        </li>
      </ul>
    </div>
  );
};

export default AccountSidebar;
