import { Suspense } from "react";
import ProductListingPage from "../../_legacy/Pages/ProductListing/index.jsx";
import { getAllProducts, getProductBrands } from "../../../lib/server/services/products.js";
import { getAllCategories } from "../../../lib/server/services/categories.js";

const toSlug = (name) =>
  String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const flattenCats = (cats) => {
  const result = [];
  for (const cat of cats || []) {
    result.push(cat);
    if (cat.children?.length) result.push(...flattenCats(cat.children));
  }
  return result;
};

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

  // Get categories first so we can resolve slug → numeric ID before fetching products.
  const categoriesRes = await safe(getAllCategories(), { categories: [] });

  if (filters.category && isNaN(Number(filters.category))) {
    const flat = flattenCats(categoriesRes.categories || []);
    const matched = flat.find(c => toSlug(c.name) === filters.category);
    filters.category = matched ? String(matched.id) : '';
  }

  const [productsRes, brandsRes] = await Promise.all([
    safe(getAllProducts(filters),  { products: [], totalPages: 1, totalProducts: 0 }),
    safe(getProductBrands(),       { brands: [] }),
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
