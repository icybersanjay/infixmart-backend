"use client";
import React, { useState, useEffect, useContext, useRef } from 'react';
import SEO from '../../components/SEO';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import {
  FaHeart, FaRegHeart, FaMinus, FaPlus, FaCheckCircle, FaStar,
  FaMapMarkerAlt, FaChevronDown, FaChevronUp, FaShippingFast,
  FaShieldAlt, FaUndo, FaRegThumbsUp, FaThumbsUp,
} from 'react-icons/fa';
import { MdOutlineShoppingCart, MdFlashOn, MdLocalOffer, MdVerified } from 'react-icons/md';
import { IoShareSocialOutline, IoClose } from 'react-icons/io5';
import { BsBoxSeam, BsLightningChargeFill } from 'react-icons/bs';
import ProductZoom from '../../components/ProductZoom';
import ProductSlider from '../../components/ProductSlider';
import { getData, postData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import { sanitizeHtml, stripHtml } from '../../utils/html';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useRecentlyViewed } from '../../context/RecentlyViewedContext';
import { MyContext } from '../../LegacyProviders';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const getDeliveryDate = (plusBusinessDays = 4) => {
  const d = new Date();
  let added = 0;
  while (added < plusBusinessDays) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/* ── Tab ──────────────────────────────────────────────────────────────────── */
const Tab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-3 px-1 text-[14px] font-[600] border-b-2 transition-colors mr-8 whitespace-nowrap ${
      active ? 'border-[#1565C0] text-[#1565C0]' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);

/* ── VariantPill ──────────────────────────────────────────────────────────── */
const VariantPill = ({ label, selected, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-xl border-2 text-[13px] font-[600] mr-2 mb-2 transition-all ${
      selected
        ? 'bg-[#1565C0] border-[#1565C0] text-white shadow-md shadow-blue-100'
        : disabled
          ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
          : 'border-gray-200 text-gray-700 hover:border-[#1565C0] hover:text-[#1565C0] hover:bg-[#F0F6FF]'
    }`}
  >
    {label}
  </button>
);

/* ── Rating bar ───────────────────────────────────────────────────────────── */
const RatingBar = ({ star, count, total, active, onClick }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColor = star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 text-[13px] w-full py-0.5 rounded transition-colors ${
        active ? 'text-[#1565C0]' : 'text-gray-600 hover:text-[#1565C0]'
      }`}
    >
      <span className='w-10 text-right font-[500] flex-shrink-0'>{star}★</span>
      <div className='flex-1 bg-gray-100 rounded-full h-2 overflow-hidden'>
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 text-right flex-shrink-0 ${active ? 'font-[700]' : 'text-gray-400'}`}>{count}</span>
    </button>
  );
};

/* ── Offers section ───────────────────────────────────────────────────────── */
const OFFERS = [
  { icon: '🏦', title: 'Bank Offer', desc: '10% instant discount on HDFC Bank Credit Cards, min. purchase ₹1,500' },
  { icon: '💳', title: 'No Cost EMI', desc: 'Starting from ₹249/month on purchases above ₹2,000 via Bajaj Finserv' },
  { icon: '💰', title: '5% Cashback', desc: 'Earn 5% cashback using Amazon Pay ICICI Bank Credit Card' },
  { icon: '📦', title: 'Free Delivery', desc: 'On orders above ₹999 — eligible for free shipping' },
];

const OffersSection = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className='border border-green-200 bg-green-50 rounded-xl overflow-hidden mb-4'>
      <button
        onClick={() => setOpen(!open)}
        className='w-full flex items-center justify-between px-4 py-3 text-left'
      >
        <div className='flex items-center gap-2'>
          <MdLocalOffer className='text-green-600 text-[18px]' />
          <span className='text-[13px] font-[700] text-green-800'>
            {OFFERS.length} Offers Available
          </span>
        </div>
        {open
          ? <FaChevronUp className='text-green-600 text-[12px]' />
          : <FaChevronDown className='text-green-600 text-[12px]' />
        }
      </button>
      {open && (
        <div className='px-4 pb-3 space-y-2.5 border-t border-green-200'>
          {OFFERS.map((o) => (
            <div key={o.title} className='flex gap-3 pt-2.5'>
              <span className='text-xl leading-none flex-shrink-0'>{o.icon}</span>
              <div>
                <p className='text-[12px] font-[700] text-gray-800'>{o.title}</p>
                <p className='text-[11px] text-gray-500 mt-0.5'>{o.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Delivery checker ─────────────────────────────────────────────────────── */
const DeliveryChecker = () => {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState(null); // 'available' | 'invalid'

  const check = () => {
    if (!/^\d{6}$/.test(pincode)) { setResult('invalid'); return; }
    setResult('available');
  };

  return (
    <div className='border border-gray-200 rounded-xl p-3.5 mb-4 bg-white'>
      <div className='flex items-center gap-1.5 mb-2.5'>
        <FaMapMarkerAlt className='text-[#1565C0] text-[14px]' />
        <span className='text-[13px] font-[600] text-gray-700'>Check Delivery</span>
      </div>
      <div className='flex gap-2'>
        <input
          type='text'
          maxLength={6}
          value={pincode}
          onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setResult(null); }}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder='Enter pincode'
          className='flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] transition'
        />
        <button
          onClick={check}
          className='px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[600] rounded-lg hover:bg-[#0D47A1] transition-colors'
        >
          Check
        </button>
      </div>
      {result === 'available' && (
        <div className='mt-2.5 space-y-1.5'>
          <p className='flex items-center gap-2 text-[12px] text-green-700 font-[500]'>
            <FaCheckCircle className='text-green-500' />
            Delivery by <strong>{getDeliveryDate(4)}</strong> — Free
          </p>
          <p className='flex items-center gap-2 text-[12px] text-green-700 font-[500]'>
            <FaCheckCircle className='text-green-500' />
            7-day easy returns available
          </p>
        </div>
      )}
      {result === 'invalid' && (
        <p className='mt-2 text-[12px] text-red-500 font-[500]'>Please enter a valid 6-digit pincode.</p>
      )}
    </div>
  );
};

/* ── Frequently Bought Together ───────────────────────────────────────────── */
const FrequentlyBoughtTogether = ({ currentProduct, related, onAddToCart }) => {
  const fbtItems = [currentProduct, ...(related || []).slice(0, 2)].filter(Boolean);
  const [selected, setSelected] = useState(() => new Set(fbtItems.map(p => p.id)));

  if (fbtItems.length < 2) return null;

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedItems = fbtItems.filter(p => selected.has(p.id));
  const total = selectedItems.reduce((sum, p) => sum + Number(p.price || 0), 0);

  return (
    <div className='mt-4 p-4 bg-[#F8FAFF] border border-[#E3EDFF] rounded-2xl'>
      <h3 className='text-[13px] font-[700] text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2'>
        <span className='text-[16px]'>🛍️</span> Frequently Bought Together
      </h3>

      {/* Images row */}
      <div className='flex items-center gap-2 mb-4 flex-wrap'>
        {fbtItems.map((p, i) => (
          <React.Fragment key={p.id}>
            <button
              onClick={() => toggle(p.id)}
              className={`relative w-[64px] h-[64px] rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                selected.has(p.id) ? 'border-[#1565C0]' : 'border-gray-200 opacity-50'
              }`}
            >
              {p.images?.[0]
                ? <img
                    src={imgUrl(p.images[0])}
                    alt={p.name}
                    className='w-full h-full object-cover'
                    onError={(e) => {
                      const fb = imgUrl(p.images?.[1]);
                      if (fb && e.target.src !== fb) { e.target.src = fb; } else { e.target.style.display = 'none'; }
                    }}
                  />
                : <div className='w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 text-xs'>?</div>
              }
              {i === 0 && (
                <span className='absolute bottom-0 left-0 right-0 bg-[#1565C0] text-white text-[8px] font-[700] text-center py-0.5'>
                  THIS
                </span>
              )}
            </button>
            {i < fbtItems.length - 1 && (
              <FaPlus className='text-gray-400 text-[10px] flex-shrink-0' />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Checklist */}
      <div className='space-y-2 mb-4'>
        {fbtItems.map((p) => (
          <label key={p.id} className='flex items-center gap-2.5 cursor-pointer group'>
            <input
              type='checkbox'
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              disabled={selected.has(p.id) && selected.size === 1}
              className='w-4 h-4 accent-[#1565C0] cursor-pointer flex-shrink-0'
            />
            <span className='text-[12px] text-gray-700 flex-1 line-clamp-1 group-hover:text-[#1565C0] transition-colors'>
              {p.name}
            </span>
            <span className='text-[13px] font-[700] text-[#1565C0] flex-shrink-0'>₹{fmt(p.price)}</span>
          </label>
        ))}
      </div>

      <div className='flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-[#E3EDFF]'>
        <div>
          <p className='text-[11px] text-gray-400'>Total for {selected.size} item{selected.size !== 1 ? 's' : ''}</p>
          <p className='text-[20px] font-[900] text-[#1565C0] leading-tight'>₹{fmt(total)}</p>
        </div>
        <button
          onClick={() => selectedItems.forEach(p => onAddToCart(p.id))}
          className='flex items-center gap-2 bg-[#1565C0] text-white text-[13px] font-[700] px-5 py-2.5 rounded-xl hover:bg-[#0D47A1] transition-colors'
        >
          <MdOutlineShoppingCart className='text-[16px]' />
          Add {selected.size} to Cart
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Reviews section ─────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
const ReviewsSection = ({ productId }) => {
  const { isLogin } = useContext(MyContext);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    avgRating: 0, totalRatings: 0,
    ratingMap: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRating, setFilterRating] = useState(null);
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'highest' | 'lowest'

  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [helpful, setHelpful] = useState({}); // { reviewId: true/false }

  const fetchReviews = async (p = 1) => {
    const res = await getData(`/api/reviews/product/${productId}?page=${p}&perPage=5`);
    if (res && !res.error) {
      setReviews(res.data.reviews);
      setSummary(res.summary);
      setTotalPages(res.data.totalPages);
      setPage(p);
    }
    setLoading(false);
  };

  const fetchMyReview = async () => {
    if (!isLogin) return;
    const res = await getData(`/api/reviews/check/${productId}`);
    if (res && !res.error && res.review) {
      setMyReview(res.review);
      setFormRating(res.review.rating);
      setFormTitle(res.review.title || '');
      setFormComment(res.review.comment || '');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReviews(1);
    fetchMyReview();
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formComment.trim()) { toast.error('Please write a comment'); return; }
    setSubmitting(true);
    const res = await postData('/api/reviews', {
      productId, rating: formRating, title: formTitle, comment: formComment,
    });
    setSubmitting(false);
    if (res && !res.error) {
      toast.success('Review submitted!');
      setShowForm(false);
      setMyReview(res.data);
      fetchReviews(1);
    } else {
      toast.error(res?.message || 'Failed to submit review');
    }
  };

  const avg = summary.avgRating || 0;
  const total = summary.totalRatings || 0;
  const rMap = summary.ratingMap || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Client-side sort + filter
  const displayReviews = [...reviews]
    .filter(r => filterRating === null || r.rating === filterRating)
    .sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  if (loading) return (
    <div className='space-y-3 py-4'>
      {[1, 2, 3].map(i => (
        <div key={i} className='animate-pulse flex gap-3 p-4 border border-gray-100 rounded-xl'>
          <div className='w-9 h-9 bg-gray-200 rounded-full flex-shrink-0' />
          <div className='flex-1 space-y-2'>
            <div className='h-3 bg-gray-200 rounded w-1/4' />
            <div className='h-3 bg-gray-200 rounded w-1/3' />
            <div className='h-3 bg-gray-200 rounded w-3/4' />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Summary + bars */}
      <div className='flex flex-col sm:flex-row gap-6 mb-8 p-5 bg-gradient-to-br from-[#F0F6FF] to-[#F8FAFF] rounded-2xl border border-[#E3EDF9]'>
        {/* Big average */}
        <div className='flex flex-col items-center justify-center min-w-[110px] gap-1'>
          <p className='text-[56px] font-[900] text-[#1565C0] leading-none'>{avg.toFixed(1)}</p>
          <Rating value={avg} readOnly precision={0.5} size='small' />
          <p className='text-[12px] text-gray-400 mt-1'>{total.toLocaleString()} rating{total !== 1 ? 's' : ''}</p>
          {avg >= 4 && (
            <span className='mt-1 flex items-center gap-1 text-[11px] bg-green-100 text-green-700 font-[600] px-2 py-0.5 rounded-full'>
              <MdVerified /> Highly Rated
            </span>
          )}
        </div>
        {/* Bars */}
        <div className='flex-1 flex flex-col justify-center gap-1.5'>
          {[5, 4, 3, 2, 1].map(s => (
            <RatingBar
              key={s} star={s} count={rMap[s] || 0} total={total}
              active={filterRating === s}
              onClick={() => setFilterRating(prev => prev === s ? null : s)}
            />
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className='flex items-center justify-between flex-wrap gap-3 mb-5'>
        <div className='flex items-center gap-2 flex-wrap'>
          {filterRating !== null && (
            <button
              onClick={() => setFilterRating(null)}
              className='flex items-center gap-1.5 text-[12px] bg-[#EEF4FF] text-[#1565C0] font-[600] px-3 py-1.5 rounded-full border border-[#C0D9FF] hover:bg-[#1565C0] hover:text-white transition-colors'
            >
              {filterRating}★ only <IoClose className='text-[12px]' />
            </button>
          )}
          <span className='text-[12px] text-gray-400'>
            {filterRating !== null ? `${rMap[filterRating] || 0} reviews` : `${total} reviews`}
          </span>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className='text-[12px] border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1565C0] text-gray-700 bg-white cursor-pointer'
        >
          <option value='recent'>Most Recent</option>
          <option value='highest'>Highest Rating</option>
          <option value='lowest'>Lowest Rating</option>
        </select>
      </div>

      {/* Write review CTA */}
      {isLogin && !myReview && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className='mb-6 w-full py-3 border-2 border-dashed border-[#1565C0] text-[#1565C0] text-[14px] font-[600] rounded-xl hover:bg-[#EEF4FF] transition-colors flex items-center justify-center gap-2'
        >
          <FaStar className='text-yellow-400' /> Write a Review
        </button>
      )}

      {/* Review form */}
      {isLogin && showForm && (
        <form onSubmit={handleSubmit} className='mb-8 p-5 border border-[#E3EDF9] rounded-2xl bg-white shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-[16px] font-[700] text-gray-800'>Your Review</h3>
            <button type='button' onClick={() => setShowForm(false)} className='text-gray-400 hover:text-gray-600'>
              <IoClose className='text-[20px]' />
            </button>
          </div>
          <div className='mb-4'>
            <p className='text-[13px] font-[500] text-gray-600 mb-2'>Your Rating *</p>
            <Rating
              value={formRating}
              onChange={(_, v) => setFormRating(v)}
              size='large'
              sx={{ fontSize: '2rem' }}
            />
          </div>
          <div className='mb-3'>
            <TextField
              label='Title (optional)'
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              fullWidth size='small'
              inputProps={{ maxLength: 120 }}
            />
          </div>
          <div className='mb-4'>
            <TextField
              label='Your review *'
              value={formComment}
              onChange={e => setFormComment(e.target.value)}
              fullWidth multiline rows={4} size='small'
              inputProps={{ maxLength: 1000 }}
              helperText={`${formComment.length}/1000`}
            />
          </div>
          <div className='flex gap-3'>
            <Button
              type='submit' disabled={submitting || !formComment.trim()} variant='contained'
              style={{ background: '#1565C0', borderRadius: '10px', textTransform: 'none', fontWeight: 700, padding: '10px 24px' }}
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </Button>
            <Button
              onClick={() => setShowForm(false)} variant='outlined'
              style={{ borderColor: '#d1d5db', color: '#6b7280', borderRadius: '10px', textTransform: 'none' }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* My existing review */}
      {myReview && (
        <div className='mb-6 p-4 border-2 border-[#1565C0] rounded-2xl bg-[#F0F6FF] relative'>
          <div className='flex items-center gap-2 mb-2'>
            <span className='text-[12px] font-[700] text-[#1565C0] bg-[#DBEAFE] px-2.5 py-0.5 rounded-full'>Your Review</span>
            {myReview.verified && (
              <span className='flex items-center gap-1 text-[11px] text-green-700 font-[600]'>
                <MdVerified className='text-green-500' /> Verified Purchase
              </span>
            )}
          </div>
          <Rating value={myReview.rating} readOnly size='small' />
          {myReview.title && <p className='text-[14px] font-[700] text-gray-800 mt-1'>{myReview.title}</p>}
          <p className='text-[13px] text-gray-600 mt-1 leading-relaxed'>{myReview.comment}</p>
          <button
            onClick={() => setShowForm(true)}
            className='mt-3 text-[12px] text-[#1565C0] font-[600] hover:underline'
          >
            Edit Review
          </button>
        </div>
      )}

      {/* Reviews list */}
      {displayReviews.length === 0 ? (
        <div className='py-12 text-center'>
          <FaStar className='text-gray-200 text-[48px] mx-auto mb-3' />
          <p className='text-gray-500 font-[500]'>
            {filterRating ? `No ${filterRating}★ reviews yet.` : 'No reviews yet.'}
          </p>
          {filterRating && (
            <button onClick={() => setFilterRating(null)} className='mt-2 text-[13px] text-[#1565C0] hover:underline font-[500]'>
              Show all reviews
            </button>
          )}
          {!isLogin && !filterRating && (
            <Link href='/login' className='mt-2 block text-[13px] text-[#1565C0] hover:underline font-[500]'>
              Login to write the first review
            </Link>
          )}
        </div>
      ) : (
        <div className='space-y-4'>
          {displayReviews.map((r) => (
            <div key={r.id} className='p-4 border border-gray-100 rounded-2xl bg-white hover:shadow-sm transition-shadow'>
              <div className='flex items-start gap-3'>
                <div className='w-10 h-10 rounded-full bg-gradient-to-br from-[#1565C0] to-[#42A5F5] flex items-center justify-center flex-shrink-0 text-white font-[700] text-[15px]'>
                  {(r.user?.name || 'U')[0].toUpperCase()}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between flex-wrap gap-1 mb-1'>
                    <div className='flex items-center gap-2'>
                      <p className='text-[13px] font-[700] text-gray-800'>{r.user?.name || 'User'}</p>
                      {r.verified && (
                        <span className='flex items-center gap-1 text-[10px] text-green-700 bg-green-50 font-[600] px-2 py-0.5 rounded-full border border-green-100'>
                          <MdVerified className='text-green-500' /> Verified
                        </span>
                      )}
                    </div>
                    <span className='text-[11px] text-gray-400'>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <Rating value={r.rating} readOnly size='small' />
                  {r.title && <p className='text-[14px] font-[700] text-gray-800 mt-1.5'>{r.title}</p>}
                  <p className='text-[13px] text-gray-600 mt-1 leading-relaxed'>{r.comment}</p>
                  {/* Helpful vote */}
                  <div className='flex items-center gap-2 mt-3 pt-2 border-t border-gray-50'>
                    <span className='text-[11px] text-gray-400'>Helpful?</span>
                    <button
                      onClick={() => setHelpful(h => ({ ...h, [r.id]: !h[r.id] }))}
                      className={`flex items-center gap-1.5 text-[11px] font-[600] px-2.5 py-1 rounded-lg transition-colors border ${
                        helpful[r.id]
                          ? 'text-[#1565C0] bg-[#EEF4FF] border-[#1565C0]'
                          : 'text-gray-500 bg-gray-50 border-gray-200 hover:border-[#1565C0] hover:text-[#1565C0]'
                      }`}
                    >
                      {helpful[r.id] ? <FaThumbsUp className='text-[10px]' /> : <FaRegThumbsUp className='text-[10px]' />}
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex justify-center gap-2 mt-6'>
          <button
            disabled={page === 1}
            onClick={() => fetchReviews(page - 1)}
            className='px-3 py-1.5 rounded-lg text-[12px] font-[600] border border-gray-200 text-gray-600 hover:border-[#1565C0] disabled:opacity-40 transition-colors'
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchReviews(p)}
              className={`w-9 h-9 rounded-lg text-[13px] font-[700] border transition-colors ${
                p === page ? 'bg-[#1565C0] text-white border-[#1565C0]' : 'border-gray-200 text-gray-600 hover:border-[#1565C0]'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => fetchReviews(page + 1)}
            className='px-3 py-1.5 rounded-lg text-[12px] font-[600] border border-gray-200 text-gray-600 hover:border-[#1565C0] disabled:opacity-40 transition-colors'
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Main product page ────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
const ProductDetails = () => {
  const { productParam } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [reviewCount, setReviewCount] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const reviewsRef = useRef(null);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { items: recentlyViewed, track } = useRecentlyViewed();
  const { isLogin, openAlertBox } = useContext(MyContext);

  useEffect(() => {
    setLoading(true);
    setProduct(null);
    setRelatedProducts(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const productEndpoint = /^\d+$/.test(productParam)
      ? `/api/product/getproduct/${productParam}`
      : `/api/product/slug/${productParam}`;

    getData(productEndpoint)
      .then(res => {
        if (res && !res.error && res.product) {
          const p = res.product;
          setProduct(p);
          const colors = Array.isArray(p.productRam) ? p.productRam : (p.productRam ? JSON.parse(p.productRam) : []);
          const sz  = Array.isArray(p.size) ? p.size : (p.size ? JSON.parse(p.size) : []);
          const wt  = Array.isArray(p.productWeight) ? p.productWeight : (p.productWeight ? JSON.parse(p.productWeight) : []);
          if (colors.length) setSelectedColor(colors[0]);
          if (sz.length)  setSelectedSize(sz[0]);
          if (wt.length)  setSelectedWeight(wt[0]);
          track({ id: p.id, name: p.name, price: p.price, images: p.images, slug: p.slug });
          if (p.catId) {
            getData(`/api/product/getproductby-catid/${p.catId}?perPage=8`)
              .then(r => { if (r && !r.error) setRelatedProducts((r.products || []).filter(x => x.id !== p.id)); });
          }
          getData(`/api/reviews/product/${p.id}?page=1&perPage=1`)
            .then(r => { if (r && !r.error) setReviewCount(r.data?.totalReviews || 0); });
        }
      })
      .finally(() => setLoading(false));
  }, [productParam]);

  const handleAddToCart = (productId) => {
    addToCart(productId);
    if (productId === product?.id) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (!isLogin) { router.push('/login'); return; }
    addToCart(product.id);
    router.push('/checkout');
  };

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className='bg-[#F8FAFC] min-h-screen'>
        <div className='container py-8 animate-pulse'>
          <div className='h-4 bg-gray-200 rounded w-48 mb-6' />
          <div className='flex flex-col md:flex-row gap-8'>
            <div className='w-full md:w-[45%]'>
              <div className='h-[460px] bg-gray-200 rounded-2xl' />
              <div className='flex gap-2 mt-3'>
                {[1,2,3,4].map(i => <div key={i} className='w-16 h-16 bg-gray-200 rounded-xl' />)}
              </div>
            </div>
            <div className='w-full md:w-[55%] space-y-4'>
              <div className='h-4 bg-gray-200 rounded w-24' />
              <div className='h-7 bg-gray-200 rounded w-3/4' />
              <div className='h-7 bg-gray-200 rounded w-2/3' />
              <div className='h-4 bg-gray-200 rounded w-1/3' />
              <div className='h-14 bg-gray-200 rounded-xl' />
              <div className='h-24 bg-gray-200 rounded-xl' />
              <div className='h-12 bg-gray-200 rounded-xl' />
              <div className='h-12 bg-gray-200 rounded-xl' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className='container py-20 text-center'>
        <BsBoxSeam className='text-gray-200 text-[64px] mx-auto mb-4' />
        <p className='text-[18px] font-[600] text-gray-500 mb-2'>Product not found</p>
        <Link href='/productListing' className='text-[#1565C0] hover:underline font-[500]'>Browse all products</Link>
      </div>
    );
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const colorOptions = Array.isArray(product.productRam) ? product.productRam : [];
  const sizeOptions = Array.isArray(product.size) ? product.size : [];
  const weightOptions = Array.isArray(product.productWeight) ? product.productWeight : [];
  const wishlisted = isWishlisted(product.id);
  const inStock = product.countInStock > 0;
  const lowStock = inStock && product.countInStock <= 10;
  const stockPct = Math.min(100, Math.round((product.countInStock / 50) * 100));
  const savings = product.oldprice > product.price ? product.oldprice - product.price : 0;
  const productPath = `/product/${product.slug || product.id}`;
  const productDescription = stripHtml(product.description || '').slice(0, 155);
  const safeDescriptionHtml = sanitizeHtml(product.description || '');
  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: images.map((image) => imgUrl(image)).filter(Boolean),
    description: productDescription || product.name,
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    aggregateRating: Number(product.rating) > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(product.rating).toFixed(1),
          reviewCount: reviewCount || 1,
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: Number(product.price || 0).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: productPath,
    },
  };
  const productBreadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: '/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: '/productListing',
      },
      ...(product.catName
        ? [{
            '@type': 'ListItem',
            position: 3,
            name: product.catName,
            item: `/productListing?category=${product.catId}`,
          }]
        : []),
      {
        '@type': 'ListItem',
        position: product.catName ? 4 : 3,
        name: product.name,
        item: productPath,
      },
    ],
  };

  /* ── JSX ──────────────────────────────────────────────────────────────── */
  return (
    <div className='product-detail-page bg-[#F8FAFC] pb-24 md:pb-6'>
      <SEO
        title={product.name}
        description={productDescription || undefined}
        image={images[0] ? imgUrl(images[0]) : undefined}
        url={productPath}
        type='product'
        structuredData={[productStructuredData, productBreadcrumbs]}
      />

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className='bg-white border-b border-gray-100'>
        <div className='container py-3'>
          <nav className='text-[12px] text-gray-400 flex gap-1.5 items-center flex-wrap'>
            <Link href='/' className='hover:text-[#1565C0] transition-colors'>Home</Link>
            <span>/</span>
            {product.catName && (
              <>
                <Link href={`/productListing?category=${product.catId}`} className='hover:text-[#1565C0] transition-colors'>
                  {product.catName}
                </Link>
                <span>/</span>
              </>
            )}
            <span className='text-gray-600 font-[500] line-clamp-1'>{product.name}</span>
          </nav>
        </div>
      </div>

      {/* ── Main product section ────────────────────────────────────────── */}
      <div className='container py-6'>
        <div className='flex flex-col md:flex-row gap-6 lg:gap-10 items-start'>

          {/* LEFT: Sticky image panel */}
          <div className='w-full md:w-[45%] md:sticky md:top-[72px] md:self-start'>
            <div className='bg-white rounded-2xl p-3 shadow-sm border border-gray-100'>
              <ProductZoom images={images} />
            </div>

            {/* Share row */}
            <div className='flex items-center justify-center gap-4 mt-3 px-3'>
              <span className='text-[12px] text-gray-400'>Share:</span>
              <button
                onClick={() => { navigator.share ? navigator.share({ title: product.name, url: window.location.href }) : (navigator.clipboard.writeText(window.location.href), toast.success('Link copied!')); }}
                className='flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#1565C0] transition-colors font-[500]'
              >
                <IoShareSocialOutline className='text-[15px]' /> Copy link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(product.name + ' ' + window.location.href)}`}
                target='_blank' rel='noreferrer'
                className='flex items-center gap-1 text-[12px] text-gray-500 hover:text-green-600 transition-colors font-[500]'
              >
                <span className='text-[14px]'>📱</span> WhatsApp
              </a>
            </div>
          </div>

          {/* RIGHT: Product info */}
          <div className='w-full md:w-[55%]'>

            {/* Category + badges row */}
            <div className='flex items-center gap-2 mb-2 flex-wrap'>
              {product.catName && (
                <Link
                  href={`/productListing?category=${product.catId}`}
                  className='text-[11px] font-[700] uppercase tracking-wider text-[#1565C0] bg-[#EEF4FF] border border-[#C0D9FF] px-2.5 py-1 rounded-full hover:bg-[#1565C0] hover:text-white transition-colors'
                >
                  {product.catName}
                </Link>
              )}
              {product.discount > 0 && (
                <span className='text-[11px] font-[700] text-white bg-[#E53935] px-2.5 py-1 rounded-full flex items-center gap-1'>
                  <BsLightningChargeFill /> {product.discount}% OFF
                </span>
              )}
              {product.countInStock <= 5 && inStock && (
                <span className='text-[11px] font-[700] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse'>
                  🔥 Almost Gone!
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className='text-[20px] md:text-[22px] font-[800] text-gray-900 leading-snug mb-1'>
              {product.name}
            </h1>

            {/* Brand + social proof */}
            <div className='flex items-center justify-between gap-2 mb-3 flex-wrap'>
              {product.brand && (
                <p className='text-[13px] text-gray-500'>
                  Brand: <span className='font-[700] text-gray-800'>{product.brand}</span>
                </p>
              )}
              {reviewCount > 0 && (
                <span className='text-[12px] text-gray-400 font-[500]'>
                  ✅ {reviewCount * 4}+ buyers
                </span>
              )}
            </div>

            {/* Rating */}
            <div className='flex items-center gap-3 mb-4 flex-wrap'>
              <div className='flex items-center gap-1.5 bg-green-600 text-white text-[13px] font-[700] px-2.5 py-1 rounded-lg'>
                {(Number(product.rating) || 0).toFixed(1)} <FaStar className='text-[11px]' />
              </div>
              <button
                onClick={() => { setActiveTab(2); reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className='text-[13px] text-[#1565C0] hover:underline font-[500]'
              >
                {reviewCount} Review{reviewCount !== 1 ? 's' : ''}
              </button>
              <span className='text-gray-200'>|</span>
              <span className='text-[13px] text-gray-400'>{product.brand || 'Brand'}</span>
            </div>

            {/* ── Price block ─────────────────────────────────────────── */}
            <div className='bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm'>
              <div className='flex items-baseline gap-3 flex-wrap mb-1'>
                <span className='text-[34px] font-[900] text-gray-900 leading-none'>
                  ₹{fmt(product.price)}
                </span>
                {product.oldprice > 0 && (
                  <span className='text-[18px] text-gray-400 line-through leading-none'>
                    ₹{fmt(product.oldprice)}
                  </span>
                )}
                {product.discount > 0 && (
                  <span className='text-[14px] font-[800] text-[#E53935]'>
                    {product.discount}% off
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className='text-[13px] text-green-700 font-[700] flex items-center gap-1.5'>
                  🎉 You save ₹{fmt(savings)}!
                </p>
              )}
              <p className='text-[11px] text-gray-400 mt-1'>Inclusive of all taxes. Free delivery eligible.</p>
            </div>

            {/* ── Offers ──────────────────────────────────────────────── */}
            <OffersSection />

            {/* ── Delivery checker ────────────────────────────────────── */}
            <DeliveryChecker />

            {/* ── Stock status ────────────────────────────────────────── */}
            <div className='mb-4'>
              {inStock ? (
                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    {lowStock ? (
                      <span className='flex items-center gap-1.5 text-[13px] font-[700] text-amber-600'>
                        ⚠️ Only {product.countInStock} left in stock — order soon!
                      </span>
                    ) : (
                      <span className='flex items-center gap-1.5 text-[13px] font-[600] text-green-600'>
                        <FaCheckCircle className='text-[12px]' /> In Stock ({product.countInStock} available)
                      </span>
                    )}
                  </div>
                  {product.countInStock <= 50 && (
                    <div className='w-full bg-gray-100 rounded-full h-1.5 overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all ${lowStock ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span className='inline-flex items-center gap-1.5 text-[13px] font-[700] text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl'>
                  ✗ Out of Stock
                </span>
              )}
            </div>

            {/* ── Variant selectors ───────────────────────────────────── */}
            {colorOptions.length > 0 && (
              <div className='mb-4'>
                <p className='text-[13px] font-[700] text-gray-700 mb-2'>
                  Color: <span className='text-[#1565C0]'>{selectedColor}</span>
                </p>
                <div className='flex flex-wrap'>
                  {colorOptions.map(color => (
                    <VariantPill key={color} label={color} selected={selectedColor === color} onClick={() => setSelectedColor(color)} />
                  ))}
                </div>
              </div>
            )}
            {sizeOptions.length > 0 && (
              <div className='mb-4'>
                <p className='text-[13px] font-[700] text-gray-700 mb-2'>
                  Size: <span className='text-[#1565C0]'>{selectedSize}</span>
                </p>
                <div className='flex flex-wrap'>
                  {sizeOptions.map(s => (
                    <VariantPill key={s} label={s} selected={selectedSize === s} onClick={() => setSelectedSize(s)} />
                  ))}
                </div>
              </div>
            )}
            {weightOptions.length > 0 && (
              <div className='mb-4'>
                <p className='text-[13px] font-[700] text-gray-700 mb-2'>
                  Weight: <span className='text-[#1565C0]'>{selectedWeight}</span>
                </p>
                <div className='flex flex-wrap'>
                  {weightOptions.map(w => (
                    <VariantPill key={w} label={w} selected={selectedWeight === w} onClick={() => setSelectedWeight(w)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Quantity stepper ────────────────────────────────────── */}
            <div className='flex items-center gap-4 mb-5'>
              <p className='text-[13px] font-[700] text-gray-700'>Quantity:</p>
              <div className='flex items-center border-2 border-gray-200 rounded-xl overflow-hidden'>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className='w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-[#1565C0] hover:text-white transition-colors'
                  aria-label='Decrease quantity'
                >
                  <FaMinus className='text-[11px]' />
                </button>
                <span className='w-12 text-center text-[15px] font-[700] text-gray-800'>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(q + 1, product.countInStock || 99))}
                  disabled={qty >= product.countInStock}
                  className='w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-[#1565C0] hover:text-white transition-colors disabled:opacity-40'
                  aria-label='Increase quantity'
                >
                  <FaPlus className='text-[11px]' />
                </button>
              </div>
              {qty >= product.countInStock && inStock && (
                <span className='text-[11px] text-amber-600 font-[500]'>Max qty reached</span>
              )}
            </div>

            {/* ── CTA buttons — desktop ───────────────────────────────── */}
            <div className='hidden md:flex gap-3 mb-5'>
              <button
                disabled={!inStock}
                onClick={handleBuyNow}
                className='flex-1 h-[50px] bg-gradient-to-r from-[#FF6D00] to-[#FF8F00] text-white rounded-2xl font-[800] text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 hover:from-[#E65100] hover:to-[#FF6D00] transition-all shadow-lg shadow-orange-100 active:scale-[0.98]'
              >
                <MdFlashOn className='text-[20px]' />
                Buy Now
              </button>
              <button
                disabled={!inStock}
                onClick={() => handleAddToCart(product.id)}
                className={`flex-1 h-[50px] rounded-2xl font-[800] text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg active:scale-[0.98] ${
                  justAdded
                    ? 'bg-green-500 text-white shadow-green-100'
                    : 'bg-[#1565C0] text-white hover:bg-[#0D47A1] shadow-blue-100'
                }`}
              >
                <MdOutlineShoppingCart className='text-[20px]' />
                {justAdded ? '✓ Added!' : 'Add to Cart'}
              </button>
              <button
                onClick={() => toggleWishlist(product)}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-[50px] h-[50px] rounded-2xl border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
                  wishlisted
                    ? 'bg-red-50 border-red-300 text-red-500'
                    : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400 hover:bg-red-50'
                }`}
              >
                {wishlisted ? <FaHeart className='text-[18px]' /> : <FaRegHeart className='text-[18px]' />}
              </button>
            </div>

            {/* ── Frequently Bought Together ──────────────────────────── */}
            <FrequentlyBoughtTogether
              currentProduct={product}
              related={relatedProducts}
              onAddToCart={handleAddToCart}
            />

            {/* ── Trust badges ────────────────────────────────────────── */}
            <div className='mt-4 grid grid-cols-2 gap-2'>
              {[
                { icon: <FaShippingFast className='text-[#1565C0] text-[18px]' />, title: 'Free Shipping', sub: 'Orders above ₹999' },
                { icon: <FaUndo className='text-[#1565C0] text-[18px]' />, title: '7-Day Returns', sub: 'Hassle-free policy' },
                { icon: <FaShieldAlt className='text-[#1565C0] text-[18px]' />, title: 'Secure Payment', sub: '100% safe checkout' },
                { icon: <MdVerified className='text-[#1565C0] text-[18px]' />, title: 'Genuine Product', sub: 'Quality assured' },
              ].map(b => (
                <div key={b.title} className='flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:border-[#C0D9FF] hover:bg-[#F8FAFF] transition-colors'>
                  <div className='w-9 h-9 bg-[#EEF4FF] rounded-lg flex items-center justify-center flex-shrink-0'>
                    {b.icon}
                  </div>
                  <div>
                    <p className='text-[12px] font-[700] text-gray-800'>{b.title}</p>
                    <p className='text-[11px] text-gray-400'>{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Seller info ─────────────────────────────────────────── */}
            <div className='mt-4 flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-[12px]'>
              <span className='text-[20px]'>🏪</span>
              <div>
                <p className='font-[700] text-gray-700'>Sold by <span className='text-[#1565C0]'>InfixMart Official Store</span></p>
                <p className='text-gray-400'>Trusted seller · Ships from warehouse</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs section ──────────────────────────────────────────────────── */}
      <div className='container mb-8' ref={reviewsRef}>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          {/* Tab bar */}
          <div className='border-b border-gray-100 px-6 pt-5 flex overflow-x-auto'>
            <Tab label='Description' active={activeTab === 0} onClick={() => setActiveTab(0)} />
            <Tab label='Specifications' active={activeTab === 1} onClick={() => setActiveTab(1)} />
            <Tab label={`Reviews (${reviewCount})`} active={activeTab === 2} onClick={() => setActiveTab(2)} />
          </div>

          {/* Tab content */}
          <div className='p-6'>
            {activeTab === 0 && (
              product.description
                ? <div
                    className='prose prose-sm max-w-none text-[14px] text-gray-700 leading-7'
                    dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
                  />
                : <div className='py-12 text-center text-gray-400'>
                    <BsBoxSeam className='text-[48px] mx-auto mb-3 text-gray-200' />
                    <p>No description available.</p>
                  </div>
            )}

            {activeTab === 1 && (
              <div className='overflow-x-auto'>
                <table className='w-full text-[13px] text-left border-collapse'>
                  <tbody>
                    {[
                      ['Brand', product.brand],
                      ['Category', product.catName],
                      ['Sub-category', product.subCat],
                      ['Color Options', colorOptions.length > 0 ? colorOptions.join(', ') : null],
                      ['Size Options', sizeOptions.length > 0 ? sizeOptions.join(', ') : null],
                      ['Weight Options', weightOptions.length > 0 ? weightOptions.join(', ') : null],
                      ['Average Rating', product.rating ? `${product.rating} / 5` : null],
                      ['Stock', product.countInStock],
                    ]
                      .filter(([, v]) => v != null && v !== '')
                      .map(([k, v], i) => (
                        <tr key={k} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className='py-3 px-4 font-[600] text-gray-600 w-[180px] border-b border-gray-100'>{k}</td>
                          <td className='py-3 px-4 text-gray-800 border-b border-gray-100'>{v}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 2 && <ReviewsSection productId={product.id} />}
          </div>
        </div>
      </div>

      {/* ── Related products ──────────────────────────────────────────────── */}
      {relatedProducts !== null && relatedProducts.length > 0 && (
        <div className='container mb-8'>
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-[18px] font-[800] text-gray-800'>Similar Products</h2>
              <Link
                href={`/productListing?category=${product.catId}`}
                className='text-[13px] text-[#1565C0] font-[600] hover:underline'
              >
                View all →
              </Link>
            </div>
            <ProductSlider items={5} products={relatedProducts} />
          </div>
        </div>
      )}

      {/* ── Recently Viewed ───────────────────────────────────────────────── */}
      {recentlyViewed.filter(p => p.id !== product?.id).length > 0 && (
        <div className='container mb-8'>
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-[18px] font-[800] text-gray-800 mb-4'>Recently Viewed</h2>
            <div className='flex gap-3 overflow-x-auto pb-2'>
              {recentlyViewed.filter(p => p.id !== product?.id).map(p => (
                <a
                  key={p.id}
                  href={`/product/${p.slug || p.id}`}
                  className='flex-shrink-0 w-[130px] group'
                >
                  <div className='w-[130px] h-[130px] rounded-xl overflow-hidden border border-gray-100 bg-[#F8FAFF] mb-2 group-hover:border-[#1565C0]/30 transition-colors'>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className='w-full h-full object-contain p-2' />
                      : <div className='w-full h-full flex items-center justify-center text-gray-200 text-2xl'>📦</div>
                    }
                  </div>
                  <p className='text-[12px] font-[600] text-gray-700 line-clamp-2 leading-snug group-hover:text-[#1565C0] transition-colors'>{p.name}</p>
                  <p className='text-[13px] font-[800] text-[#1565C0] mt-0.5'>₹{Number(p.price || 0).toLocaleString('en-IN')}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed bottom CTA — mobile only ───────────────────────────────── */}
      <div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30 md:hidden'>
        <div className='px-4 py-3 flex items-center gap-2'>
          <button
            disabled={!inStock}
            onClick={handleBuyNow}
            className='flex-1 min-h-[46px] bg-gradient-to-r from-[#FF6D00] to-[#FF8F00] text-white rounded-xl font-[800] text-[14px] flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition-all'
          >
            <MdFlashOn className='text-[17px]' /> Buy Now
          </button>
          <button
            disabled={!inStock}
            onClick={() => handleAddToCart(product.id)}
            className={`flex-1 min-h-[46px] rounded-xl font-[800] text-[14px] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-[0.98] ${
              justAdded ? 'bg-green-500 text-white' : 'bg-[#1565C0] text-white'
            }`}
          >
            <MdOutlineShoppingCart className='text-[17px]' />
            {justAdded ? '✓ Added!' : 'Add to Cart'}
          </button>
          <button
            onClick={() => toggleWishlist(product)}
            aria-label='Wishlist'
            className={`min-h-[46px] w-[46px] border-2 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              wishlisted ? 'bg-red-50 border-red-300 text-red-500' : 'border-gray-200 text-gray-400'
            }`}
          >
            {wishlisted ? <FaHeart className='text-[18px]' /> : <FaRegHeart className='text-[18px]' />}
          </button>
        </div>
        {/* Safe area for notch phones */}
        <div className='h-safe-bottom' />
      </div>
    </div>
  );
};

export default ProductDetails;
