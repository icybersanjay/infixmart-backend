"use client";

import React, { useRef } from 'react';
import { IoClose } from 'react-icons/io5';
import { MdPrint, MdDownload } from 'react-icons/md';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Invoice = ({ order, onClose }) => {
  const printRef = useRef();

  const items    = Array.isArray(order.items) ? order.items : [];
  const addr     = order.shippingAddress || {};
  const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0);
  const shipping  = Number(order.shippingPrice || 0);
  const gst       = Number(order.taxPrice       || 0);
  const total     = Number(order.totalPrice     || 0);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${order.id}</title>
          <meta charset="utf-8" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 13px; color: #333; padding: 32px; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
            .brand-name { font-size: 22px; font-weight: 900; color: #1565C0; letter-spacing: 1px; }
            .brand-tag  { font-size: 9px; font-weight: 700; color: #1565C0; letter-spacing: 4px; text-transform: uppercase; }
            .brand-contact { font-size: 11px; color: #777; margin-top: 6px; line-height: 1.6; }
            .invoice-title { font-size: 18px; font-weight: 700; color: #333; text-align: right; }
            .invoice-meta  { font-size: 12px; color: #555; text-align: right; margin-top: 4px; line-height: 1.7; }
            .divider { border: none; border-top: 2px solid #1565C0; margin: 20px 0; }
            .addresses { display: flex; gap: 40px; margin-bottom: 24px; }
            .address-block h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1565C0; margin-bottom: 6px; letter-spacing: 0.5px; }
            .address-block p  { font-size: 13px; color: #444; line-height: 1.7; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            thead th { background: #1565C0; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 600; }
            tbody td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            tbody tr:nth-child(even) td { background: #f9fbff; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { display: flex; justify-content: flex-end; }
            .totals table { width: 280px; }
            .totals td { padding: 5px 10px; font-size: 13px; }
            .totals .grand-total td { font-size: 15px; font-weight: 700; color: #1565C0; border-top: 2px solid #1565C0; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; }
            .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
              background: ${order.status === 'delivered' ? '#e8f5e9' : order.status === 'cancelled' ? '#ffebee' : '#e3f2fd'};
              color: ${order.status === 'delivered' ? '#2e7d32' : order.status === 'cancelled' ? '#c62828' : '#1565C0'};
            }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-start justify-center overflow-y-auto py-8 px-4'
        onClick={onClose}
      >
        <div
          className='bg-white rounded-2xl shadow-2xl w-full max-w-[780px] relative'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal toolbar */}
          <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
            <p className='text-[15px] font-[700] text-gray-800'>Invoice Preview</p>
            <div className='flex items-center gap-2'>
              <button
                onClick={handlePrint}
                className='flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[600] rounded-lg hover:bg-[#0D47A1] transition-colors'
              >
                <MdPrint className='text-[16px]' /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className='w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors'
              >
                <IoClose className='text-[18px] text-gray-500' />
              </button>
            </div>
          </div>

          {/* Invoice content */}
          <div ref={printRef} className='p-8'>

            {/* Header */}
            <div className='flex justify-between items-start mb-8'>
              <div>
                <p className='text-[26px] font-[900] text-[#1565C0] tracking-wide'>InfixMart</p>
                <p className='text-[9px] font-[800] tracking-[4px] text-[#1565C0] uppercase'>Wholesale</p>
                <div className='text-[11px] text-gray-500 mt-2 leading-relaxed'>
                  <p>support@infixmart.com</p>
                  <p>+91 88490 47148</p>
                  <p>GSTIN: 22AAAAA0000A1Z5</p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-[22px] font-[700] text-gray-800'>INVOICE</p>
                <p className='text-[12px] text-gray-500 mt-1'># <span className='font-[600] text-gray-700'>{String(order.id).padStart(6, '0')}</span></p>
                <p className='text-[12px] text-gray-500'>
                  Date:{' '}
                  <span className='font-[500] text-gray-700'>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </p>
                <p className='text-[12px] text-gray-500 mt-1'>
                  Status:{' '}
                  <span className={`font-[700] px-2 py-0.5 rounded-full text-[11px] ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700'
                    : order.status === 'cancelled' ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-[#1565C0]'
                  }`}>
                    {(order.status || 'pending').toUpperCase()}
                  </span>
                </p>
                <p className='text-[12px] text-gray-500 mt-1'>
                  Payment:{' '}
                  <span className='font-[500] text-gray-700 capitalize'>{order.paymentMethod || 'COD'}</span>
                </p>
              </div>
            </div>

            <hr className='border-[#1565C0] border-t-2 mb-6' />

            {/* Billing address */}
            {(() => {
              const name = addr.name || addr.fullName;
              const mobile = addr.mobile || addr.phone;
              const line1 = [addr.flatHouse, addr.areaStreet].filter(Boolean).join(', ') || addr.address;
              const cityLine = [addr.townCity || addr.city, addr.state].filter(Boolean).join(', ');
              const pincode = addr.pincode || addr.postalCode;
              if (!name) return null;
              return (
                <div className='mb-6'>
                  <p className='text-[11px] font-[700] uppercase text-[#1565C0] tracking-widest mb-2'>Ship To</p>
                  <p className='text-[13px] font-[600] text-gray-800'>{name}</p>
                  <p className='text-[13px] text-gray-600 leading-relaxed'>
                    {line1}{line1 && cityLine ? ', ' : ''}
                    {cityLine}{pincode ? ` - ${pincode}` : ''}
                  </p>
                  {addr.landmark && <p className='text-[12px] text-gray-500'>Landmark: {addr.landmark}</p>}
                  {mobile && <p className='text-[13px] text-gray-600'>Ph: {mobile}</p>}
                </div>
              );
            })()}

            {/* Items table */}
            <div className='overflow-x-auto mb-6'>
              <table className='w-full min-w-[500px] border-collapse text-[13px]'>
                <thead>
                  <tr className='bg-[#1565C0] text-white'>
                    <th className='px-3 py-2.5 text-left font-[600]'>#</th>
                    <th className='px-3 py-2.5 text-left font-[600]'>Product</th>
                    <th className='px-3 py-2.5 text-center font-[600]'>Qty</th>
                    <th className='px-3 py-2.5 text-right font-[600]'>Unit Price</th>
                    <th className='px-3 py-2.5 text-right font-[600]'>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FF]'}>
                      <td className='px-3 py-2 text-gray-400'>{idx + 1}</td>
                      <td className='px-3 py-2 text-gray-700 font-[500]'>
                        {item.name}
                        {item.variantName && (
                          <span className='block text-[#1565C0] text-[11px] font-[600] mt-0.5'>
                            {item.variantName}
                            {item.variantSku && (
                              <span className='text-gray-400 font-[400]'> · {item.variantSku}</span>
                            )}
                          </span>
                        )}
                        {item.ram    && <span className='text-gray-400 text-[11px] ml-1'>({item.ram})</span>}
                        {item.size   && <span className='text-gray-400 text-[11px] ml-1'>({item.size})</span>}
                        {item.weight && <span className='text-gray-400 text-[11px] ml-1'>({item.weight})</span>}
                      </td>
                      <td className='px-3 py-2 text-center'>{item.qty}</td>
                      <td className='px-3 py-2 text-right'>₹{fmt(item.price)}</td>
                      <td className='px-3 py-2 text-right font-[600]'>₹{fmt(item.price * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className='flex justify-end'>
              <div className='w-full max-w-[280px]'>
                <div className='flex justify-between py-1.5 text-[13px] text-gray-600 border-b border-gray-100'>
                  <span>Subtotal</span>
                  <span className='font-[500]'>₹{fmt(subtotal)}</span>
                </div>
                <div className='flex justify-between py-1.5 text-[13px] text-gray-600 border-b border-gray-100'>
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-[500]' : 'font-[500]'}>
                    {shipping === 0 ? 'FREE' : `₹${fmt(shipping)}`}
                  </span>
                </div>
                {gst > 0 && (
                  <div className='flex justify-between py-1.5 text-[13px] text-gray-600 border-b border-gray-100'>
                    <span>GST</span>
                    <span className='font-[500]'>₹{fmt(gst)}</span>
                  </div>
                )}
                <div className='flex justify-between py-2.5 text-[16px] font-[700] text-[#1565C0] border-t-2 border-[#1565C0] mt-1'>
                  <span>Total</span>
                  <span>₹{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='mt-10 pt-5 border-t border-gray-100 text-center text-[11px] text-gray-400'>
              <p>Thank you for shopping with InfixMart Wholesale!</p>
              <p className='mt-1'>Questions? Contact us at support@infixmart.com or WhatsApp +91 88490 47148</p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Invoice;
