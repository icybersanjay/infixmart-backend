import { Suspense } from "react";
import HomePage from "../_legacy/Pages/Home/index.jsx";

export const metadata = {
  title: "India's Wholesale Marketplace — Bulk Products Starting at ₹29",
  description:
    "InfixMart — India's leading wholesale marketplace. Shop bulk products across 100+ categories. Free shipping on orders above ₹999. Trusted by thousands of resellers.",
  keywords: ["wholesale marketplace India", "bulk products", "wholesale online shopping", "InfixMart", "reseller products India"],
  alternates: {
    canonical:
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://infixmart.com",
  },
  openGraph: {
    title: "InfixMart — India's Wholesale Marketplace",
    description:
      "Bulk products starting at ₹29. Free shipping above ₹999. Shop across 100+ categories.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InfixMart — India's Wholesale Marketplace",
    description: "Bulk products starting at ₹29. Free shipping above ₹999.",
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
