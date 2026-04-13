"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SEO from '../../components/SEO';

const LEGAL_CONTENT = {
  terms: {
    title: 'Terms & Conditions',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: `By accessing and using the InfixMart website (infixmart.com), you accept and agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our platform.`,
      },
      {
        heading: '2. Account Registration',
        body: `To place orders you must register an account with accurate information. You are responsible for maintaining the confidentiality of your password and for all activities that occur under your account. Notify us immediately of any unauthorized use.`,
      },
      {
        heading: '3. Wholesale & Minimum Order',
        body: `InfixMart is a wholesale platform. A minimum order value of ₹999 applies to all orders. This threshold may be revised at any time with prior notice on the platform.`,
      },
      {
        heading: '4. Product Information',
        body: `We strive to display accurate product descriptions, prices, and images. However, we do not warrant that product descriptions or other content is accurate, complete, or error-free. Prices are subject to change without notice.`,
      },
      {
        heading: '5. Intellectual Property',
        body: `All content on this site — including text, graphics, logos, and images — is the property of InfixMart or its content suppliers and is protected by applicable intellectual property laws. Unauthorized use is strictly prohibited.`,
      },
      {
        heading: '6. Limitation of Liability',
        body: `InfixMart shall not be liable for any indirect, incidental, or consequential damages arising out of your use or inability to use the platform or products purchased through it, to the fullest extent permitted by applicable law.`,
      },
      {
        heading: '7. Governing Law',
        body: `These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Bhopal, Madhya Pradesh.`,
      },
      {
        heading: '8. Changes to Terms',
        body: `We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated revision date. Continued use of the platform constitutes your acceptance of the revised terms.`,
      },
    ],
  },

  shipping: {
    title: 'Shipping Policy',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Shipping Partners',
        body: `We ship across India using trusted logistics partners including Delhivery, Blue Dart, and Ekart Logistics. The shipping partner is selected based on your delivery pin code and package size.`,
      },
      {
        heading: 'Delivery Timelines',
        body: `• Metro cities (Delhi, Mumbai, Bengaluru, etc.): 2–4 business days\n• Tier-2 cities: 4–6 business days\n• Remote/rural areas: 6–10 business days\n\nTimelines are estimates and may vary due to weather, strikes, or other unforeseen circumstances.`,
      },
      {
        heading: 'Free Shipping',
        body: `Orders above ₹999 qualify for free shipping. Orders below ₹999 attract a flat shipping fee of ₹49.`,
      },
      {
        heading: 'Order Processing',
        body: `Orders are processed within 24–48 hours on business days (Monday–Saturday, 9:30 AM–6:00 PM IST). Orders placed after 4:00 PM or on Sundays/public holidays are processed the next business day.`,
      },
      {
        heading: 'Tracking Your Order',
        body: `Once your order ships you will receive a tracking link via email and SMS. You can also track your order in real time from the My Orders section of your account.`,
      },
      {
        heading: 'Shipping Restrictions',
        body: `We currently ship only within India. We do not ship to PO Boxes. Certain remote pin codes may have extended delivery timelines or may not be serviceable — we will notify you if your pin code is unserviceable.`,
      },
      {
        heading: 'Damaged in Transit',
        body: `If your order arrives damaged, please take unboxing photos/video immediately and contact us within 24 hours at support@infixmart.com or WhatsApp +91 88714 88214. We will arrange a free replacement or full refund.`,
      },
    ],
  },

  'return-policy': {
    title: 'Return & Refund Policy',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Return Window',
        body: `You may request a return within 3 days of delivery for eligible items. After 3 days we are unable to process returns unless the item is defective or damaged.`,
      },
      {
        heading: 'Eligible Reasons for Return',
        body: `• Item received is damaged or defective\n• Wrong item delivered\n• Item significantly different from description\n\nReturns for "change of mind" or incorrect ordering are not accepted on wholesale orders.`,
      },
      {
        heading: 'Non-Returnable Items',
        body: `• Perishable or consumable goods\n• Intimate wear, socks, undergarments (hygiene reasons)\n• Items marked "Non-Returnable" on the product page\n• Items with tampered or missing original packaging`,
      },
      {
        heading: 'How to Initiate a Return',
        body: `1. Go to My Orders in your account\n2. Select the order and click "Request Return"\n3. Upload photos of the issue\n4. Our team will review and approve within 48 business hours\n5. A pickup will be scheduled or you may be asked to self-ship`,
      },
      {
        heading: 'Refund Process',
        body: `Once we receive and inspect the returned item, refunds are processed within 5–7 business days to your original payment method. For COD orders, refunds are issued as store credit or bank transfer (NEFT/UPI).`,
      },
      {
        heading: 'Partial Refunds',
        body: `In cases where only part of the order is returned, a partial refund will be issued proportional to the returned items, minus any applicable restocking or shipping costs.`,
      },
    ],
  },

  'payment-security': {
    title: 'Payment & Security',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Accepted Payment Methods',
        body: `We accept the following payment methods:\n• UPI (GPay, PhonePe, Paytm, BHIM)\n• Debit & Credit Cards (Visa, Mastercard, RuPay)\n• Net Banking\n• Cash on Delivery (COD) — available on orders above ₹299`,
      },
      {
        heading: 'Secure Checkout',
        body: `All transactions on InfixMart are encrypted using 256-bit SSL (TLS 1.3) technology. We are PCI-DSS compliant and your card details are never stored on our servers. Payments are processed through Razorpay, a certified payment gateway.`,
      },
      {
        heading: 'Cash on Delivery (COD)',
        body: `COD is available on eligible orders above ₹299. An additional COD handling fee of ₹20 may apply. Please keep exact change ready at the time of delivery. COD may not be available for certain pin codes.`,
      },
      {
        heading: 'Payment Failures',
        body: `If your payment fails but your account is debited, the amount will be automatically refunded within 5–7 business days to your bank account. Contact us at support@infixmart.com if you face any issues.`,
      },
      {
        heading: 'Fraud Prevention',
        body: `For your security, we may verify high-value orders via OTP or a callback before dispatch. We will never ask for your full card number, CVV, or OTP over phone, email, or chat. If you receive such requests, please report them immediately.`,
      },
      {
        heading: 'GST & Invoicing',
        body: `GST-compliant invoices are generated for all orders and sent to your registered email. You can also download invoices from My Orders in your account. For B2B GST input credit, please ensure your GSTIN is updated in your profile before ordering.`,
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Information We Collect',
        body: `We collect information you provide directly (name, email, phone, address) and information generated through your use of our platform (browsing history, orders, device information, IP address).`,
      },
      {
        heading: 'How We Use Your Information',
        body: `• To process and fulfill your orders\n• To send order confirmations, shipping updates, and invoices\n• To personalise product recommendations\n• To improve our platform and services\n• To send promotional communications (you can opt out at any time)`,
      },
      {
        heading: 'Information Sharing',
        body: `We do not sell or rent your personal data to third parties. We share information only with:\n• Logistics partners (for delivery)\n• Payment processors (for transactions)\n• Legal authorities (when required by law)\n\nAll third-party partners are bound by strict confidentiality agreements.`,
      },
      {
        heading: 'Cookies',
        body: `We use cookies to enhance your browsing experience, maintain your session, and analyse site traffic. You can disable cookies in your browser settings, though some features may not function properly without them.`,
      },
      {
        heading: 'Data Retention',
        body: `We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting support@infixmart.com.`,
      },
      {
        heading: 'Your Rights',
        body: `You have the right to access, correct, or delete your personal data. You may also object to certain types of processing. To exercise these rights, contact us at support@infixmart.com.`,
      },
      {
        heading: 'Security',
        body: `We implement industry-standard security measures including SSL encryption, firewalls, and regular security audits. However, no method of internet transmission is 100% secure, and we cannot guarantee absolute security.`,
      },
      {
        heading: 'Contact',
        body: `For privacy-related queries, write to us at: privacy@infixmart.com or InfixMart, Bhopal, Madhya Pradesh, India — 462001.`,
      },
    ],
  },

  cancellation: {
    title: 'Order Cancellation Policy',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Cancellation Before Shipment',
        body: `You may cancel your order free of charge before it is shipped. To cancel, go to My Orders → select the order → click "Cancel Order". Orders are typically shipped within 24–48 hours of placement.`,
      },
      {
        heading: 'Cancellation After Shipment',
        body: `Once an order is shipped, it cannot be cancelled. You may refuse delivery at the door, in which case the order will be returned to us. Refunds for refused deliveries are processed after the item is received and inspected at our warehouse (7–10 business days).`,
      },
      {
        heading: 'Cancellation by InfixMart',
        body: `We reserve the right to cancel orders in the following cases:\n• Product is out of stock or discontinued\n• Pricing or description errors\n• Suspected fraudulent activity\n• Unable to deliver to the given address\n\nIn such cases, a full refund will be issued immediately.`,
      },
      {
        heading: 'Refund on Cancellation',
        body: `For prepaid orders cancelled before shipment, refunds are processed within 5–7 business days to the original payment method. COD orders that are cancelled before shipment have no amount to refund.`,
      },
      {
        heading: 'Bulk/Wholesale Orders',
        body: `For bulk orders above ₹10,000, cancellations must be requested within 2 hours of placement. After 2 hours, a restocking fee of up to 10% of the order value may apply.`,
      },
    ],
  },
};

