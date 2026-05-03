"use client";

import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoTrashOutline } from 'react-icons/io5';
import { FaMinus, FaPlus, FaTruck, FaCheck, FaTag, FaTimes } from 'react-icons/fa';
import { MdOutlineShoppingCart, MdWorkspacePremium } from 'react-icons/md';
import { BsArrowRight } from 'react-icons/bs';
import { useCart } from '../../../_legacy/context/CartContext';
import { imgUrl } from '../../../_legacy/utils/imageUrl';
import AnimatedNumber from '../../../_legacy/components/AnimatedNumber';
import EmptyState from '../../../_legacy/components/EmptyState';
import useStoreSettings from '../../../_legacy/hooks/useStoreSettings';
import CartTimeline from '../../../_legacy/components/CartTimeline';
import { MyContext } from '../../../_legacy/LegacyProviders';
import { postData } from '../../../_legacy/utils/api';

const PENDING_COUPON_KEY = 'infixmart_pending_coupon';

const MEMBER_MIN_ORDER = 499;

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const SHIPPING_COST = 49;

const CartItemRow = ({ item }) => {
  const { updateQty, removeItem } = useCart();
  const [qty, setQty] = useState(item.quantity || 1);
  const debounceRef = useRef(null);

  const product = item.productId; // populated product object from backend
  const variant = item.variant || null; // first-class variant when selected
  const image = imgUrl(
    Array.isArray(product?.images) ? product.images[0] : product?.images?.[0]
  );
  // Variant price/stock authoritative when one was picked. The repo also
  // exposes `item.unitPrice` / `item.unitStock` directly for new callers,
  // but we resolve from the variant here to stay defensive against shapes
  // that pre-date the variants rollout.
  const price = variant ? Number(variant.price || 0) : (product?.price || 0);
  const lineTotal = price * qty;

  const handleQtyChange = (newQty) => {
    if (newQty < 1) return;
    setQty(newQty);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateQty(item.id, newQty);
    }, 400);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className='flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-b border-[rgba(0,0,0,0.08)] last:border-b-0'>
      {/* Image */}
      <Link href={`/product/${product?.id}`} className='flex-shrink-0'>
        <img
          src={image || 'https://via.placeholder.com/80'}
          alt={product?.name}
          className='w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] object-cover rounded-lg border border-gray-100'
        />
      </Link>

      {/* Info */}
      <div className='flex-1 min-w-0'>
        {product?.brand && (
          <p className='text-[12px] text-gray-400 mb-0 mt-0 leading-4'>{product.brand}</p>
        )}
        <Link href={`/product/${product?.id}`} className='font-[500] text-[13px] sm:text-[14px] hover:text-[#1565C0] transition-colors line-clamp-2 block'>
          {product?.name}
        </Link>

        {/* Variant tag — render the variant's display name + SKU when one
            was picked at add-to-cart time. Older cart rows from before the
            variants rollout have no `item.variant`, so this stays hidden. */}
        {variant && (
          <span className='inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-[#1565C0] text-[11px] font-[600] px-2 py-0.5 rounded mt-1'>
            {variant.name}
            {variant.sku && (
              <span className='text-gray-400 font-[400]'>· {variant.sku}</span>
            )}
          </span>
        )}

        <div className='flex items-center gap-x-3 gap-y-1.5 mt-2 flex-wrap'>
          {/* Qty stepper */}
          <div className='flex items-center border border-[#1565C0] rounded overflow-hidden'>
            <button
              className='w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center bg-[#f0f5ff] hover:bg-[#1565C0] hover:text-white active:bg-[#0d47a1] transition-colors'
              aria-label='Decrease quantity'
              onClick={() => handleQtyChange(qty - 1)}
            >
              <FaMinus className='text-[11px]' />
            </button>
            <span className='w-10 sm:w-8 text-center text-[14px] sm:text-[13px] font-[600]'>{qty}</span>
            <button
              className='w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center bg-[#f0f5ff] hover:bg-[#1565C0] hover:text-white active:bg-[#0d47a1] transition-colors'
              aria-label='Increase quantity'
              onClick={() => handleQtyChange(qty + 1)}
            >
              <FaPlus className='text-[11px]' />
            </button>
          </div>

          {/* Unit price */}
          <span className='text-[11px] sm:text-[13px] text-gray-500 whitespace-nowrap'>₹{fmt(price)} × {qty}</span>

          {/* Line total */}
          <span className='text-[14px] font-[700] text-[#1565C0] ml-auto sm:ml-0 whitespace-nowrap'>₹{fmt(lineTotal)}</span>
        </div>
      </div>

      {/* Remove */}
      <button
        className='flex-shrink-0 text-[#E53935] hover:bg-red-50 w-9 h-9 rounded-full flex items-center justify-center transition-colors mt-0'
        onClick={() => removeItem(item.id)}
        aria-label='Remove item'
        title='Remove'
      >
        <IoTrashOutline className='text-[18px]' />
      </button>
    </div>
  );
};

