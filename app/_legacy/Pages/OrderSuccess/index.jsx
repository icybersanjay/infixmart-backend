import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaCheckCircle, FaBoxOpen, FaShoppingBag } from 'react-icons/fa';

const OrderSuccess = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // Confetti via CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    script.onload = () => {
      if (window.confetti) {
        window.confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#1565C0', '#00A651', '#2196F3', '#FFD700', '#E53935'],
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  return (
    <section className="min-h-screen bg-[#F5F5F5] flex items-center justify-center py-16 px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-[rgba(0,0,0,0.06)] p-10 max-w-[480px] w-full text-center">

        {/* Animated checkmark */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-[#e8f5e9] flex items-center justify-center animate-[scale-in_0.4s_ease-out]"
            style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <FaCheckCircle className="text-[#00A651] text-[52px]" />
          </div>
        </div>

        <h1 className="text-[22px] font-[800] text-[#1565C0] mb-2">Order Placed Successfully!</h1>

        {orderId && (
          <p className="text-[13px] text-gray-400 font-[500] mb-3">
            Order ID: <span className="font-[700] text-gray-600">#{orderId}</span>
          </p>
        )}

        <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
          Your order has been confirmed. You will receive a confirmation email shortly with your order details and tracking information.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/my-orders"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1565C0] text-white text-[13px] font-[700] rounded-lg hover:bg-[#0D47A1] transition-colors"
          >
            <FaBoxOpen className="text-[14px]" /> Track My Orders
          </Link>
          <Link
            href="/productListing"
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#1565C0] text-[#1565C0] text-[13px] font-[700] rounded-lg hover:bg-[#f0f5ff] transition-colors"
          >
            <FaShoppingBag className="text-[14px]" /> Continue Shopping
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
};

export default OrderSuccess;