const ROUTES_MAP = {
  '/terms': 'terms',
  '/shipping-policy': 'shipping',
  '/return-policy': 'return-policy',
  '/payment-security': 'payment-security',
  '/privacy-policy': 'privacy',
  '/cancellation-policy': 'cancellation',
};

const LegalPage = () => {
  const pathname = usePathname();
  const key = ROUTES_MAP[pathname] || '';
  const content = LEGAL_CONTENT[key];

  if (!content) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-[22px] font-[700] text-gray-800 mb-3">Page Not Found</h1>
        <Link href="/" className="text-[#1565C0] hover:underline text-[14px]">← Back to Home</Link>
      </section>
    );
  }

  const legalDescription = content.sections?.[0]?.body?.slice(0, 155) || `${content.title} for InfixMart.`;
  const legalStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: content.title,
    description: legalDescription,
    url: pathname,
  };
  const legalBreadcrumbs = {
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
        name: content.title,
        item: pathname,
      },
    ],
  };

  return (
    <section className="w-full py-10">
      <SEO
        title={content.title}
        description={legalDescription}
        url={pathname}
        structuredData={[legalStructuredData, legalBreadcrumbs]}
      />
      <div className="container max-w-[860px] mx-auto">

        {/* Breadcrumb */}
        <nav className="text-[12px] text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-[#1565C0] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-600">{content.title}</span>
        </nav>

        {/* Header */}
        <div className="bg-[#EEF4FF] border border-[#C5D9F5] rounded-xl px-6 py-5 mb-8">
          <h1 className="text-[24px] font-[800] text-[#1565C0] mb-1">{content.title}</h1>
          <p className="text-[13px] text-gray-500">Last updated: {content.lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-7">
          {content.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-[15px] font-[700] text-gray-800 mb-2">{section.heading}</h2>
              <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Contact strip */}
        <div className="mt-8 bg-[#F5F8FF] border border-[#C5D9F5] rounded-xl p-5 text-center">
          <p className="text-[14px] text-gray-600">
            Have questions about this policy?{' '}
            <a href="mailto:support@infixmart.com" className="text-[#1565C0] font-[600] hover:underline">
              support@infixmart.com
            </a>
            {' '}or WhatsApp{' '}
            <a href="https://wa.me/918871488214" className="text-[#1565C0] font-[600] hover:underline">
              +91 88714 88214
            </a>
          </p>
        </div>

      </div>
    </section>
  );
};

export default LegalPage;
