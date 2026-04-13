import React, { useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MyContext } from '../../LegacyProviders';
import { useCart } from '../../context/CartContext';
import { getData, postData, deleteData } from '../../utils/api';
import { imgUrl } from '../../utils/imageUrl';
import CircularProgress from '@mui/material/CircularProgress';
import { FaMapMarkerAlt, FaPlus, FaTrash, FaCheck, FaCreditCard, FaMobileAlt, FaUniversity, FaWallet, FaMoneyBillWave } from 'react-icons/fa';
import useStoreSettings from '../../hooks/useStoreSettings';
import { useForm, required, exactDigits, minLength } from '../../hooks/useForm';
import { MdLocalShipping } from 'react-icons/md';
import { BsFillBagCheckFill } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_COST = 49;

// ─── Step indicator ────────────────────────────────────────────────────────────
const Stepper = ({ step }) => {
  const steps = ['Address', 'Order Summary', 'Payment'];
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, idx) => {
        const num = idx + 1;
        const done = step > num;
        const active = step === num;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-[700] transition-colors ${
                done ? 'bg-[#00A651] text-white' : active ? 'bg-[#1565C0] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {done ? <FaCheck className="text-[11px]" /> : num}
              </div>
              <span className={`text-[11px] font-[600] ${active ? 'text-[#1565C0]' : done ? 'text-[#00A651]' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-[2px] w-10 md:w-20 mx-1 md:mx-2 mt-[-12px] transition-colors ${step > num ? 'bg-[#00A651]' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Address card ──────────────────────────────────────────────────────────────
const AddressCard = ({ addr, selected, onSelect, onDelete }) => (
  <div
    onClick={onSelect}
    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
      selected ? 'border-[#1565C0] bg-[#f0f5ff] shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
    }`}
  >
    {selected && (
      <span className="absolute top-3 right-3 w-5 h-5 bg-[#1565C0] rounded-full flex items-center justify-center">
        <FaCheck className="text-white text-[9px]" />
      </span>
    )}
    <p className="text-[14px] font-[600] text-gray-800">{addr.name}</p>
    <p className="text-[13px] text-gray-500">{addr.mobile}</p>
    <p className="text-[13px] text-gray-600 mt-1">
      {addr.flatHouse}{addr.areaStreet ? ', ' + addr.areaStreet : ''}
    </p>
    <p className="text-[13px] text-gray-600">{addr.townCity}, {addr.state} — {addr.pincode}</p>
    <p className="text-[12px] text-gray-400">{addr.country || 'India'}</p>
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(addr.id); }}
      className="absolute bottom-3 right-3 text-gray-300 hover:text-[#E53935] transition-colors"
    >
      <FaTrash className="text-[12px]" />
    </button>
  </div>
);

// ─── Add address form ──────────────────────────────────────────────────────────
const AddressForm = ({ onSave, onCancel, saving }) => {
  const { values: form, errors, handleChange, handleBlur, validate, hasErrors } = useForm(
    { fullName: '', phone: '', addressLine: '', city: '', state: '', pincode: '' },
    {
      fullName:    [required('Full name is required'), minLength(2, 'Min 2 characters')],
      phone:       [required('Phone is required'), exactDigits(10, 'Enter a valid 10-digit number')],
      addressLine: [required('Address is required'), minLength(10, 'Enter a more detailed address')],
      city:        [required('City is required')],
      state:       [required('State is required')],
      pincode:     [required('Pincode is required'), exactDigits(6, 'Enter a valid 6-digit pincode')],
    }
  );

  const handleSubmit = (e) => { e.preventDefault(); if (validate()) onSave(form); };

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="text-[12px] font-[600] text-gray-600 block mb-1">{label} *</label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder || label}
        className={`w-full h-[38px] px-3 text-[13px] border rounded-md focus:outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] transition-all ${errors[name] ? 'border-[#E53935]' : 'border-gray-300'}`}
      />
      {errors[name] && <p className="text-[11px] text-[#E53935] mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-dashed border-[#1565C0] rounded-lg bg-[#f8fbff]">
      <h3 className="text-[14px] font-[600] text-gray-700 mb-4 flex items-center gap-2">
        <FaMapMarkerAlt className="text-[#1565C0]" /> New Delivery Address
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('fullName', 'Full Name')}
        {field('phone', 'Phone Number', 'tel', '10-digit mobile')}
        <div className="sm:col-span-2">{field('addressLine', 'Address Line', 'text', 'House No., Street, Area')}</div>
        {field('city', 'City')}
        {field('state', 'State')}
        {field('pincode', 'Pincode', 'text', '6-digit pincode')}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          type="submit"
          disabled={saving || hasErrors}
          className="flex items-center gap-2 px-5 py-2 bg-[#1565C0] text-white text-[13px] font-[600] rounded-md hover:bg-[#0D47A1] transition-colors disabled:opacity-60"
        >
          {saving ? <CircularProgress size={14} style={{ color: '#fff' }} /> : null}
          Save Address
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-[13px] font-[500] text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

