import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProductListingPage from "../../../_legacy/Pages/ProductListing/index.jsx";
import { getAllProducts, getProductBrands } from "../../../../lib/server/services/products.js";
import { getAllCategories } from "../../../../lib/server/services/categories.js";

export const dynamic = "force-dynamic";

const toSlug = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function findInTree(nodes, targetSlug) {
  for (const node of nodes || []) {
    if (toSlug(node.name) === targetSlug) return node;
    if (node.children?.length) {
      const found = findInTree(node.children, targetSlug);
      if (found) return found;
    }
  }
  return null;
}

async function safe(promise, fallback) {
  try { return await promise; } catch { return fallback; }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const categoriesRes = await safe(getAllCategories(), { categories: [] });
  const category = findInTree(categoriesRes.categories || [], slug);
  if (!category) return { title: "Category Not Found | InfixMart" };

  return {
    title: `Buy ${category.name} Wholesale | InfixMart`,
    description: `Shop ${category.name} at the best wholesale prices on InfixMart. Bulk deals, genuine quality, fast delivery. Starting at ₹29.`,
    keywords: [`wholesale ${category.name}`, `bulk ${category.name}`, `${category.name} wholesale India`, `buy ${category.name} online`],
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: `Buy ${category.name} Wholesale | InfixMart`,
      description: `Bulk ${category.name} at wholesale prices — quality guaranteed, fast shipping.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Buy ${category.name} Wholesale | InfixMart`,
      description: `Shop ${category.name} wholesale on InfixMart. Bulk pricing starting at ₹29.`,
    },
  };
}

export async function generateStaticParams() {
  const res = await safe(getAllCategories(), { categories: [] });

  function collectSlugs(nodes) {
    const result = [];
    for (const node of nodes || []) {
      const slug = toSlug(node.name);
      if (slug) result.push({ slug });
      if (node.children?.length) result.push(...collectSlugs(node.children));
    }
    return result;
  }

  return collectSlugs(res.categories || []);
}

const PER_PAGE = 20;

export default async function CategoryPage({ params }) {
  const { slug } = await params;

  const categoriesRes = await safe(getAllCategories(), { categories: [] });
  const category = findInTree(categoriesRes.categories || [], slug);
  if (!category) notFound();

  const filters = { page: 1, perPage: PER_PAGE, category: String(category.id) };

  const [productsRes, brandsRes] = await Promise.all([
    safe(getAllProducts(filters), { products: [], totalPages: 1, totalProducts: 0 }),
    safe(getProductBrands(),      { brands: [] }),
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
        lockedCatId={String(category.id)}
      />
    </Suspense>
  );
}
