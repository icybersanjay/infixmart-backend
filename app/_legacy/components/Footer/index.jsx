import React from 'react';
import { Link } from 'react-router-dom';
import NextImage from 'next/image';
import logo from '../../assets/logo.webp';
import { FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp, FaLinkedinIn, FaTwitter } from 'react-icons/fa';
import { MdLocalShipping, MdVerified, MdSupportAgent } from 'react-icons/md';
import { FaShieldAlt, FaUndo } from 'react-icons/fa';
import { HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';

const logoSrc = typeof logo === 'string' ? logo : logo?.src || '';

/* ── Quick links data ── */
const POLICIES = [
  { label: 'Terms & Conditions',        to: '/terms' },
  { label: 'Shipping Policy',           to: '/shipping-policy' },
  { label: 'Return & Refund Policy',    to: '/return-policy' },
  { label: 'Payment & Security',        to: '/payment-security' },
  { label: 'Privacy Policy',            to: '/privacy-policy' },
  { label: 'Order Cancellation',        to: '/cancellation-policy' },
];

const QUICK_LINKS = [
  { label: 'All Products',   to: '/productListing'            },
  { label: 'New Arrivals',   to: '/productListing?sort=newest'     },
  { label: 'Best Sellers',   to: '/productListing?sort=bestseller' },
  { label: 'On Sale',        to: '/productListing?onSale=true'     },
  { label: 'Bulk Deals',     to: '/productListing?sort=popular'    },
  { label: 'Blog',           to: '/blog'                      },
];

const ACCOUNT_LINKS = [
  { label: 'My Account',  to: '/my-account' },
  { label: 'My Orders',   to: '/my-orders'  },
  { label: 'Wishlist',    to: '/my-list'    },
  { label: 'Addresses',   to: '/my-address' },
  { label: 'Track Order', to: '/my-orders'  },
  { label: 'Login',       to: '/login'      },
];

const TRUST = [
  { icon: <MdLocalShipping className='text-[1.8rem]' />, bg: '#EEF4FF', color: '#1565C0', title: 'Free Shipping', sub: 'Orders above ₹999' },
  { icon: <FaUndo          className='text-[1.6rem]' />, bg: '#E8F5E9', color: '#2E7D32', title: '3-Day Returns', sub: 'Hassle-free policy' },
  { icon: <FaShieldAlt     className='text-[1.6rem]' />, bg: '#FFF3E0', color: '#E65100', title: 'Secure Payment', sub: 'Cards, UPI & COD'  },
  { icon: <MdVerified      className='text-[1.8rem]' />, bg: '#F3E5F5', color: '#6A1B9A', title: '100% Genuine',  sub: 'Quality certified'  },
  { icon: <MdSupportAgent  className='text-[1.8rem]' />, bg: '#E0F2F1', color: '#00695C', title: '24/7 Support',  sub: 'Always here for you' },
];

const SOCIALS = [
  { icon: <FaFacebookF />,  href: '#', label: 'Facebook'  },
  { icon: <FaInstagram />,  href: '#', label: 'Instagram' },
  { icon: <FaYoutube />,    href: '#', label: 'YouTube'   },
  { icon: <FaWhatsapp />,   href: 'https://wa.me/918871488214', label: 'WhatsApp' },
  { icon: <FaLinkedinIn />, href: '#', label: 'LinkedIn'  },
  { icon: <FaTwitter />,    href: '#', label: 'Twitter'   },
];

const Footer = () => (
  <footer className='bg-white border-t border-gray-200'>

    {/* Trust strip */}
    <div className='bg-[#F5F7FF] border-b border-gray-200'>
      <div className='container'>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0 divide-x divide-gray-200'>
          {TRUST.map((t, i) => (
            <div key={i} className='flex items-center gap-3 py-5 px-4'>
              <div className='w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0' style={{ background: t.bg, color: t.color }}>
                {t.icon}
              </div>
              <div>
                <p className='text-[13px] font-[700] text-gray-800 leading-tight'>{t.title}</p>
                <p className='text-[11px] text-gray-400 leading-tight mt-0.5'>{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Main footer body */}
    <div className='container py-12'>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>

        {/* Col 1 — Brand + contact */}
        <div>
          <Link to='/' className='flex flex-col items-start mb-4'>
            <NextImage src={logoSrc} alt='InfixMart' width={140} height={36} className='h-9 object-contain w-auto' />
            <span className='text-[7.5px] font-[900] tracking-[3px] uppercase text-[#1565C0] mt-0.5'>WHOLESALE</span>
          </Link>
          <p className='text-[13px] text-gray-500 leading-relaxed mb-5'>
            India's trusted wholesale store. Buy single pieces or bulk — best prices on 10,000+ genuine products.
          </p>

          <div className='flex flex-col gap-2.5 mb-5'>
            <a
              href='https://wa.me/918871488214'
              className='flex items-center gap-2.5 text-[13px] text-gray-600 hover:text-[#1565C0] transition-colors'
            >
              <FaWhatsapp className='text-[#25D366] text-[16px] flex-shrink-0' />
              +91 88714 88214
            </a>
            <a
              href='mailto:support@infixmart.com'
              className='flex items-center gap-2.5 text-[13px] text-gray-600 hover:text-[#1565C0] transition-colors'
            >
              <HiOutlineMail className='text-[#1565C0] text-[16px] flex-shrink-0' />
              support@infixmart.com
            </a>
            <span className='flex items-center gap-2.5 text-[13px] text-gray-500'>
              <HiOutlinePhone className='text-[#1565C0] text-[16px] flex-shrink-0' />
              Mon–Sat, 9:30 AM – 6:00 PM
            </span>
          </div>

          {/* Social icons */}
          <div className='flex items-center gap-2'>
            {SOCIALS.map((s, i) => (
              <a
                key={i}
                href={s.href}
                target='_blank'
                rel='noreferrer'
                aria-label={s.label}
                className='w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-[#1565C0] hover:border-[#1565C0] hover:text-white transition-all duration-200 text-[13px]'
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Col 2 — Policies */}
        <div>
          <h3 className='text-[15px] font-[800] text-gray-900 mb-4'>Policies</h3>
          <ul className='space-y-2.5'>
            {POLICIES.map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className='text-[13px] text-gray-500 hover:text-[#1565C0] transition-colors flex items-center gap-1.5'
                >
                  <span className='w-1 h-1 rounded-full bg-gray-300 flex-shrink-0' />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Quick Links */}
        <div>
          <h3 className='text-[15px] font-[800] text-gray-900 mb-4'>Quick Links</h3>
          <ul className='space-y-2.5'>
            {QUICK_LINKS.map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className='text-[13px] text-gray-500 hover:text-[#1565C0] transition-colors flex items-center gap-1.5'
                >
                  <span className='w-1 h-1 rounded-full bg-gray-300 flex-shrink-0' />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — Account */}
        <div>
          <h3 className='text-[15px] font-[800] text-gray-900 mb-4'>My Account</h3>
          <ul className='space-y-2.5 mb-6'>
            {ACCOUNT_LINKS.map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className='text-[13px] text-gray-500 hover:text-[#1565C0] transition-colors flex items-center gap-1.5'
                >
                  <span className='w-1 h-1 rounded-full bg-gray-300 flex-shrink-0' />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Min order badge */}
          <div className='bg-[#EEF4FF] border border-[#C5D9F5] rounded-2xl p-4'>
            <p className='text-[10px] font-[700] text-[#1565C0] uppercase tracking-widest mb-1'>Min Order Value</p>
            <p className='text-[24px] font-[900] text-gray-800 leading-none'>₹999</p>
            <p className='text-[11px] text-gray-500 mt-1'>Free shipping on orders above ₹999</p>
          </div>
        </div>

      </div>
    </div>

    {/* Bottom bar */}
    <div className='border-t border-gray-200 bg-[#F5F7FF]'>
      <div className='container flex flex-col sm:flex-row items-center justify-between gap-3 py-4'>

        <p className='text-[12px] text-gray-500 text-center sm:text-left'>
          © {new Date().getFullYear()} InfixMart Wholesale. All rights reserved.
        </p>

        {/* Payment logos (text-based badges for reliability) */}
        <div className='flex items-center gap-2 flex-wrap justify-center'>
          {['Visa', 'Mastercard', 'UPI', 'PayPal', 'RuPay', 'COD'].map((method) => (
            <span
              key={method}
              className='px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[10px] font-[700] text-gray-600'
            >
              {method}
            </span>
          ))}
        </div>
      </div>
    </div>

  </footer>
);

export default Footer;
