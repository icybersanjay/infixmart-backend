// Static legal copy. Plain data — no React imports — so it stays out of the
// client bundle. Add a new policy: append a slug here + a route folder under
// app/(store)/.

export const LEGAL_CONTENT = {
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
        body: `If your order arrives damaged, please take unboxing photos/video immediately and contact us within 24 hours at support@infixmart.com or WhatsApp +91 88490 47148. We will arrange a free replacement or full refund.`,
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
        heading: 'Refund Timeline',
        body: `Once a return is received and inspected, refunds are issued within 5–7 business days to your original payment method. Wallet refunds are instant.`,
      },
      {
        heading: 'Refund Method',
        body: `• Prepaid orders → refunded to the original payment source\n• COD orders → refunded to your bank account or InfixMart Wallet\n• Wallet refunds are credited instantly and can be used on future orders`,
      },
    ],
  },

  'payment-security': {
    title: 'Payment Security',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Encrypted Connections',
        body: `All payment data flows over TLS 1.3 / HTTPS connections. Your card details are never stored on our servers — they are processed directly by our PCI-DSS compliant payment gateway.`,
      },
      {
        heading: 'Payment Gateway',
        body: `We process payments via Razorpay, an RBI-licensed PSP that meets PCI-DSS Level 1 standards. Razorpay supports UPI, credit/debit cards, net banking, EMI, and wallets.`,
      },
      {
        heading: 'Fraud Protection',
        body: `Payment attempts are screened by Razorpay's fraud-detection engine. Suspicious transactions may be blocked or held for manual review. We will contact you if your order needs verification.`,
      },
      {
        heading: 'No Card Details Stored',
        body: `InfixMart does not store credit/debit card numbers, CVVs, or net-banking credentials. Saved cards are tokenised by Razorpay — only the token reaches our servers.`,
      },
      {
        heading: 'Cash on Delivery',
        body: `COD is available on most orders below ₹5,000 and on serviceable pin codes. A small COD fee may apply, shown clearly at checkout.`,
      },
      {
        heading: 'Reporting Issues',
        body: `If you suspect unauthorised activity on your account, email security@infixmart.com immediately. We will lock the account and investigate within 24 hours.`,
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'March 2025',
    sections: [
      {
        heading: 'Information We Collect',
        body: `We collect information you provide directly to us — name, email, mobile number, address, payment information — and information about your activity on the platform such as products viewed, items purchased, and IP address.`,
      },
      {
        heading: 'How We Use Your Information',
        body: `• Process and ship your orders\n• Send order confirmations, tracking, and customer support communications\n• Personalise product recommendations\n• Detect fraud and protect platform security\n• Send marketing communications (you can opt out anytime)`,
      },
      {
        heading: 'Sharing of Information',
        body: `We share your data with:\n• Logistics partners (to deliver orders)\n• Payment gateways (to process payments)\n• Tax authorities (when legally required)\n\nWe never sell your data to advertisers or third parties.`,
      },
      {
        heading: 'Cookies',
        body: `We use cookies for essential site function, analytics, and personalisation. You can manage cookies via your browser settings. Disabling all cookies may degrade the experience (e.g., your cart will not persist).`,
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
