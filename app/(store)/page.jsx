import { Suspense } from "react";
import HomePage from "../_legacy/Pages/Home/index.jsx";
import { getAllProducts } from "../../lib/server/services/products.js";
import { getAllCategories } from "../../lib/server/services/categories.js";
import { getBlogsPublic } from "../../lib/server/services/blogs.js";
import { getHomeSlidesPublic } from "../../lib/server/services/home-slides.js";
import { getSectionItems } from "../../lib/server/services/homepage.js";

export const dynamic = "force-dynamic";

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

// Prefetched in parallel below — keeps each network failure isolated to one slice.
async function safe(promise, fallback) {
  try { return await promise; } catch { return fallback; }
}

const CONTENT_SECTIONS = ["collection", "price_tiers", "why_choose_us", "stats", "newsletter", "flash_deals"];

export default async function Page() {
  const [
    productsRes,
    blogsRes,
    categoriesRes,
    slidesRes,
    sectionConfigRes,
    ...sectionResponses
  ] = await Promise.all([
    safe(getAllProducts({ page: 1, perPage: 50 }),  { products: [] }),
    safe(getBlogsPublic({ page: 1, perPage: 6 }),   { blogs: [] }),
    safe(getAllCategories(),                         { categories: [] }),
    safe(getHomeSlidesPublic(),                      { data: [] }),
    safe(getSectionItems("section_config"),          { items: [] }),
    ...CONTENT_SECTIONS.map((s) =>
      safe(getSectionItems(s),                       { items: [] })
    ),
  ]);

  const initialSectionData = {};
  CONTENT_SECTIONS.forEach((key, i) => {
    initialSectionData[key] = sectionResponses[i]?.items || [];
  });

  return (
    <Suspense fallback={null}>
      <HomePage
        initialProducts={productsRes.products || []}
        initialBlogs={blogsRes.blogs || []}
        initialCategories={categoriesRes.categories || []}
        initialSlides={slidesRes.data || slidesRes.homeSlides || []}
        initialSectionConfig={sectionConfigRes.items || []}
        initialSectionData={initialSectionData}
      />
    </Suspense>
  );
}
