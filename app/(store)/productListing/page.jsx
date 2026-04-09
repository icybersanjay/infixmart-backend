import { Suspense } from "react";
import ProductListingPage from "../../_legacy/Pages/ProductListing/index.jsx";

export const metadata = {
  title: "Shop Wholesale Products",
  description:
    "Browse thousands of wholesale products on InfixMart. Bulk deals across all categories — clothing, electronics, home, beauty, and more. Starting at ₹29.",
  keywords: ["wholesale products", "bulk buy", "wholesale shopping India", "cheap wholesale", "InfixMart shop"],
  openGraph: {
    title: "Shop Wholesale Products | InfixMart",
    description:
      "Browse thousands of wholesale products on InfixMart. Bulk deals across all categories starting at ₹29.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Wholesale Products | InfixMart",
    description: "Bulk deals across all categories. Starting at ₹29.",
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductListingPage />
    </Suspense>
  );
}
