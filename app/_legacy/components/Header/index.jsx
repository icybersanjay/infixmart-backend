"use client";

import React, { useContext, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import logo from '../../assets/logo.webp';
import Search from '../Search';
import DropdownMenu, { MenuItem } from '../ui/DropdownMenu';
import { MdOutlineShoppingCart } from 'react-icons/md';
import { FaHeart, FaRegHeart, FaRegUser, FaMapMarkerAlt, FaWhatsapp } from 'react-icons/fa';
import { RiMenu3Line, RiLogoutBoxRLine } from 'react-icons/ri';
import { LuClipboardCheck } from 'react-icons/lu';
import { IoClose } from 'react-icons/io5';
import Navigation from './Navigation';
import { MyContext } from '../../LegacyProviders';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import useLogout from '../../hooks/useLogout';

const logoSrc = typeof logo === 'string' ? logo : logo?.src || '';

// Tiny badge replacing MUI <Badge>. Wraps an icon and absolutely-positions
// the count pill at the top-right.
const Badge = ({ count, children }) => (
  <span className="relative inline-flex">
    {children}
    {count > 0 && (
      <span
        className="absolute -right-1 top-0 min-w-[17px] h-[17px] px-1 rounded-full bg-[#E53935] text-white text-[9px] font-[800] flex items-center justify-center border-2 border-white"
        aria-label={`${count} items`}
      >
        {count}
      </span>
    )}
  </span>
);

const TICKER_MSGS = [
  '🏷️  Products starting @ just ₹29',
  '🚚  Free Shipping on orders above ₹999',
  '💵  COD available on orders above ₹299',
  '↩️  Easy 3-Day Return Policy',
  '✅  Min Order Value: ₹999 — Single or Bulk',
  '🔒  100% Genuine & Quality Checked Products',
];

const Header = () => {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const accountTriggerRef = useRef(null);
  const drawerRef = useRef(null);

  const context          = useContext(MyContext);
  const { cartCount, lastAddedAt }    = useCart();
  const { wishlistCount} = useWishlist();
  const logout           = useLogout();
  const [cartPulse, setCartPulse]    = useState(false);

  const closeMobile     = () => setMobileOpen(false);
  const handleLogout    = async () => { setAccountOpen(false); await logout(); };

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeMobile(); };
    document.addEventListener('keydown', onKey);
    // Prevent body scroll when drawer is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Cart icon bounce when an item is added (driven by CartContext.lastAddedAt).
  useEffect(() => {
    if (!lastAddedAt) return;
    setCartPulse(true);
    const t = setTimeout(() => setCartPulse(false), 750);
    return () => clearTimeout(t);
  }, [lastAddedAt]);

  // Backdrop-blur on scroll: flips a class once the page has scrolled past the
  // ticker. rAF-throttled so the listener stays cheap.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 12);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const tickerText = TICKER_MSGS.join('   •   ');

  return (
    <header className='w-full sticky top-0 z-40'>

      {/* ── 1. Announcement Ticker ── */}
      <div className='bg-[#1565C0] text-white overflow-hidden py-1.5'>
        <div className='ticker-track text-[10px] sm:text-[12px] font-[500] tracking-wide'>
          {tickerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerText}
        </div>
      </div>

      {/* ── 2. Main Header ── */}
      <div className={`infix-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className='container'>

          {/* Top utility row — contact + links (desktop only) */}
          <div className='hidden md:flex items-center justify-between py-1.5 border-b border-gray-100 text-[11.5px] text-gray-500'>
            <div className='flex items-center gap-1.5 flex-wrap'>
              <FaWhatsapp className='text-[#25D366] text-[13px]' />
              <span>Need help?&nbsp;</span>
              <a href='https://wa.me/918849047148' className='font-[600] text-gray-700 hover:text-[#1565C0] transition-colors'>
                WhatsApp: +91 88490 47148
              </a>
              <span className='mx-2 opacity-30'>|</span>
              <a href='mailto:support@infixmart.com' className='hover:text-[#1565C0] transition-colors'>
                support@infixmart.com
              </a>
            </div>
            <div className='flex items-center gap-4'>
              <Link href='/blog'       className='hover:text-[#1565C0] transition-colors'>Wholesale Tips</Link>
              <span className='opacity-30'>|</span>
              <Link href='/my-orders'  className='hover:text-[#1565C0] transition-colors'>Track Order</Link>
              <span className='opacity-30'>|</span>
              {!context.isLogin
                ? <Link href='/login' className='hover:text-[#1565C0] transition-colors font-[600]'>Login / Register</Link>
                : <span className='text-gray-600 font-[600] capitalize'>{context?.userData?.name}</span>
              }
            </div>
          </div>

          {/* Main row: logo + search + icons */}
          <div className='flex items-center gap-2 sm:gap-4 h-[56px] sm:h-[68px]'>

            {/* Logo */}
            <Link href='/' className='flex-shrink-0 mr-1 sm:mr-2'>
              <NextImage src={logoSrc} alt='InfixMart' width={140} height={36} className='h-7 sm:h-9 object-contain w-auto' />
            </Link>

            {/* Search — desktop */}
            <div className='hidden md:flex flex-1 min-w-0'>
              <Search />
            </div>

            {/* Right icons */}
            <div className='flex items-center gap-0.5 ml-auto md:ml-0 flex-shrink-0'>

              {/* Wishlist */}
              <Link
                href='/my-list'
                aria-label={`Wishlist (${wishlistCount} items)`}
                className='flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl hover:bg-gray-50 transition-colors group'
              >
                <Badge count={wishlistCount}>
                  {wishlistCount > 0
                    ? <FaHeart className='text-[16px] sm:text-[17px] text-[#E53935]' />
                    : <FaRegHeart className='text-[16px] sm:text-[17px] text-gray-500 group-hover:text-[#1565C0] transition-colors' />
                  }
                </Badge>
                <span className='text-[9px] text-gray-400 group-hover:text-[#1565C0] mt-0.5 hidden md:block transition-colors'>
                  Wishlist
                </span>
              </Link>

              {/* Cart */}
              <Link
                href='/cart'
                aria-label={`Cart (${cartCount} items)`}
                className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl hover:bg-gray-50 transition-colors group ${cartPulse ? 'infix-badge-ping' : ''}`}
              >
                <Badge count={cartCount}>
                  <MdOutlineShoppingCart className={`text-[19px] sm:text-[20px] text-gray-500 group-hover:text-[#1565C0] transition-colors ${cartPulse ? 'infix-bounce-cart' : ''}`} />
                </Badge>
                <span className='text-[9px] text-gray-400 group-hover:text-[#1565C0] mt-0.5 hidden md:block transition-colors'>
                  Cart
                </span>
              </Link>

              {/* Account — desktop only */}
              {!context.isLogin ? (
                <div className='hidden md:flex items-center gap-2 ml-2'>
                  <Link
                    href='/login'
                    className='text-[13px] font-[500] text-gray-600 hover:text-[#1565C0] px-3 py-2 rounded-lg border border-gray-200 hover:border-[#1565C0] transition-colors'
                  >
                    Log in
                  </Link>
                  <Link
                    href='/register'
                    className='text-[13px] font-[700] bg-[#1565C0] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-lg transition-colors shadow-sm'
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <>
                  <button
                    ref={accountTriggerRef}
                    onClick={() => setAccountOpen((o) => !o)}
                    aria-label='Account menu'
                    aria-expanded={accountOpen}
                    className='hidden md:flex flex-col items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-50 transition-colors group ml-1'
                  >
                    <div className='w-[30px] h-[30px] rounded-full bg-[#EEF4FF] flex items-center justify-center border-2 border-[#1565C0]'>
                      <FaRegUser className='text-[#1565C0] text-[11px]' />
                    </div>
                    <span className='text-[9px] text-gray-400 group-hover:text-[#1565C0] mt-0.5 transition-colors'>Account</span>
                  </button>

                  <DropdownMenu
                    open={accountOpen}
                    onClose={() => setAccountOpen(false)}
                    anchorRef={accountTriggerRef}
                    className='!min-w-[220px] !rounded-[14px] !py-0 overflow-hidden'
                  >
                    <div className='px-4 py-3 bg-[#F5F8FF] border-b border-gray-100'>
                      <div className='flex items-center gap-2.5'>
                        <div className='w-9 h-9 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0'>
                          <FaRegUser className='text-white text-[12px]' />
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[13px] font-[700] text-gray-800 capitalize truncate'>{context?.userData?.name}</p>
                          <p className='text-[11px] text-gray-400 truncate'>{context?.userData?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className='py-1'>
                      <Link href='/my-account' onClick={() => setAccountOpen(false)} className='flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 hover:bg-[#EEF4FF] transition-colors'>
                        <FaRegUser className='text-[#1565C0] text-[12px]' /> My Profile
                      </Link>
                      <Link href='/my-orders' onClick={() => setAccountOpen(false)} className='flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 hover:bg-[#EEF4FF] transition-colors'>
                        <LuClipboardCheck className='text-[#1565C0] text-[13px]' /> My Orders
                      </Link>
                      <Link href='/my-list' onClick={() => setAccountOpen(false)} className='flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 hover:bg-[#EEF4FF] transition-colors'>
                        <FaRegHeart className='text-[#1565C0] text-[12px]' /> Wishlist
                      </Link>
                      <Link href='/my-address' onClick={() => setAccountOpen(false)} className='flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 hover:bg-[#EEF4FF] transition-colors'>
                        <FaMapMarkerAlt className='text-[#1565C0] text-[12px]' /> Addresses
                      </Link>
                    </div>
                    <div className='border-t border-gray-100 py-1'>
                      <button type='button' onClick={handleLogout} className='w-full flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-lg text-[13px] text-red-500 hover:bg-red-50 transition-colors text-left'>
                        <RiLogoutBoxRLine className='text-[13px]' /> Log out
                      </button>
                    </div>
                  </DropdownMenu>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                className='md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors ml-1'
                onClick={() => setMobileOpen(true)}
                aria-label='Open menu'
                aria-expanded={mobileOpen}
              >
                <RiMenu3Line className='text-[22px] text-gray-700' />
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className='md:hidden pb-1.5 pt-0'>
            <Search />
          </div>
        </div>
      </div>

      {/* ── 3. Category nav (desktop) ── */}
      <Navigation />

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className='mobile-overlay fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60]'
            onClick={closeMobile}
            aria-hidden='true'
          />
          {/* Drawer panel */}
          <div
            ref={drawerRef}
            role='dialog'
            aria-modal='true'
            aria-label='Navigation menu'
            className='mobile-drawer fixed top-0 left-0 h-full w-[290px] max-w-[85vw] bg-white z-[70] shadow-2xl flex flex-col'
          >

            {/* Drawer header */}
            <div className='flex items-center justify-between px-5 h-[60px] bg-[#1565C0] flex-shrink-0'>
              <div>
                <NextImage src={logoSrc} alt='InfixMart' width={120} height={28} className='h-7 object-contain brightness-0 invert w-auto' />
                <span className='text-[7px] font-[800] tracking-[3px] text-blue-200 uppercase'>WHOLESALE</span>
              </div>
              <button
                onClick={closeMobile}
                aria-label='Close menu'
                className='w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors'
              >
                <IoClose className='text-white text-[18px]' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto overscroll-contain'>
              {/* Auth block */}
              <div className='p-4 bg-[#F5F8FF] border-b border-gray-100'>
                {context.isLogin ? (
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0'>
                      <FaRegUser className='text-white text-[13px]' />
                    </div>
                    <div className='min-w-0'>
                      <p className='text-[14px] font-[700] text-gray-800 capitalize truncate'>{context?.userData?.name}</p>
                      <p className='text-[11px] text-gray-400 truncate'>{context?.userData?.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className='flex gap-2'>
                    <Link href='/login' onClick={closeMobile}
                      className='flex-1 py-2.5 text-center border-2 border-[#1565C0] text-[#1565C0] rounded-xl text-[13px] font-[600] hover:bg-[#EEF4FF] active:bg-[#EEF4FF] transition-colors'>
                      Log in
                    </Link>
                    <Link href='/register' onClick={closeMobile}
                      className='flex-1 py-2.5 text-center bg-[#1565C0] text-white rounded-xl text-[13px] font-[700] hover:bg-[#0D47A1] active:bg-[#0D47A1] transition-colors'>
                      Sign up
                    </Link>
                  </div>
                )}
              </div>

              {/* Nav links */}
              <nav aria-label='Mobile navigation'>
                {[
                  { to: '/',               label: 'Home',         icon: '🏠' },
                  { to: '/productListing', label: 'All Products',  icon: '🛍️' },
                  { to: '/my-orders',      label: 'My Orders',    icon: '📦' },
                  { to: '/my-list',        label: 'Wishlist',     icon: '❤️' },
                  { to: '/my-address',     label: 'Addresses',    icon: '📍' },
                  { to: '/my-account',     label: 'Profile',      icon: '👤' },
                  { to: '/blog',           label: 'Blog',         icon: '📰' },
                ].map(({ to, label, icon }) => (
                  <Link
                    key={to}
                    href={to}
                    onClick={closeMobile}
                    className='flex items-center justify-between px-5 py-3.5 text-[14px] text-gray-700 hover:text-[#1565C0] hover:bg-[#EEF4FF] active:bg-[#EEF4FF] transition-colors border-b border-gray-50'
                  >
                    <span className='flex items-center gap-3'><span>{icon}</span>{label}</span>
                    <span className='text-gray-300 text-[18px]'>›</span>
                  </Link>
                ))}
              </nav>

              {/* Min order info */}
              <div className='mx-4 my-4 bg-[#EEF4FF] border border-[#C5D9F5] rounded-2xl p-4'>
                <p className='text-[10px] font-[700] text-[#1565C0] uppercase tracking-widest mb-1'>Min Order Value</p>
                <p className='text-[26px] font-[900] text-gray-800 leading-none'>₹999</p>
                <p className='text-[11px] text-gray-500 mt-1'>Free shipping on all orders above ₹999</p>
              </div>

              {context.isLogin && (
                <div className='px-4 pb-6'>
                  <button
                    onClick={() => { closeMobile(); logout(); }}
                    className='w-full flex items-center justify-center gap-2 py-3 text-red-500 text-[13px] font-[600] border-2 border-red-100 rounded-xl hover:bg-red-50 active:bg-red-50 transition-colors'
                  >
                    <RiLogoutBoxRLine /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </header>
  );
};

export default Header;
