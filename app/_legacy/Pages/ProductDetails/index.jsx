"use client";
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import SEO from '../../components/SEO';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { FaStar as FaStarFilled, FaStarHalfAlt } from 'react-icons/fa';
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
import {
  normalizeTiers,
  resolveTierPrice,
  nextTierSavings,
} from '../../../../lib/shared/price-tiers.js';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useRecentlyViewed } from '../../context/RecentlyViewedContext';
import useCountdown from '../../hooks/useCountdown';
import usePeopleViewing from '../../hooks/usePeopleViewing';
import { MyContext } from '../../LegacyProviders';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const toSlug = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const tryParse = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
};

function StarRating({ value = 0, onChange, size = 'small' }) {
  const stars = [];
  const filled = Math.floor(value);
  const half   = value - filled >= 0.4;
  const sz     = size === 'large' ? 'text-[26px]' : 'text-[14px]';
  for (let i = 1; i <= 5; i++) {
    if (onChange) {
      stars.push(
        <button key={i} type='button' onClick={() => onChange(null, i)}
          className={`${sz} transition-colors ${i <= value ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>
          <FaStarFilled />
        </button>
      );
    } else {
      const icon = i <= filled
        ? <FaStarFilled className={`${sz} text-yellow-400`} />
        : (i === filled + 1 && half)
          ? <FaStarHalfAlt className={`${sz} text-yellow-400`} />
          : <FaStarFilled className={`${sz} text-gray-200`} />;
      stars.push(<span key={i}>{icon}</span>);
    }
  }
  return <div className='flex items-center gap-0.5'>{stars}</div>;
}

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

function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  if (url.includes('embed/')) return url;
  const match = url.match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

/* ── Tab ──────────────────────────────────────────────────────────────────── */
const Tab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-3 px-1 text-[13px] sm:text-[14px] font-[600] border-b-2 transition-colors mr-4 sm:mr-8 whitespace-nowrap ${
      active ? 'border-[#1565C0] text-[#1565C0]' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);

/* ── Size Guide Modal ─────────────────────────────────────────────────────── */
const SIZE_CHART = [
  { size: 'XS', chest: '32–34"', waist: '26–28"', hips: '34–36"' },
  { size: 'S',  chest: '35–37"', waist: '29–31"', hips: '37–39"' },
  { size: 'M',  chest: '38–40"', waist: '32–34"', hips: '40–42"' },
  { size: 'L',  chest: '41–43"', waist: '35–37"', hips: '43–45"' },
  { size: 'XL', chest: '44–46"', waist: '38–40"', hips: '46–48"' },
  { size: 'XXL',chest: '47–49"', waist: '41–43"', hips: '49–51"' },
];

const SizeGuideModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-lg overflow-hidden'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
          <h3 className='text-[16px] font-[800] text-gray-800'>📏 Size Guide</h3>
          <button onClick={onClose} className='w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors'>
            <IoClose className='text-[16px]' />
          </button>
        </div>
        <div className='p-5 overflow-y-auto max-h-[70vh]'>
          <p className='text-[12px] text-gray-400 mb-4'>Measurements are in inches. Use a tape measure for best fit.</p>
          <div className='overflow-x-auto'>
            <table className='w-full text-[13px] border-collapse'>
              <thead>
                <tr className='bg-[#F0F5FF]'>
                  {['Size', 'Chest', 'Waist', 'Hips'].map(h => (
                    <th key={h} className='py-2.5 px-3 text-left font-[700] text-[#1565C0] border-b border-[#D6E4FF]'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className='py-2 px-3 font-[700] text-gray-800 border-b border-gray-100'>{row.size}</td>
                    <td className='py-2 px-3 text-gray-600 border-b border-gray-100'>{row.chest}</td>
                    <td className='py-2 px-3 text-gray-600 border-b border-gray-100'>{row.waist}</td>
                    <td className='py-2 px-3 text-gray-600 border-b border-gray-100'>{row.hips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='mt-4 p-3 bg-[#FFF9E6] border border-[#FFD84D] rounded-xl'>
            <p className='text-[12px] font-[700] text-amber-700 mb-1'>How to measure yourself</p>
            <ul className='text-[11px] text-amber-800 space-y-1 list-disc pl-4'>
              <li><strong>Chest:</strong> Measure around the fullest part of your chest.</li>
              <li><strong>Waist:</strong> Measure around your natural waistline.</li>
              <li><strong>Hips:</strong> Measure around the fullest part of your hips.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── VariantPill ──────────────────────────────────────────────────────────── */
const VariantPill = ({ label, selected, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 sm:px-4 py-2 rounded-xl border-2 text-[12px] sm:text-[13px] font-[600] mr-1.5 sm:mr-2 mb-2 transition-all ${
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
  { icon: '📦', title: 'Free Delivery', desc: 'On orders above ₹999 — fast & free shipping across India' },
  { icon: '↩️', title: '7-Day Returns', desc: 'Easy returns within 7 days — no questions asked' },
  { icon: '💳', title: 'No Cost EMI', desc: 'Easy monthly instalments available on select bank cards' },
  { icon: '🔒', title: 'Secure Payment', desc: '100% safe & encrypted checkout — UPI, Cards, Net Banking' },
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
          inputMode='numeric'
          autoComplete='postal-code'
          maxLength={6}
          aria-label='Pincode'
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
  const totalOld = selectedItems.reduce((sum, p) => sum + Number(p.oldprice || p.price || 0), 0);
  const bundleSavings = totalOld > total ? totalOld - total : 0;

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

      <div className='pt-2 border-t border-[#E3EDFF]'>
        <div className='flex items-center justify-between gap-3 flex-wrap mb-2'>
          <div>
            <p className='text-[11px] text-gray-400'>Bundle total ({selected.size} item{selected.size !== 1 ? 's' : ''})</p>
            <div className='flex items-baseline gap-2'>
              <p className='text-[20px] font-[900] text-[#1565C0] leading-tight'>₹{fmt(total)}</p>
              {totalOld > total && (
                <span className='text-[13px] text-gray-400 line-through'>₹{fmt(totalOld)}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => selectedItems.forEach(p => onAddToCart(p.id))}
            className='flex items-center gap-2 bg-[#1565C0] text-white text-[13px] font-[700] px-5 py-2.5 rounded-xl hover:bg-[#0D47A1] transition-colors shadow-sm'
          >
            <MdOutlineShoppingCart className='text-[16px]' />
            Add All to Cart
          </button>
        </div>
        {bundleSavings > 0 && (
          <p className='text-[12px] text-green-700 font-[700] bg-green-50 rounded-lg px-3 py-1.5 text-center'>
            🎉 Bundle saves you ₹{fmt(bundleSavings)}!
          </p>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Q&A section ─────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
const QASection = ({ productId }) => {
  const { isLogin } = useContext(MyContext);
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQA = async () => {
    setLoading(true);
    const res = await getData(`/api/product-qa?productId=${productId}&perPage=8`);
    if (res && !res.error) {
      setQuestions(res.questions || []);
      setTotal(res.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetchQA(); }, [productId]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    const res = await postData('/api/product-qa', { productId, question: question.trim() });
    setSubmitting(false);
    if (res && !res.error) {
      toast.success("Question submitted! We'll answer soon.");
      setQuestion('');
      fetchQA();
    } else {
      toast.error(res?.message || 'Failed to submit');
    }
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-[15px] font-[700] text-gray-800'>
          Questions & Answers <span className='text-gray-400 font-[400]'>({total})</span>
        </h3>
      </div>

      {/* Ask a question */}
      {isLogin ? (
        <form onSubmit={handleAsk} className='bg-[#F8FAFF] border border-[#E3EDFF] rounded-2xl p-4 mb-5'>
          <p className='text-[13px] font-[600] text-gray-700 mb-2'>Ask a question about this product</p>
          <div className='flex gap-2'>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder='Type your question here...'
              maxLength={500}
              className='flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-[#1565C0]'
            />
            <button
              type='submit'
              disabled={submitting || !question.trim()}
              className='bg-[#1565C0] text-white text-[13px] font-[700] px-4 py-2 rounded-xl hover:bg-[#0D47A1] transition-colors disabled:opacity-50'
            >
              Ask
            </button>
          </div>
        </form>
      ) : (
        <div className='bg-[#F8FAFF] border border-[#E3EDFF] rounded-2xl p-4 mb-5 text-center'>
          <Link href='/login' className='text-[13px] text-[#1565C0] hover:underline font-[600]'>
            Login to ask a question →
          </Link>
        </div>
      )}

      {loading ? (
        <div className='text-center py-8 text-gray-400 text-[13px]'>Loading questions…</div>
      ) : questions.length === 0 ? (
        <div className='text-center py-10'>
          <p className='text-gray-400 text-[14px]'>No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {questions.map(q => (
            <div key={q.id} className='border border-gray-100 rounded-2xl p-4 bg-white'>
              <div className='flex gap-2 mb-2'>
                <span className='text-[11px] font-[800] text-[#1565C0] bg-[#EEF4FF] px-2 py-0.5 rounded-full flex-shrink-0'>Q</span>
                <p className='text-[13px] text-gray-800 font-[500]'>{q.question}</p>
              </div>
              {q.answer ? (
                <div className='flex gap-2 ml-1 bg-green-50 border border-green-100 rounded-xl px-3 py-2'>
                  <span className='text-[11px] font-[800] text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0 h-fit'>A</span>
                  <div>
                    <p className='text-[13px] text-gray-700 leading-relaxed'>{q.answer}</p>
                    {q.answerer && <p className='text-[10px] text-gray-400 mt-1'>— {q.answerer.name} · InfixMart Team</p>}
                  </div>
                </div>
              ) : (
                <p className='text-[12px] text-gray-400 ml-1 italic'>Answer coming soon…</p>
              )}
              <p className='text-[11px] text-gray-400 mt-2 ml-1'>
                Asked by {q.asker?.name || 'Customer'} · {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
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
  const [formImageUrl, setFormImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [helpful, setHelpful] = useState({}); // { reviewId: true/false }

  const fetchReviews = async (p = 1) => {
    try {
      const res = await getData(`/api/reviews/product/${productId}?page=${p}&perPage=5`);
      if (res && !res.error) {
        setReviews(res.data.reviews);
        setSummary(res.summary);
        setTotalPages(res.data.totalPages);
        setPage(p);
      }
    } catch { /* silent — UI stays with previous state */ }
    finally { setLoading(false); }
  };

  const fetchMyReview = async () => {
    if (!isLogin) return;
    try {
      const res = await getData(`/api/reviews/check/${productId}`);
      if (res && !res.error && res.review) {
        setMyReview(res.review);
        setFormRating(res.review.rating);
        setFormTitle(res.review.title || '');
        setFormComment(res.review.comment || '');
      }
    } catch { /* silent */ }
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
    const images = formImageUrl.trim() ? [formImageUrl.trim()] : [];
    const res = await postData('/api/reviews', {
      productId, rating: formRating, title: formTitle, comment: formComment, images,
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

  const displayReviews = useMemo(() => [...reviews]
    .filter(r => filterRating === null || r.rating === filterRating)
    .sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }), [reviews, filterRating, sortBy]);

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
          <StarRating value={avg} size='small' />
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
            <StarRating value={formRating} onChange={(_, v) => setFormRating(v)} size='large' />
          </div>
          <div className='mb-3'>
            <label className='block text-[12px] font-[600] text-gray-500 mb-1'>Title (optional)</label>
            <input
              type='text' maxLength={120} value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder='Summarise your experience'
              className='w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all bg-[#F8FAFF]'
            />
          </div>
          <div className='mb-4'>
            <label className='block text-[12px] font-[600] text-gray-500 mb-1'>Your review *</label>
            <textarea
              rows={4} maxLength={1000} value={formComment}
              onChange={e => setFormComment(e.target.value)}
              placeholder='Tell others what you think about this product…'
              className='w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all bg-[#F8FAFF] resize-y'
            />
            <p className='text-[11px] text-gray-400 text-right mt-0.5'>{formComment.length}/1000</p>
          </div>
          <div className='mb-4'>
            <label className='block text-[12px] font-[600] text-gray-500 mb-1'>Photo URL (optional)</label>
            <input
              type='url' value={formImageUrl}
              onChange={e => setFormImageUrl(e.target.value)}
              placeholder='https://…'
              className='w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all bg-[#F8FAFF]'
            />
            <p className='text-[11px] text-gray-400 mt-0.5'>Paste a direct image URL to attach a photo</p>
          </div>
          <div className='flex gap-3'>
            <button
              type='submit' disabled={submitting || !formComment.trim()}
              className='px-6 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            <button
              type='button' onClick={() => setShowForm(false)}
              className='px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
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
          <StarRating value={myReview.rating} size='small' />
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
                          <MdVerified className='text-green-500' /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <span className='text-[11px] text-gray-400'>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <StarRating value={r.rating} size='small' />
                  {r.title && <p className='text-[14px] font-[700] text-gray-800 mt-1.5'>{r.title}</p>}
                  <p className='text-[13px] text-gray-600 mt-1 leading-relaxed'>{r.comment}</p>
                  {r.images && r.images.length > 0 && (
                    <div className='flex gap-2 mt-2 flex-wrap'>
                      {r.images.map((url, i) => (
                        <a key={i} href={url} target='_blank' rel='noopener noreferrer'>
                          <img src={url} alt={`Review photo ${i + 1}`} className='w-16 h-16 object-cover rounded-xl border border-gray-100 hover:opacity-90 transition-opacity' />
                        </a>
                      ))}
                    </div>
                  )}
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
const ProductDetails = ({ initialProduct = null, initialProductParam = null } = {}) => {
  const { productParam } = useParams();
  const router = useRouter();
  // Seed from server-fetched product when the URL param matches, so the first
  // paint already has the full product body — no spinner, no extra request.
  const initialMatches =
    initialProduct &&
    (String(initialProduct.id) === String(productParam) ||
     initialProduct.slug === productParam ||
     initialProductParam === productParam);
  const [product, setProduct] = useState(initialMatches ? initialProduct : null);
  const [loading, setLoading] = useState(!initialMatches);
  const [relatedProducts, setRelatedProducts] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [reviewCount, setReviewCount] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const [wishBurst, setWishBurst] = useState(false);
  // ProductVariants (first-class rows). When present, they take precedence
  // over the legacy color/size/weight selectors below.
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const reviewsRef = useRef(null);
  const justAddedTimer = useRef(null);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { items: recentlyViewed, track } = useRecentlyViewed();
  const { isLogin, openAlertBox } = useContext(MyContext);

  // Must be called before any conditional returns (Rules of Hooks)
  const saleCountdown = useCountdown(product?.saleEndsAt ?? null);
  const peopleViewing = usePeopleViewing(product?.id ?? null);

  useEffect(() => {
    // Apply variant defaults + below-fold fetches once the product is in hand.
    // Used by both the SSR-hydrated path and the client-fetch path.
    const applyProductSideEffects = (p) => {
      const colors = tryParse(p.productRam);
      const sz     = tryParse(p.size);
      const wt     = tryParse(p.productWeight);
      if (colors.length) setSelectedColor(colors[0]);
      if (sz.length)  setSelectedSize(sz[0]);
      if (wt.length)  setSelectedWeight(wt[0]);
      track({ id: p.id, name: p.name, price: p.price, images: p.images, slug: p.slug });
      // Consent-gated GA4 + Meta Pixel view_item / ViewContent
      import('../../utils/analytics').then(({ trackViewItem }) => trackViewItem(p)).catch(() => {});
      if (p.catId) {
        getData(`/api/product/getproductby-catid/${p.catId}?perPage=8`)
          .then(r => { if (r && !r.error) setRelatedProducts((r.products || []).filter(x => x.id !== p.id)); });
      }
      getData(`/api/reviews/product/${p.id}?page=1&perPage=1`)
        .then(r => { if (r && !r.error) setReviewCount(r.data?.totalReviews || 0); });
      // Fetch first-class variants for the picker. Errors are non-fatal — the
      // product still renders with the legacy color/size/weight options below.
      getData(`/api/product/${p.id}/variants`)
        .then(r => {
          const list = Array.isArray(r?.variants) ? r.variants : [];
          setVariants(list);
          // Default to the first in-stock variant if any, else the first variant.
          const firstInStock = list.find(v => Number(v.stock) > 0);
          setSelectedVariantId((firstInStock || list[0])?.id ?? null);
        })
        .catch(() => { setVariants([]); setSelectedVariantId(null); });
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Server already fetched and passed this product down — skip the network
    // round-trip. First-paint LCP comes from the streamed HTML.
    if (initialMatches) {
      setProduct(initialProduct);
      setRelatedProducts(null);
      setLoading(false);
      applyProductSideEffects(initialProduct);
      return;
    }

    setLoading(true);
    setProduct(null);
    setRelatedProducts(null);
    const productEndpoint = /^\d+$/.test(productParam)
      ? `/api/product/getproduct/${productParam}`
      : `/api/product/slug/${productParam}`;

    getData(productEndpoint)
      .then(res => {
        if (res && !res.error && res.product) {
          const p = res.product;
          setProduct(p);
          applyProductSideEffects(p);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productParam]);

  useEffect(() => () => clearTimeout(justAddedTimer.current), []);

  const handleAddToCart = (productId) => {
    // Only forward variantId when adding the current product; related-product
    // tiles call this with their own id and don't have a picker.
    const variantId = productId === product?.id ? selectedVariantId : null;
    addToCart(productId, variantId);
    if (productId === product?.id) {
      setJustAdded(true);
      clearTimeout(justAddedTimer.current);
      justAddedTimer.current = setTimeout(() => setJustAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (!isLogin) { router.push('/login'); return; }
    addToCart(product.id, selectedVariantId);
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
  const handleToggleWishlist = () => {
    const wasWishlisted = wishlisted;
    toggleWishlist(product);
    if (!wasWishlisted) {
      setWishBurst(true);
      setTimeout(() => setWishBurst(false), 700);
    }
  };
  const inStock = product.countInStock > 0;
  const lowStock = inStock && product.countInStock <= 10;
  const stockPct = Math.min(100, Math.round((product.countInStock / 50) * 100));
  const savings = product.oldprice > product.price ? product.oldprice - product.price : 0;

  // Bulk-pricing tiers (Section E). Tiers don't apply when a first-class
  // variant is selected — variants have their own per-SKU price.
  const tierList = useMemo(
    () => normalizeTiers(product?.priceTiers),
    [product?.priceTiers]
  );
  const tierBasePrice = Number(product.price || 0);
  const tierApplies = tierList.length > 0 && !selectedVariantId;
  const effectiveUnitPrice = tierApplies
    ? resolveTierPrice(tierBasePrice, tierList, qty)
    : tierBasePrice;
  const tierLineSavings = tierApplies
    ? Math.max(0, (tierBasePrice - effectiveUnitPrice) * qty)
    : 0;
  const tierUpsell = tierApplies ? nextTierSavings(tierBasePrice, tierList, qty) : null;
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
            item: `/category/${toSlug(product.catName || '')}`,
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
    <>
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
                <Link href={`/category/${toSlug(product.catName || '')}`} className='hover:text-[#1565C0] transition-colors'>
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

            {/* Trust badges */}
            <div className='grid grid-cols-2 gap-2 mt-4'>
              {[
                { icon: '🚚', label: 'Free Shipping', sub: 'Orders above ₹999' },
                { icon: '↩️', label: '7-Day Returns', sub: 'Hassle-free policy' },
                { icon: '🔒', label: 'Secure Payment', sub: '100% safe checkout' },
                { icon: '✅', label: 'Genuine Product', sub: 'Quality guaranteed' },
              ].map((b) => (
                <div key={b.label} className='flex items-center gap-2 bg-[#F8FAFF] border border-gray-100 rounded-xl px-3 py-2'>
                  <span className='text-[18px] flex-shrink-0'>{b.icon}</span>
                  <div>
                    <p className='text-[11px] font-[700] text-gray-800 leading-tight'>{b.label}</p>
                    <p className='text-[10px] text-gray-400 leading-tight'>{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* More from this category */}
            {relatedProducts && relatedProducts.length > 0 && (
              <div className='mt-4'>
                <p className='text-[11px] font-[700] uppercase tracking-wide text-gray-400 mb-2.5'>More from this category</p>
                <div className='flex gap-2.5 overflow-x-auto pb-1' style={{ scrollbarWidth: 'none' }}>
                  {relatedProducts.slice(0, 6).map(p => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug || p.id}`}
                      className='flex-shrink-0 w-[70px] group'
                    >
                      <div className='w-[70px] h-[70px] bg-[#F8FAFF] rounded-xl overflow-hidden border border-gray-100 group-hover:border-[#1565C0]/40 transition-colors'>
                        <img src={imgUrl(p.images?.[0])} alt={p.name} className='w-full h-full object-contain p-1.5' />
                      </div>
                      <p className='text-[10px] text-gray-600 mt-1 line-clamp-2 leading-tight text-center'>{p.name}</p>
                      <p className='text-[11px] font-[700] text-[#1565C0] text-center'>₹{fmt(p.price)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Product info */}
          <div className='w-full md:w-[55%]'>

            {/* Category + badges row */}
            <div className='flex items-center gap-2 mb-2 flex-wrap'>
              {product.catName && (
                <Link
                  href={`/category/${toSlug(product.catName || '')}`}
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
              <div className='flex items-center gap-3 flex-wrap'>
                {reviewCount > 0 && (
                  <span className='text-[12px] text-gray-400 font-[500]'>
                    ✅ {reviewCount * 4}+ buyers
                  </span>
                )}
                {peopleViewing !== null && (
                  <span className='flex items-center gap-1 text-[12px] font-[600] text-[#E53935]'>
                    <span className='inline-block w-1.5 h-1.5 rounded-full bg-[#E53935] animate-ping mr-0.5' />
                    {peopleViewing} people viewing now
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className='flex items-center gap-3 mb-4 flex-wrap'>
              {Number(product.rating) > 0 ? (
                <div className='flex items-center gap-1.5 bg-green-600 text-white text-[13px] font-[700] px-2.5 py-1 rounded-lg'>
                  {Number(product.rating).toFixed(1)} <FaStar className='text-[11px]' />
                </div>
              ) : (
                <span className='text-[12px] text-gray-400 font-[500]'>No reviews yet</span>
              )}
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
              {saleCountdown && (
                <div className='mt-2 flex items-center gap-2 bg-[#FFF3E0] border border-[#FFB74D] rounded-xl px-3 py-2'>
                  <span className='text-[12px] font-[700] text-[#E65100]'>⚡ Sale ends in:</span>
                  <div className='flex items-center gap-1'>
                    {[
                      { v: saleCountdown.h, l: 'h' },
                      { v: saleCountdown.m, l: 'm' },
                      { v: saleCountdown.s, l: 's' },
                    ].map(({ v, l }) => (
                      <span key={l} className='flex items-center'>
                        <span className='bg-[#E65100] text-white text-[12px] font-[800] w-8 text-center py-0.5 rounded-md tabular-nums'>
                          {String(v).padStart(2, '0')}
                        </span>
                        <span className='text-[11px] text-[#E65100] font-[700] mx-0.5'>{l}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className='text-[11px] text-gray-400 mt-1'>Inclusive of all taxes. Free delivery eligible.</p>

              {/* Bulk-pricing tier table — only when the product has tiers */}
              {tierList.length > 0 && (
                <div className='mt-3 pt-3 border-t border-dashed border-gray-200'>
                  <p className='text-[11px] font-[700] uppercase tracking-wide text-[#1565C0] mb-2'>
                    🎁 Buy more, save more
                  </p>
                  <table className='w-full text-[12px]'>
                    <thead>
                      <tr className='text-[10px] uppercase text-gray-400 tracking-wide'>
                        <th className='text-left font-[600] py-1'>Quantity</th>
                        <th className='text-right font-[600] py-1'>Unit Price</th>
                        <th className='text-right font-[600] py-1'>You Save / unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className='border-t border-gray-100'>
                        <td className='py-1.5 text-gray-700'>1 – {tierList[0].minQty - 1}</td>
                        <td className='py-1.5 text-right font-[600] text-gray-800'>
                          ₹{fmt(tierBasePrice)}
                        </td>
                        <td className='py-1.5 text-right text-gray-400'>—</td>
                      </tr>
                      {tierList.map((tier, i) => {
                        const next = tierList[i + 1];
                        const range = next ? `${tier.minQty} – ${next.minQty - 1}` : `${tier.minQty}+`;
                        const perUnitSave = Math.max(0, tierBasePrice - tier.price);
                        const isActive = tierApplies && qty >= tier.minQty && (!next || qty < next.minQty);
                        return (
                          <tr
                            key={tier.minQty}
                            className={`border-t border-gray-100 ${isActive ? 'bg-green-50' : ''}`}
                          >
                            <td className={`py-1.5 ${isActive ? 'font-[700] text-green-700' : 'text-gray-700'}`}>
                              {range}
                              {isActive && <span className='ml-1 text-[10px] uppercase'>← active</span>}
                            </td>
                            <td className={`py-1.5 text-right ${isActive ? 'font-[800] text-green-700' : 'font-[600] text-[#1565C0]'}`}>
                              ₹{fmt(tier.price)}
                            </td>
                            <td className='py-1.5 text-right text-green-700 font-[600]'>
                              {perUnitSave > 0 ? `₹${fmt(perUnitSave)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                    {product.countInStock <= 4 ? (
                      <span className='flex items-center gap-2 text-[13px] font-[700] text-[#E53935]'>
                        <span className='infix-stock-dot' aria-hidden='true' />
                        Only {product.countInStock} left — selling fast
                      </span>
                    ) : lowStock ? (
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
                        className={`h-full rounded-full transition-all ${product.countInStock <= 4 ? 'bg-[#E53935]' : lowStock ? 'bg-amber-500' : 'bg-green-500'}`}
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
            {/* First-class ProductVariants picker. When present, it takes
                precedence over the legacy color/size/weight selectors below
                — the legacy selectors stay rendered for products that haven't
                been migrated yet. */}
            {variants.length > 0 && (
              <div className='mb-4'>
                <p className='text-[13px] font-[700] text-gray-700 mb-2'>
                  Variant:{' '}
                  <span className='text-[#1565C0]'>
                    {variants.find(v => v.id === selectedVariantId)?.name || '—'}
                  </span>
                </p>
                <div className='flex flex-wrap gap-2'>
                  {variants.map(v => {
                    const isSelected = selectedVariantId === v.id;
                    const outOfStock = Number(v.stock) <= 0;
                    return (
                      <button
                        key={v.id}
                        type='button'
                        disabled={outOfStock}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-3 py-1.5 rounded-md border text-[12px] font-[600] transition-colors ${
                          isSelected
                            ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                            : outOfStock
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-[#1565C0]'
                        }`}
                        title={outOfStock ? 'Out of stock' : `₹${Number(v.price).toLocaleString('en-IN')} · ${v.stock} in stock`}
                      >
                        {v.name}
                        {!outOfStock && Number(v.price) !== Number(product.price) && (
                          <span className='ml-1.5 text-[10px] text-gray-500'>
                            ₹{Number(v.price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                <div className='flex items-center justify-between mb-2'>
                  <p className='text-[13px] font-[700] text-gray-700'>
                    Size: <span className='text-[#1565C0]'>{selectedSize}</span>
                  </p>
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className='text-[12px] text-[#1565C0] hover:underline font-[600] flex items-center gap-1'
                  >
                    📏 Size Guide
                  </button>
                </div>
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
                  className='w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-50 hover:bg-[#1565C0] hover:text-white active:bg-[#0D47A1] transition-colors'
                  aria-label='Decrease quantity'
                >
                  <FaMinus className='text-[11px]' />
                </button>
                <span className='w-12 text-center text-[15px] font-[700] text-gray-800'>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(q + 1, product.countInStock || 99))}
                  disabled={qty >= product.countInStock}
                  className='w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-50 hover:bg-[#1565C0] hover:text-white active:bg-[#0D47A1] transition-colors disabled:opacity-40'
                  aria-label='Increase quantity'
                >
                  <FaPlus className='text-[11px]' />
                </button>
              </div>
              {qty >= product.countInStock && inStock && (
                <span className='text-[11px] text-amber-600 font-[500]'>Max qty reached</span>
              )}
            </div>

            {/* ── Live tier price hint — only when product has tiers ── */}
            {tierApplies && (
              <div className='mb-5 -mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100 flex flex-wrap items-center justify-between gap-2'>
                <div className='text-[12px] text-gray-700'>
                  <span className='font-[700] text-gray-900'>You pay </span>
                  <span className='text-[15px] font-[800] text-[#1565C0]'>
                    ₹{fmt(effectiveUnitPrice)}
                  </span>
                  <span className='text-gray-500'> / unit × {qty} = </span>
                  <span className='font-[800] text-[#0D47A1]'>
                    ₹{fmt(effectiveUnitPrice * qty)}
                  </span>
                  {tierLineSavings > 0 && (
                    <span className='ml-1.5 text-green-700 font-[700]'>
                      (save ₹{fmt(tierLineSavings)})
                    </span>
                  )}
                </div>
                {tierUpsell && tierUpsell.unitsAway > 0 && (
                  <button
                    type='button'
                    onClick={() =>
                      setQty((q) =>
                        Math.min(tierUpsell.nextMinQty, product.countInStock || tierUpsell.nextMinQty)
                      )
                    }
                    className='text-[11px] font-[700] text-amber-700 hover:text-amber-900 underline decoration-dotted'
                  >
                    +{tierUpsell.unitsAway} more → ₹{fmt(tierUpsell.perUnitSavings)}/unit cheaper
                  </button>
                )}
              </div>
            )}

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
                onClick={handleToggleWishlist}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={wishlisted}
                className={`relative w-[50px] h-[50px] rounded-2xl border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
                  wishlisted
                    ? 'bg-red-50 border-red-300 text-red-500'
                    : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400 hover:bg-red-50'
                }`}
              >
                <span className={wishBurst ? 'infix-heart-pop' : ''}>
                  {wishlisted ? <FaHeart className='text-[18px]' /> : <FaRegHeart className='text-[18px]' />}
                </span>
                {wishBurst && (
                  <span className='infix-heart-burst' aria-hidden='true'>
                    <span style={{ '--tx': '-18px', '--ty': '-22px' }}>♥</span>
                    <span style={{ '--tx': '18px',  '--ty': '-22px' }}>♥</span>
                    <span style={{ '--tx': '-26px', '--ty': '0px'  }}>♥</span>
                    <span style={{ '--tx': '26px',  '--ty': '0px'  }}>♥</span>
                    <span style={{ '--tx': '0px',   '--ty': '-28px' }}>♥</span>
                  </span>
                )}
              </button>
            </div>

            {/* ── Return policy micro-line ────────────────────────────── */}
            <p className='text-[12px] text-gray-500 mt-3 flex items-center gap-1.5'>
              <span>🔄</span>
              <span>Easy 7-day returns &amp; exchanges. &nbsp;
                <a href='/return-policy' className='text-[#1565C0] font-[600] hover:underline'>View policy →</a>
              </span>
            </p>

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
          <div className='border-b border-gray-100 px-3 sm:px-6 pt-5 flex overflow-x-auto scrollbar-hide'>
            <Tab label='Description' active={activeTab === 0} onClick={() => setActiveTab(0)} />
            <Tab label='Specifications' active={activeTab === 1} onClick={() => setActiveTab(1)} />
            <Tab label={`Reviews (${reviewCount})`} active={activeTab === 2} onClick={() => setActiveTab(2)} />
            {product.videoUrl && <Tab label='▶ Video' active={activeTab === 3} onClick={() => setActiveTab(3)} />}
            <Tab label='Q&A' active={activeTab === 4} onClick={() => setActiveTab(4)} />
          </div>

          {/* Tab content */}
          <div className='p-4 sm:p-6'>
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

            {activeTab === 4 && <QASection productId={product.id} />}

            {activeTab === 3 && product.videoUrl && (() => {
              const embedUrl = getYoutubeEmbedUrl(product.videoUrl);
              return embedUrl ? (
                <div className='relative w-full' style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={embedUrl}
                    title='Product video'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                    className='absolute inset-0 w-full h-full rounded-xl border-0'
                  />
                </div>
              ) : (
                <a href={product.videoUrl} target='_blank' rel='noopener noreferrer'
                   className='text-[#1565C0] underline text-[14px]'>
                  Watch product video →
                </a>
              );
            })()}
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
                href={`/category/${toSlug(product.catName || '')}`}
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
            onClick={handleToggleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wishlisted}
            className={`relative min-h-[46px] w-[46px] border-2 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
              wishlisted ? 'bg-red-50 border-red-300 text-red-500' : 'border-gray-200 text-gray-400'
            }`}
          >
            <span className={wishBurst ? 'infix-heart-pop' : ''}>
              {wishlisted ? <FaHeart className='text-[18px]' /> : <FaRegHeart className='text-[18px]' />}
            </span>
            {wishBurst && (
              <span className='infix-heart-burst' aria-hidden='true'>
                <span style={{ '--tx': '-16px', '--ty': '-20px' }}>♥</span>
                <span style={{ '--tx': '16px',  '--ty': '-20px' }}>♥</span>
                <span style={{ '--tx': '-22px', '--ty': '0px'  }}>♥</span>
                <span style={{ '--tx': '22px',  '--ty': '0px'  }}>♥</span>
              </span>
            )}
          </button>
        </div>
        {/* Safe area for notch phones */}
        <div className='h-safe-bottom' />
      </div>
    </div>
    <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </>
  );
};

export default ProductDetails;
