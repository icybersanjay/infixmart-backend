// ── Tailwind MUST come first so our custom CSS can override it ──────────────
import "./tailwind.css";                                          // @tailwind base / components / utilities
import "./globals.css";                                           // minimal html/body resets
import "./_legacy/index.css";                                     // global custom styles (.container, body, etc.)
import Script from "next/script";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-montserrat",
});

// ── Component-level CSS ──────────────────────────────────────────────────────
import "./_legacy/components/bannerBoxV2/style.css";
import "./_legacy/components/Header/Navigation/style.css";
import "./_legacy/components/HeroSlider/style.css";
import "./_legacy/components/HomeCatSlider/style.css";
import "./_legacy/components/ProductItem/style.css";
import "./_legacy/components/ProductItemListView/style.css";
import "./_legacy/components/Search/style.css";
import "./_legacy/components/sideBar/style.css";

// ── Third-party CSS ──────────────────────────────────────────────────────────
import "react-inner-image-zoom/lib/styles.min.css";
import "./vendor/react-range-slider-input.css";
import "swiper/css";
import "swiper/css/navigation";

import { Suspense } from "react";
import LegacyProviders from "./_legacy/LegacyProviders.jsx";
import TopProgressBar from "./_legacy/components/TopProgressBar";
import CookieConsent from "./_legacy/components/CookieConsent";
import AnalyticsPageViews from "./_legacy/components/AnalyticsPageViews";

const siteUrl =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://infixmart.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "InfixMart Wholesale",
    template: "%s | InfixMart Wholesale",
  },
  description:
    "InfixMart — India's wholesale marketplace. Bulk products starting at ₹29. Free shipping on orders above ₹999.",
  keywords: ["wholesale", "bulk buying", "wholesale products India", "InfixMart", "bulk orders online"],
  authors: [{ name: "InfixMart" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "InfixMart Wholesale",
    url: siteUrl,
    title: "InfixMart Wholesale",
    description: "InfixMart — India's wholesale marketplace. Bulk products starting at ₹29. Free shipping on orders above ₹999.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@infixmart",
    title: "InfixMart Wholesale",
    description: "InfixMart — India's wholesale marketplace. Bulk products starting at ₹29.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1565C0",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "InfixMart",
  url: siteUrl,
  logo: `${siteUrl}/icon.jpg`,
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "InfixMart Wholesale",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/productListing?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1565C0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="InfixMart" />
        <link rel="apple-touch-icon" href="/images/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}

        {GTM_ID && (
          <Script id="google-tag-manager" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}} />
        )}
        {/* Suppress PWA install prompt — keep push notifications only */}
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();});` }} />

        {/* ── Google Analytics 4 (Consent Mode v2 — defaults to 'denied') ── */}
        {GA4_ID && (
          <>
            <Script id="ga4-consent-default" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              // Re-apply persisted choice early so GA4 starts with the right state.
              try {
                var isChild = window.localStorage.getItem('infix_is_child_user') === 'true';
                var storedAnalytics = window.localStorage.getItem('infix_cookie_consent_analytics');
                var storedMarketing = window.localStorage.getItem('infix_cookie_consent_marketing');
                if (storedAnalytics == null && storedMarketing == null) {
                  var legacy = window.localStorage.getItem('infix_cookie_consent');
                  storedAnalytics = legacy;
                  storedMarketing = legacy;
                }
                var analyticsState = (storedAnalytics === 'granted' && !isChild) ? 'granted' : 'denied';
                var marketingState = (storedMarketing === 'granted' && !isChild) ? 'granted' : 'denied';
                gtag('consent', 'default', {
                  analytics_storage: analyticsState,
                  ad_storage: marketingState,
                  ad_user_data: marketingState,
                  ad_personalization: marketingState,
                  wait_for_update: 500,
                });
              } catch (e) {
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  wait_for_update: 500,
                });
              }
            `}} />
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
              gtag('js', new Date());
              gtag('config', '${GA4_ID}', { send_page_view: false });
            `}} />
          </>
        )}

        {/* ── Meta Pixel — defers PageView until consent ── */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
          `}} />
        )}

        {/* ── DPDPA Shield Compliance Widget ── */}
        <Script
          src="https://cdn.dpdpashield.in/sdk.js"
          strategy="afterInteractive"
        />

        <TopProgressBar />

        {/* #page-wrapper clips horizontal overflow WITHOUT breaking position:sticky */}
        <div id="page-wrapper">
          <LegacyProviders>
            {children}
            <CookieConsent />
          </LegacyProviders>
        </div>

        <Suspense fallback={null}>
          <AnalyticsPageViews />
        </Suspense>
      </body>
    </html>
  );
}
