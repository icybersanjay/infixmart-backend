// ── Tailwind MUST come first so our custom CSS can override it ──────────────
import "./tailwind.css";                                          // @tailwind base / components / utilities
import "./globals.css";                                           // minimal html/body resets
import "./_legacy/index.css";                                     // global custom styles (.container, body, etc.)

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
import "../node_modules/react-range-slider-input/dist/style.css";

import LegacyProviders from "./_legacy/LegacyProviders.jsx";

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
  logo: `${siteUrl}/favicon.ico`,
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {/* #page-wrapper clips horizontal overflow WITHOUT breaking position:sticky */}
        <div id="page-wrapper">
          <LegacyProviders>{children}</LegacyProviders>
        </div>
      </body>
    </html>
  );
}