const CartPage = () => {
  const { cartItems } = useCart();
  const router = useRouter();
  const { minOrderValue, cartMilestones, membershipPrice, membershipEnabled } = useStoreSettings();
  const { userData, isLogin, openMembershipModal } = useContext(MyContext);

  const isMember = Boolean(userData?.is_member);
  const effectiveMinOrder = isMember ? MEMBER_MIN_ORDER : minOrderValue;

  const subtotal = cartItems.reduce((sum, item) => {
    // Prefer the variant's price when one was selected; fall back to product.
    const price = item.variant
      ? Number(item.variant.price || 0)
      : (item.productId?.price || 0);
    return sum + price * (item.quantity || 1);
  }, 0);

  // ── Coupon (validated here, applied for real on checkout) ──
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // {code, discount, message}
  const [couponMsg, setCouponMsg] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const persistPendingCoupon = useCallback((code) => {
    try {
      if (code) localStorage.setItem(PENDING_COUPON_KEY, code);
      else localStorage.removeItem(PENDING_COUPON_KEY);
    } catch {}
  }, []);

  // Re-hydrate any previously-applied coupon when the cart mounts.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PENDING_COUPON_KEY);
      if (saved) setCouponInput(saved);
    } catch {}
  }, []);

  // Re-validate the saved coupon whenever subtotal changes (qty edit, item removed).
  useEffect(() => {
    if (!appliedCoupon) return;
    if (subtotal <= 0) {
      setAppliedCoupon(null);
      persistPendingCoupon(null);
    }
  }, [subtotal, appliedCoupon, persistPendingCoupon]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponMsg('');
    setCouponError('');
    try {
      const res = await postData('/api/coupon/apply', {
        code,
        cartTotal: subtotal,
      });
      if (res && !res.error) {
        const next = { code: res.couponCode || code, discount: Number(res.discount || 0), message: res.message || 'Coupon applied!' };
        setAppliedCoupon(next);
        setCouponMsg(next.message);
        persistPendingCoupon(next.code);
      } else {
        setAppliedCoupon(null);
        setCouponError(res?.message || 'Invalid coupon code');
        persistPendingCoupon(null);
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError('Failed to apply coupon. Please try again.');
    }
    setApplyingCoupon(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg('');
    setCouponError('');
    persistPendingCoupon(null);
  };

  const parsedMilestones = Array.isArray(cartMilestones) ? cartMilestones : [];
  const freeShippingMilestone = parsedMilestones.find((m) => m.type === 'free_shipping' && m.enabled !== false);
  const milestoneShippingFree = !!(freeShippingMilestone && subtotal >= Number(freeShippingMilestone.amount));
  const shippingFree = isMember || subtotal >= minOrderValue || milestoneShippingFree;
  const shipping = shippingFree ? 0 : SHIPPING_COST;
  const couponDiscount = appliedCoupon ? Math.min(Number(appliedCoupon.discount) || 0, subtotal + shipping) : 0;
  const total = Math.max(0, subtotal + shipping - couponDiscount);

  // Aggregate "you saved" total: per-item discount (oldprice − price) × qty
  // + coupon discount + free-shipping savings (when unlocked).
  const itemDiscountTotal = cartItems.reduce((sum, it) => {
    const p = it.productId || {};
    // Variant's effective price (when selected) is what the customer actually
    // pays — compare against the parent product's `oldprice` to compute "you
    // saved". Variant rows don't have their own `oldprice` today.
    const oldP = Number(p.oldprice || 0);
    const newP = it.variant ? Number(it.variant.price || 0) : Number(p.price || 0);
    const qty = Number(it.quantity || 1);
    const perUnit = oldP > newP ? oldP - newP : 0;
    return sum + perUnit * qty;
  }, 0);
  const shippingSavings = shippingFree && !isMember ? SHIPPING_COST : 0;
  const totalSavings = itemDiscountTotal + couponDiscount + shippingSavings;
  const savingsPct = subtotal > 0
    ? Math.min(100, Math.round((totalSavings / (subtotal + shippingSavings)) * 100))
    : 0;
  const belowMinOrder = subtotal < effectiveMinOrder;
  const showMemberCTA = isLogin && !isMember && membershipEnabled && subtotal >= MEMBER_MIN_ORDER && subtotal < minOrderValue;

  if (cartItems.length === 0) {
    return (
      <section className='py-20'>
        <EmptyState
          icon={<MdOutlineShoppingCart />}
          title="Your cart is empty"
          subtitle="Looks like you haven't added anything yet."
          actionLabel="Shop Now"
          onAction={() => router.push('/productListing')}
        />
      </section>
    );
  }

  return (
    <section className='py-6 pb-12'>
      <div className='container'>
        <h1 className='text-[22px] font-[700] mb-1'>Your Cart</h1>
        <p className='text-[13px] text-gray-500 mb-5'>
          {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart
        </p>

        <div className='flex flex-col lg:flex-row gap-5 items-start'>
          {/* ── Left: item list ── */}
          <div className='flex-1 min-w-0 w-full'>
            {/* Cart progress timeline */}
            <CartTimeline cartSubtotal={subtotal} />

            <div className='bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)]'>
              {cartItems.map(item => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>

            <Link
              href='/productListing'
              className='inline-block mt-4 text-[#1565C0] text-[13px] hover:underline'
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* ── Right: summary ── */}
          <div className='w-full lg:w-[320px] lg:flex-shrink-0 lg:sticky lg:top-4'>
            <div className='bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)] p-4 sm:p-5'>
              {/* Member badge */}
              {isMember && (
                <div className='flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl px-3 py-2 mb-3'>
                  <MdWorkspacePremium className='text-amber-500 text-[18px] flex-shrink-0' />
                  <div>
                    <p className='text-[12px] font-[700] text-amber-700'>InfixPass Active</p>
                    <p className='text-[11px] text-amber-600'>Free delivery + ₹499 minimum applied</p>
                  </div>
                </div>
              )}

              <h2 className='text-[16px] font-[700] mb-4 border-b pb-3'>Price Details</h2>

              <div className='space-y-3 text-[14px]'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Subtotal ({cartItems.length} items)</span>
                  <span className='font-[500]'>
                    <AnimatedNumber value={subtotal} prefix='₹' />
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Shipping</span>
                  {shippingFree ? (
                    <span className='font-[600] text-green-600'>FREE</span>
                  ) : (
                    <span className='font-[500]'>₹{fmt(SHIPPING_COST)}</span>
                  )}
                </div>
                {milestoneShippingFree && (
                  <p className='text-[12px] font-[600] text-[#00A651] flex items-center gap-1'>
                    🚚 Free Shipping Unlocked!
                  </p>
                )}
                {appliedCoupon && couponDiscount > 0 && (
                  <div className='flex justify-between text-[#00A651]'>
                    <span className='font-[600] flex items-center gap-1'>
                      <FaTag className='text-[11px]' /> Coupon ({appliedCoupon.code})
                    </span>
                    <span className='font-[600]'>
                      − <AnimatedNumber value={couponDiscount} prefix='₹' />
                    </span>
                  </div>
                )}
              </div>

              {/* ── Coupon apply ── */}
              <div className='mt-4 pt-4 border-t'>
                {!appliedCoupon ? (
                  <>
                    <label htmlFor='cart-coupon' className='text-[12px] font-[600] text-gray-700 flex items-center gap-1 mb-2'>
                      <FaTag className='text-[11px] text-[#1565C0]' /> Have a coupon code?
                    </label>
                    <div className='flex gap-2'>
                      <input
                        id='cart-coupon'
                        type='text'
                        autoComplete='off'
                        autoCapitalize='characters'
                        spellCheck={false}
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                        placeholder='Enter code'
                        className='flex-1 min-w-0 h-11 px-3 text-[13px] uppercase border border-gray-300 rounded-md focus:outline-none focus:border-[#1565C0]'
                      />
                      <button
                        type='button'
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon || !couponInput.trim()}
                        className='h-11 px-4 text-[13px] font-[600] text-white bg-[#1565C0] rounded-md hover:bg-[#0d47a1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                      >
                        {applyingCoupon ? 'Applying…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className='text-[12px] text-[#E53935] font-[500] mt-1.5'>{couponError}</p>
                    )}
                  </>
                ) : (
                  <div className='flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2'>
                    <div className='min-w-0'>
                      <p className='text-[12px] font-[700] text-[#00A651] truncate'>
                        ✓ {appliedCoupon.code} applied
                      </p>
                      {couponMsg && (
                        <p className='text-[11px] text-green-700 truncate'>{couponMsg}</p>
                      )}
                    </div>
                    <button
                      type='button'
                      onClick={handleRemoveCoupon}
                      aria-label='Remove coupon'
                      className='w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-[#E53935] rounded-full hover:bg-red-50 transition-colors'
                    >
                      <FaTimes className='text-[12px]' />
                    </button>
                  </div>
                )}
              </div>

              <div className='border-t mt-4 pt-4 flex justify-between items-center'>
                <span className='font-[600] text-[15px]'>Total</span>
                <span className='font-[700] text-[#1565C0] text-[18px]'>
                  <AnimatedNumber value={total} prefix='₹' />
                </span>
              </div>

              {totalSavings > 0 && (
                <div className='mt-3 flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2'>
                  <span className='text-[12px] font-[700] text-[#00A651] flex items-center gap-1.5'>
                    🎉 You save
                  </span>
                  <span className='text-[14px] font-[800] text-[#00A651] flex items-baseline gap-1.5'>
                    <AnimatedNumber value={totalSavings} prefix='₹' />
                    {savingsPct >= 5 && (
                      <span className='text-[10px] font-[700] text-green-700/80'>({savingsPct}% off)</span>
                    )}
                  </span>
                </div>
              )}

              {belowMinOrder && !showMemberCTA && (
                <div className='mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800 leading-5'>
                  Minimum order value is ₹{fmt(effectiveMinOrder)}. Add{' '}
                  <span className='font-[700]'>₹{fmt(effectiveMinOrder - subtotal)}</span> more to checkout.
                </div>
              )}

              {/* InfixPass CTA — shown when cart ₹499–₹998 and not a member */}
              {showMemberCTA && (
                <div className='mt-4 rounded-2xl overflow-hidden border border-blue-200 shadow-sm'>
                  {/* Top bar */}
                  <div className='bg-gradient-to-r from-[#0D47A1] to-[#1565C0] px-4 py-2.5 flex items-center gap-2'>
                    <MdWorkspacePremium className='text-amber-400 text-[18px] flex-shrink-0' />
                    <span className='text-white text-[12px] font-[700]'>Unlock checkout with InfixPass</span>
                  </div>
                  {/* Body */}
                  <div className='bg-blue-50 px-4 py-3'>
                    <p className='text-[12px] text-gray-600 mb-2 leading-4'>
                      Your cart is <span className='font-[700] text-[#1565C0]'>₹{fmt(subtotal)}</span>.
                      Members can checkout from <span className='font-[700]'>₹499</span> with{' '}
                      <span className='font-[700]'>free delivery</span>.
                    </p>
                    <div className='flex items-center gap-3 mb-3 text-[11px] text-gray-500'>
                      <span className='flex items-center gap-1'><FaCheck className='text-green-500 text-[9px]' /> ₹499 min order</span>
                      <span className='flex items-center gap-1'><FaTruck className='text-green-500 text-[9px]' /> Free delivery</span>
                    </div>
                    <button
                      onClick={openMembershipModal}
                      className='w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white py-2.5 rounded-xl font-[700] text-[13px] transition-colors flex items-center justify-center gap-1.5'
                    >
                      <MdWorkspacePremium className='text-amber-300 text-[15px]' />
                      Get InfixPass — ₹{membershipPrice || 49} only
                      <BsArrowRight className='text-[13px]' />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => isLogin ? router.push('/checkout') : router.push('/login?redirect=/cart')}
                disabled={belowMinOrder && isLogin}
                className='w-full mt-5 bg-[#1565C0] text-white py-3 rounded-lg font-[600] text-[15px] hover:bg-[#0D47A1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLogin ? 'Proceed to Checkout' : 'Login to Checkout'}
              </button>

              <div className='mt-3 flex items-center justify-center gap-2 text-[12px] text-gray-400'>
                <span>🔒</span>
                <span>Secure checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CartPage;