// ─── Price summary sidebar ─────────────────────────────────────────────────────
const PriceSummary = ({ cartItems, discount, couponMsg, couponStatus, gstAmount, gstPercent, milestoneShippingFree, shipping }) => {
  const subtotal = cartItems.reduce((s, i) => s + (i.productId?.price || 0) * (i.quantity || 1), 0);
  const gst = gstAmount ?? 0;
  const total = Math.max(0, subtotal + gst + shipping - (discount || 0));

  return (
    <div className="bg-white rounded-lg border border-[rgba(0,0,0,0.08)] p-5 lg:sticky lg:top-[80px]">
      <h3 className="text-[14px] font-[700] text-gray-800 mb-4 pb-3 border-b border-gray-100">Price Details</h3>
      <div className="space-y-3 text-[13px]">
        <div className="flex justify-between">
          <span className="text-gray-500">Items ({cartItems.length})</span>
          <span className="font-[500]">₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        {gst > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>GST ({gstPercent}%)</span>
            <span className="font-[500]">+₹{gst.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Shipping</span>
          {shipping === 0
            ? <span className="font-[600] text-[#00A651]">FREE</span>
            : <span className="font-[500]">₹{shipping}</span>}
        </div>
        {milestoneShippingFree && (
          <p className="text-[11px] font-[600] text-[#00A651] flex items-center gap-1">
            🚚 Free Shipping Unlocked!
          </p>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-[#00A651]">
            <span>Coupon Discount</span>
            <span className="font-[600]">-₹{discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        {couponMsg && (
          <p className={`text-[12px] font-[500] ${couponStatus === 'success' ? 'text-[#00A651]' : 'text-[#E53935]'}`}>
            {couponMsg}
          </p>
        )}
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <span className="font-[700] text-gray-800">Total</span>
          <span className="font-[800] text-[#1565C0] text-[16px]">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Checkout ─────────────────────────────────────────────────────────────
const Checkout = () => {
  const context = useContext(MyContext);
  const { cartItems, fetchCart } = useCart();
  const router = useRouter();
  const { codEnabled, gstPercent, cartMilestones } = useStoreSettings();

  const [step, setStep] = useState(1);

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponStatus, setCouponStatus] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Payment state
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('razorpay');

  // Derived values
  const subtotal  = cartItems.reduce((s, i) => s + (i.productId?.price || 0) * (i.quantity || 1), 0);
  const gstAmount = Math.round(subtotal * (gstPercent / 100) * 100) / 100;
  const parsedMilestones = Array.isArray(cartMilestones) ? cartMilestones : [];
  const freeShippingMilestone = parsedMilestones.find((m) => m.type === 'free_shipping' && m.enabled !== false);
  const milestoneShippingFree = !!(freeShippingMilestone && subtotal >= Number(freeShippingMilestone.amount));
  const shipping  = subtotal >= FREE_SHIPPING_THRESHOLD || milestoneShippingFree ? 0 : SHIPPING_COST;
  const total     = Math.max(0, subtotal + gstAmount + shipping - discount);
  const selectedAddrObj = addresses.find((a) => a.id === selectedAddr);

  // Load Razorpay script on mount
  useEffect(() => {
    if (document.getElementById('razorpay-script')) { setRazorpayReady(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => console.error('Failed to load Razorpay script');
    document.body.appendChild(script);
  }, []);

  // Fetch saved addresses
  const fetchAddresses = async () => {
    setLoadingAddr(true);
    const res = await getData('/api/user/addresses');
    if (res && !res.error) {
      const list = res.data || [];
      setAddresses(list);
      if (list.length === 0) setShowForm(true);
      else {
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddr(def.id);
      }
    }
    setLoadingAddr(false);
  };
  useEffect(() => { fetchAddresses(); }, []);

  const handleSaveAddress = async (form) => {
    setSavingAddr(true);
    const res = await postData('/api/user/addresses', form);
    setSavingAddr(false);
    if (res && !res.error) {
      context.openAlertBox('success', 'Address saved!');
      setShowForm(false);
      await fetchAddresses();
      setSelectedAddr(res.data?.id);
    } else {
      context.openAlertBox('error', res?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id) => {
    const res = await deleteData(`/api/user/addresses/${id}`);
    if (res && !res.error) {
      const updated = addresses.filter((a) => a.id !== id);
      setAddresses(updated);
      if (selectedAddr === id) setSelectedAddr(updated[0]?.id || null);
      if (updated.length === 0) setShowForm(true);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponMsg('');
    try {
      const res = await postData('/api/coupon/apply', {
        code: couponCode.trim(),
        cartTotal: subtotal + gstAmount + shipping,
      });
      if (res && !res.error) {
        setDiscount(res.discount || 0);
        setAppliedCouponCode(res.couponCode || '');
        setCouponMsg(res.message || 'Coupon applied!');
        setCouponStatus('success');
      } else {
        setDiscount(0);
        setAppliedCouponCode('');
        setCouponMsg(res?.message || 'Invalid coupon code');
        setCouponStatus('error');
      }
    } catch {
      setDiscount(0);
      setAppliedCouponCode('');
      setCouponMsg('Failed to apply coupon');
      setCouponStatus('error');
    }
    setApplyingCoupon(false);
  };

  // ── Razorpay payment handler ─────────────────────────────────────────────────
  const handlePay = async () => {
    if (!razorpayReady) { toast.error('Payment gateway not ready, please wait.'); return; }
    if (!selectedAddr) { toast.error('Select a delivery address first.'); return; }

    setPaymentLoading(true);
    let orderData;
    try {
      orderData = await postData('/api/payment/create-order', {
        addressId: selectedAddr,
        couponCode: appliedCouponCode || undefined,
      });
    } catch {
      toast.error('Could not initiate payment. Please try again.');
      setPaymentLoading(false);
      return;
    }

    if (!orderData || orderData.error) {
      toast.error(orderData?.message || 'Payment initiation failed.');
      setPaymentLoading(false);
      return;
    }

    const options = {
      // OWASP A05: key injected from frontend env var, never from API response
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'InfixMart',
      description: 'Order Payment',
      order_id: orderData.orderId,
      prefill: {
        name: context?.userData?.name || '',
        email: context?.userData?.email || '',
        contact: selectedAddrObj?.mobile || '',
      },
      theme: { color: '#1565C0' },
      modal: {
        ondismiss: () => {
          setPaymentLoading(false);
          toast.error('Payment cancelled.', { style: { background: '#E53935', color: '#fff' } });
        },
      },
      handler: async (response) => {
        await handlePaymentSuccess(response, orderData.orderId, orderData.checkoutToken);
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handlePaymentSuccess = async (razorpayResponse, rzpOrderId, checkoutToken) => {
    const loadingToast = toast.loading('Verifying payment...');
    try {
      const verifyRes = await postData('/api/payment/verify', {
        checkoutToken,
        razorpay_order_id: razorpayResponse.razorpay_order_id || rzpOrderId,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      });

      if (!verifyRes?.success) {
        toast.dismiss(loadingToast);
        toast.error(verifyRes?.message || 'Payment verification failed. Contact support.');
        return;
      }

      toast.dismiss(loadingToast);
      toast.success('Order placed successfully!');
      await fetchCart();
      router.push(`/order-success?orderId=${verifyRes.order?.id || ''}`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Something went wrong. Please contact support.');
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── COD order handler ────────────────────────────────────────────────────────
  const handleCODOrder = async () => {
    if (!selectedAddr) { toast.error('Select a delivery address first.'); return; }
    setPaymentLoading(true);
    const loadingToast = toast.loading('Placing your order...');
    try {
      const orderRes = await postData('/api/order', {
        addressId: selectedAddr,
        paymentMethod: 'COD',
        couponCode: appliedCouponCode || undefined,
      });

      if (!orderRes || orderRes.error) {
        toast.dismiss(loadingToast);
        toast.error(orderRes?.message || 'Order placement failed. Contact support.');
        return;
      }

      await fetchCart();
      toast.dismiss(loadingToast);
      toast.success('Order placed successfully!');
      router.push(`/order-success?orderId=${orderRes.order?.id || ''}`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Something went wrong. Please contact support.');
      console.error(err);
    }
    setPaymentLoading(false);
  };

  // ── Step renderers ───────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      <h2 className="text-[16px] font-[700] text-gray-800 mb-4 flex items-center gap-2">
        <FaMapMarkerAlt className="text-[#1565C0]" /> Select Delivery Address
      </h2>
      {loadingAddr ? (
        <div className="flex justify-center py-10">
          <CircularProgress size={28} style={{ color: '#1565C0' }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                addr={addr}
                selected={selectedAddr === addr.id}
                onSelect={() => setSelectedAddr(addr.id)}
                onDelete={handleDeleteAddress}
              />
            ))}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 flex items-center gap-2 text-[13px] font-[600] text-[#1565C0] hover:text-[#0D47A1] transition-colors"
            >
              <FaPlus className="text-[11px]" /> Add New Address
            </button>
          )}
          {showForm && (
            <AddressForm
              onSave={handleSaveAddress}
              onCancel={addresses.length > 0 ? () => setShowForm(false) : null}
              saving={savingAddr}
            />
          )}
          {selectedAddr && !showForm && (
            <button
              onClick={() => setStep(2)}
              className="mt-6 w-full py-3 bg-[#1565C0] text-white text-[14px] font-[700] rounded-lg hover:bg-[#0D47A1] transition-colors"
            >
              Deliver Here →
            </button>
          )}
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-[16px] font-[700] text-gray-800 mb-4">Order Summary</h2>

      {selectedAddrObj && (
        <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px]">
          <p className="text-[11px] font-[700] text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <MdLocalShipping /> Delivering to
          </p>
          <p className="font-[600] text-gray-800">{selectedAddrObj.name} — {selectedAddrObj.mobile}</p>
          <p className="text-gray-600">
            {selectedAddrObj.flatHouse}{selectedAddrObj.areaStreet ? ', ' + selectedAddrObj.areaStreet : ''},&nbsp;
            {selectedAddrObj.townCity}, {selectedAddrObj.state} {selectedAddrObj.pincode}
          </p>
        </div>
      )}

      <div className="space-y-3 mb-5">
        {cartItems.map((item) => {
          const product = item.productId || {};
          const images = Array.isArray(product.images) ? product.images : [];
          const lineTotal = (product.price || 0) * (item.quantity || 1);
          return (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg">
              <div className="w-[60px] h-[60px] rounded-md overflow-hidden border border-gray-100 flex-shrink-0">
                <img src={imgUrl(images[0]) || 'https://via.placeholder.com/60'} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-[500] text-gray-700 line-clamp-1">{product.name}</p>
                <p className="text-[12px] text-gray-400">Qty: {item.quantity}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-[700] text-gray-800">₹{lineTotal.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-gray-400">₹{(product.price || 0).toLocaleString('en-IN')} each</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coupon */}
      <div className="mb-5">
        <label className="text-[12px] font-[600] text-gray-600 block mb-2">Coupon Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value);
              setCouponMsg('');
              setCouponStatus('');
              setDiscount(0);
              setAppliedCouponCode('');
            }}
            placeholder="Enter coupon code"
            className="flex-1 h-[38px] px-3 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:border-[#1565C0] uppercase transition-all"
          />
          <button
            onClick={handleApplyCoupon}
            disabled={applyingCoupon || !couponCode.trim()}
            className="px-4 h-[38px] bg-[#1565C0] text-white text-[13px] font-[600] rounded-md hover:bg-[#0D47A1] disabled:opacity-50 flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            {applyingCoupon ? <CircularProgress size={12} style={{ color: '#fff' }} /> : null} Apply
          </button>
          {discount > 0 && (
            <button
              onClick={() => { setDiscount(0); setCouponCode(''); setCouponMsg(''); setCouponStatus(''); setAppliedCouponCode(''); }}
              className="px-3 h-[38px] text-gray-400 hover:text-[#E53935] border border-gray-200 rounded-md transition-colors"
            >
              <IoClose />
            </button>
          )}
        </div>
        {couponMsg && (
          <p className={`text-[12px] mt-1 font-[500] ${couponStatus === 'success' ? 'text-[#00A651]' : 'text-[#E53935]'}`}>
            {couponMsg}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-gray-300 text-gray-600 text-[14px] font-[600] rounded-lg hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={cartItems.length === 0}
          className="flex-1 py-3 bg-[#1565C0] text-white text-[14px] font-[700] rounded-lg hover:bg-[#0D47A1] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          <BsFillBagCheckFill /> Proceed to Payment
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-[16px] font-[700] text-gray-800 mb-2">Payment</h2>
      <p className="text-[13px] text-gray-400 mb-5">Choose a payment method</p>

      {/* Order recap */}
      {selectedAddrObj && (
        <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-500">
          <MdLocalShipping className="inline mr-1" />
          Delivering to <span className="font-[600] text-gray-700">{selectedAddrObj.name}</span> —{' '}
          {selectedAddrObj.townCity}, {selectedAddrObj.state}
        </div>
      )}

      {/* Payment method selection */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {/* Razorpay */}
        <div
          onClick={() => setSelectedPayment('razorpay')}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedPayment === 'razorpay'
              ? 'border-[#1565C0] bg-[#f0f5ff]'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPayment === 'razorpay' ? 'border-[#1565C0]' : 'border-gray-300'}`}>
              {selectedPayment === 'razorpay' && <div className="w-2 h-2 rounded-full bg-[#1565C0]" />}
            </div>
            <div>
              <p className="text-[14px] font-[600] text-gray-800 flex items-center gap-2">
                <FaCreditCard className="text-[#1565C0]" /> Pay Online
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">UPI · Cards · Net Banking · Wallets via Razorpay</p>
            </div>
          </div>
        </div>

        {/* COD — only if enabled */}
        {codEnabled && (
          <div
            onClick={() => setSelectedPayment('cod')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedPayment === 'cod'
                ? 'border-[#1565C0] bg-[#f0f5ff]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPayment === 'cod' ? 'border-[#1565C0]' : 'border-gray-300'}`}>
                {selectedPayment === 'cod' && <div className="w-2 h-2 rounded-full bg-[#1565C0]" />}
              </div>
              <div>
                <p className="text-[14px] font-[600] text-gray-800 flex items-center gap-2">
                  <FaMoneyBillWave className="text-[#00A651]" /> Cash on Delivery
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5">Pay when your order arrives</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      {selectedPayment === 'razorpay' ? (
        <>
          <button
            onClick={handlePay}
            disabled={paymentLoading || !razorpayReady}
            className="w-full py-4 bg-[#1565C0] text-white text-[15px] font-[700] rounded-lg hover:bg-[#0D47A1] disabled:opacity-60 transition-colors flex items-center justify-center gap-3 shadow-md"
          >
            {paymentLoading
              ? <CircularProgress size={18} style={{ color: '#fff' }} />
              : <FaCreditCard className="text-[16px]" />}
            {paymentLoading ? 'Initiating Payment...' : `Pay ₹${total.toLocaleString('en-IN')}`}
          </button>
          {!razorpayReady && (
            <p className="text-[12px] text-gray-400 text-center mt-2">Loading payment gateway...</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            {[{ icon: <FaMobileAlt />, label: 'UPI' }, { icon: <FaUniversity />, label: 'Net Banking' }, { icon: <FaCreditCard />, label: 'Cards' }, { icon: <FaWallet />, label: 'Wallets' }].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] font-[500] text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {icon} {label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={handleCODOrder}
          disabled={paymentLoading}
          className="w-full py-4 bg-[#00A651] text-white text-[15px] font-[700] rounded-lg hover:bg-[#007a3d] disabled:opacity-60 transition-colors flex items-center justify-center gap-3 shadow-md"
        >
          {paymentLoading
            ? <CircularProgress size={18} style={{ color: '#fff' }} />
            : <FaMoneyBillWave className="text-[16px]" />}
          {paymentLoading ? 'Placing Order...' : `Place Order — ₹${total.toLocaleString('en-IN')}`}
        </button>
      )}

      <p className="text-[11px] text-gray-400 text-center mt-4">
        🔒 Your payment is secured with 256-bit SSL encryption
      </p>

      <div className="flex gap-3 mt-6">
        <button onClick={() => setStep(2)} className="flex-1 py-3 border-2 border-gray-300 text-gray-600 text-[14px] font-[600] rounded-lg hover:bg-gray-50 transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );

  return (
    <section className="py-10 bg-[#F5F5F5] min-h-screen">
      <div className="container">
        <Stepper step={step} />
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full">
            <div className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)] p-4 md:p-6">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </div>
          </div>
          <div className="w-full lg:w-[300px] lg:flex-shrink-0">
            <PriceSummary
              cartItems={cartItems}
              discount={discount}
              couponMsg={step === 2 ? couponMsg : ''}
              couponStatus={couponStatus}
              gstAmount={gstAmount}
              gstPercent={gstPercent}
              milestoneShippingFree={milestoneShippingFree}
              shipping={shipping}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Checkout;
