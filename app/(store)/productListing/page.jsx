import { Suspense } from "react";
import ProductListingPage from "../../_legacy/Pages/ProductListing/index.jsx";
import { getAllProducts, getProductBrands } from "../../../lib/server/services/products.js";
import { getAllCategories } from "../../../lib/server/services/categories.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop Wholesale Products",
  description:
    "Browse thousands of wholesale products on InfixMart. Bulk deals across all categories — clothing, electronics, home, beauty, and more. Starting at ₹29.",
  keywords: ["wholesale products", "bulk buy", "wholesale shopping India", "cheap wholesale", "InfixMart shop"],
  alternates: { canonical: "/productListing" },
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

const PER_PAGE = 20;

// Mirror the filter shape the legacy client builds. Anything missing falls
// through to the listProducts default. We intentionally don't pass `sort` when
// the URL omits it so the server result matches the client's "newest" default.
function buildFiltersFromSearchParams(sp) {
  const out = { page: 1, perPage: PER_PAGE };
  const get = (k) => (typeof sp?.[k] === "string" ? sp[k] : Array.isArray(sp?.[k]) ? sp[k][0] : undefined);
  const map = {
    category: "category",
    minPrice: "minPrice",
    maxPrice: "maxPrice",
    minRating: "minRating",
    inStockOnly: "inStockOnly",
    brand: "brand",
    sort: "sort",
    search: "search",
  };
  for (const [from, to] of Object.entries(map)) {
    const v = get(from);
    if (v !== undefined && v !== "") out[to] = v;
  }
  return out;
}

async function safe(promise, fallback) {
  try { return await promise; } catch { return fallback; }
}

export default async function Page({ searchParams }) {
  const sp = (await searchParams) || {};
  const filters = buildFiltersFromSearchParams(sp);

  // Parallel server-side prefetch — biggest LCP win on the listing page.
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    safe(getAllProducts(filters),       { products: [], totalPages: 1, totalProducts: 0 }),
    safe(getAllCategories(),            { categories: [] }),
    safe(getProductBrands(),            { brands: [] }),
  ]);

  return (
    <Suspense fallback={null}>
      <ProductListingPage
        initialProducts={productsRes.products || []}
        initialTotalPages={productsRes.totalPages || 1}
        initialTotalCount={productsRes.totalProducts || (productsRes.products || []).length}
        initialCategories={categoriesRes.categories || []}
        initialBrands={brandsRes.brands || []}
        initialFilters={filters}
      />
    </Suspense>
  );
}
