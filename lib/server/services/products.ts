import { HttpError } from "../api/http.js";
import { sanitizeRichText } from "../content/html.js";
import { deleteUploadByPublicPath } from "../files/uploads.js";
import {
  countProducts,
  createProduct,
  deleteProductById,
  deleteProductsByIds,
  findProductById,
  findProductBySku,
  findProductBySlug,
  incrementProductView,
  listBrands,
  listFeaturedProducts,
  listProductFacets,
  listProductsByIds,
  listProducts,
  listProductsByCategoryId,
  setProductStatus,
  setProductsStatus,
  slugExists,
  updateProduct,
  type ListProductsOptions,
  type ListProductFacetsOptions,
} from "../repositories/products.js";
import {
  indexProduct,
  isMeilisearchEnabled,
  searchProductFacets,
  searchProductIds,
  unindexProduct,
} from "../search/meilisearch.js";
import { log } from "../logger.js";
import { normalizeTiers as normalizePriceTiers } from "../../shared/price-tiers.js";
import type { Id, Product, ProductStatus } from "../types.js";

// Fire-and-forget Meili sync. Failures are swallowed and logged — the source
// of truth is MySQL; Meili is a search-only cache that gets recovered by the
// nightly reindex script.
function syncProductToMeili(product: Product | null | undefined): void {
  if (!product || !isMeilisearchEnabled()) return;
  Promise.resolve(indexProduct(product)).catch((err) =>
    log.warn(
      { productId: product.id, err: { message: err?.message } },
      "meili_index_product_failed"
    )
  );
}

function unsyncProductFromMeili(productId: Id | null | undefined): void {
  if (!productId || !isMeilisearchEnabled()) return;
  Promise.resolve(unindexProduct(productId)).catch((err) =>
    log.warn(
      { productId, err: { message: err?.message } },
      "meili_unindex_product_failed"
    )
  );
}

const toSlug = (str: unknown): string =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function uniqueProductSlug(name: string, excludeId: Id | null = null): Promise<string> {
  const base = toSlug(name || "product");
  let slug = base || "product";
  let counter = 1;

  while (await slugExists(slug, excludeId)) {
    slug = `${base || "product"}-${counter++}`;
  }

  return slug;
}

const VALID_STATUSES = new Set(["draft", "active", "archived"]);

function normalizeStatus(value: unknown, fallback: ProductStatus = "active"): ProductStatus {
  const v = String(value || "").trim().toLowerCase();
  return (VALID_STATUSES.has(v) ? v : fallback) as ProductStatus;
}

function normalizeSku(raw: unknown): string {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "-");
}

async function reserveSku(
  raw: string | null | undefined,
  { excludeId = null }: { excludeId?: Id | null } = {}
): Promise<string> {
  if (!raw) {
    return `SKU-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  }
  const sku = normalizeSku(raw);
  if (sku.length < 2 || sku.length > 100) {
    throw new HttpError(400, "SKU must be 2–100 characters.");
  }
  const existing = await findProductBySku(sku);
  if (existing && Number(existing.id) !== Number(excludeId)) {
    throw new HttpError(409, `SKU "${sku}" is already used by another product.`);
  }
  return sku;
}

export async function getAllProducts(params: ListProductsOptions) {
  const trimmedSearch = String(params?.search || "").trim();
  if (trimmedSearch.length > 0 && isMeilisearchEnabled()) {
    const meiliResult = await searchProductIds(trimmedSearch, {
      page: params.page,
      perPage: params.perPage,
      category: params.category,
      subCategory: params.subCategory,
      thirdCategory: params.thirdCategory,
      brand: params.brand,
      minRating: params.minRating,
      exactRating: params.exactRating,
      inStockOnly: params.inStockOnly,
      onSale: params.onSale,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sort: params.sort,
      status: params.status,
      includeAllStatuses: params.includeAllStatuses,
    });

    if (meiliResult) {
      const products = meiliResult.ids.length
        ? await listProductsByIds(meiliResult.ids)
        : [];
      const byId = new Map(products.map((p) => [Number(p.id), p]));
      const ordered = meiliResult.ids
        .map((id: Id) => byId.get(Number(id)))
        .filter((p): p is Product => Boolean(p));

      const perPage = Number(params.perPage || 10);
      return {
        products: ordered,
        totalProducts: meiliResult.totalHits,
        totalPages: Math.max(1, Math.ceil(meiliResult.totalHits / perPage)),
        page: Number(params.page || 1),
        message: "Products fetched successfully",
        success: true as const,
        error: false as const,
        searchEngine: "meilisearch" as const,
      };
    }
    log.warn({ query: trimmedSearch }, "meili_search_fell_back_to_mysql");
  }

  const result = await listProducts(params);
  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductByCategoryId(id: Id, params: { page?: number; perPage?: number }) {
  const result = await listProductsByCategoryId(id, params);
  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductByCategoryName(
  categoryName: string,
  params: { page?: number; perPage?: number } = {}
) {
  const result = await listProducts({
    page: Number(params.page || 1),
    perPage: Number(params.perPage || 10000),
    categoryName: categoryName || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductBySubCategoryId(
  id: Id | string,
  params: { page?: number; perPage?: number } = {}
) {
  const result = await listProducts({
    page: Number(params.page || 1),
    perPage: Number(params.perPage || 10000),
    subCategory: id || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductBySubCategoryName(subCategoryName: string) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    subCategoryName: subCategoryName || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductByThirdSubCategoryId(id: Id | string) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    thirdCategory: id || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductByThirdSubCategoryName(thirdCategoryName: string) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    thirdCategoryName: thirdCategoryName || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

interface PriceRangeParams {
  catId?: Id | string;
  subCatId?: Id | string;
  thirdSubCatId?: Id | string;
  minPrice?: number | string;
  maxPrice?: number | string;
}

export async function getProductByPriceRange(params: PriceRangeParams = {}) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    category: params.catId || "",
    subCategory: params.subCatId || "",
    thirdCategory: params.thirdSubCatId || "",
    minPrice: params.minPrice ?? "",
    maxPrice: params.maxPrice ?? "",
  });

  return {
    ...result,
    totalPages: 0,
    page: 0,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

interface ExactRatingParams {
  catId?: Id | string;
  subCatId?: Id | string;
  thirdSubCatId?: Id | string;
  rating?: number | string;
}

export async function getProductByExactRating(params: ExactRatingParams = {}) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    category: params.catId || "",
    subCategory: params.subCatId || "",
    thirdCategory: params.thirdSubCatId || "",
    exactRating: params.rating ?? "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getFeaturedProducts() {
  return {
    products: await listFeaturedProducts(),
    message: "Featured Products fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getSingleProduct(id: Id) {
  const product = await findProductById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  incrementProductView(product.id).catch(() => null);

  return {
    product,
    message: "Product fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getProductBySlugValue(slug: string) {
  const product = await findProductBySlug(slug);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  incrementProductView(product.id).catch(() => null);

  return {
    product,
    message: "Product fetched successfully",
    success: true as const,
    error: false as const,
  };
}

interface CatalogFacetsParams extends ListProductFacetsOptions {
  catId?: Id | string;
  subCatId?: Id | string;
  thirdSubCatId?: Id | string;
}

export async function getCatalogFacets(params: CatalogFacetsParams = {}) {
  const trimmedSearch = String(params?.search || "").trim();
  if (trimmedSearch.length > 0 && isMeilisearchEnabled()) {
    const meiliFacets = await searchProductFacets(trimmedSearch, {
      category: params.category || params.catId,
      subCategory: params.subCategory || params.subCatId,
      thirdCategory: params.thirdCategory || params.thirdSubCatId,
      brand: params.brand || undefined,
      minRating: params.minRating,
      onSale: params.onSale,
      inStockOnly: params.inStockOnly,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    });

    if (meiliFacets) {
      return {
        facets: meiliFacets,
        success: true as const,
        error: false as const,
        searchEngine: "meilisearch" as const,
      };
    }
    log.warn({ query: trimmedSearch }, "meili_facets_fell_back_to_mysql");
  }

  const facets = await listProductFacets({
    category: params.category || params.catId || "",
    categoryName: params.categoryName || "",
    subCategory: params.subCategory || params.subCatId || "",
    thirdCategory: params.thirdCategory || params.thirdSubCatId || "",
    search: params.search || "",
    onSale: params.onSale || "",
    inStockOnly: params.inStockOnly || "",
    brand: params.brand || "",
    minRating: params.minRating || "",
    minPrice: params.minPrice ?? "",
    maxPrice: params.maxPrice ?? "",
  });

  return {
    facets,
    success: true as const,
    error: false as const,
  };
}

export async function getProductCount() {
  return {
    productCount: await countProducts(),
    message: "Product count fetched successfully",
    success: true as const,
    error: false as const,
  };
}

interface ProductBody {
  name?: string;
  slug?: string;
  sku?: string;
  status?: string;
  description?: string;
  images?: string[] | string;
  brand?: string | null;
  price?: number | string;
  oldprice?: number | string;
  catName?: string | null;
  catId?: Id | null;
  subCatId?: Id | null;
  subCat?: string | null;
  thirdSubCatId?: Id | null;
  thirdSubCat?: string | null;
  countInStock?: number | string;
  rating?: number | string;
  isFeatured?: boolean;
  discount?: number | string;
  productRam?: string[] | string;
  size?: string[] | string;
  productWeight?: string[] | string;
  priceTiers?: unknown;
  videoUrl?: string | null;
  saleEndsAt?: string | null;
}

export async function createProductRecord(body: ProductBody) {
  const images = Array.isArray(body.images)
    ? body.images
    : JSON.parse((body.images as string) || "[]");
  const productRam = Array.isArray(body.productRam)
    ? body.productRam
    : JSON.parse((body.productRam as string) || "[]");

  const product = await createProduct({
    name: body.name,
    slug: body.slug
      ? await uniqueProductSlug(body.slug)
      : await uniqueProductSlug(body.name || "product"),
    sku: await reserveSku(body.sku),
    status: normalizeStatus(body.status, "active"),
    description: sanitizeRichText(body.description || ""),
    images,
    brand: body.brand || null,
    price: Number(body.price || 0),
    oldprice: Number(body.oldprice || 0),
    catName: body.catName || null,
    catId: body.catId || null,
    subCatId: body.subCatId || null,
    subCat: body.subCat || null,
    thirdSubCatId: body.thirdSubCatId || null,
    thirdSubCat: body.thirdSubCat || null,
    countInStock: Number(body.countInStock || 0),
    rating: Number(body.rating || 0),
    isFeatured: body.isFeatured || false,
    discount: body.discount != null ? Number(body.discount) : 0,
    productRam,
    size: Array.isArray(body.size) ? body.size : JSON.parse((body.size as string) || "[]"),
    productWeight: Array.isArray(body.productWeight)
      ? body.productWeight
      : JSON.parse((body.productWeight as string) || "[]"),
    priceTiers: normalizePriceTiers(body.priceTiers),
    videoUrl: body.videoUrl || null,
    saleEndsAt: body.saleEndsAt || null,
  });

  syncProductToMeili(product);

  return {
    product,
    message: "Product created successfully",
    success: true as const,
    error: false as const,
  };
}

export async function updateProductRecord(id: Id, body: ProductBody) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new HttpError(404, "Product not found");
  }

  const images = Array.isArray(body.images)
    ? body.images
    : JSON.parse((body.images as string) || "[]");
  const productRam = Array.isArray(body.productRam)
    ? body.productRam
    : JSON.parse((body.productRam as string) || "[]");

  const product = await updateProduct(id, {
    name: body.name,
    slug: body.slug ? await uniqueProductSlug(body.slug, id) : existing.slug ?? undefined,
    sku: body.sku ? await reserveSku(body.sku, { excludeId: id }) : existing.sku ?? undefined,
    status: body.status !== undefined ? normalizeStatus(body.status, (existing.status as ProductStatus) || "active") : existing.status,
    description: sanitizeRichText(body.description || ""),
    images,
    brand: body.brand || null,
    price: Number(body.price || 0),
    oldprice: Number(body.oldprice || 0),
    catName: body.catName || null,
    catId: body.catId || null,
    subCatId: body.subCatId || null,
    subCat: body.subCat || null,
    thirdSubCatId: body.thirdSubCatId || null,
    thirdSubCat: body.thirdSubCat || null,
    countInStock: Number(body.countInStock || 0),
    rating: Number(body.rating || 0),
    isFeatured: body.isFeatured || false,
    discount: body.discount != null ? Number(body.discount) : 0,
    productRam,
    size: Array.isArray(body.size) ? body.size : JSON.parse((body.size as string) || "[]"),
    productWeight: Array.isArray(body.productWeight)
      ? body.productWeight
      : JSON.parse((body.productWeight as string) || "[]"),
    priceTiers: normalizePriceTiers(body.priceTiers),
    videoUrl: body.videoUrl || null,
    saleEndsAt: body.saleEndsAt || null,
  });

  syncProductToMeili(product);

  return {
    product,
    message: "Product updated successfully",
    success: true as const,
    error: false as const,
  };
}

interface QuickActionBody {
  action?: string;
  countInStock?: number | string;
}

export async function updateProductQuickAction(id: Id, body: QuickActionBody = {}) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new HttpError(404, "Product not found");
  }

  const action = String(body.action || "").trim().toLowerCase();
  let updates: Record<string, unknown> = {};
  let message = "Product updated successfully";

  if (action === "mark-sold-out" || action === "mark-out-of-stock") {
    updates = { countInStock: 0 };
    message =
      action === "mark-sold-out"
        ? "Product marked as sold out"
        : "Product marked as out of stock";
  } else if (action === "mark-in-stock") {
    const nextStock = Number(body.countInStock);
    updates = { countInStock: Number.isFinite(nextStock) && nextStock > 0 ? nextStock : 1 };
    message = "Product restocked successfully";
  } else if (action === "toggle-featured") {
    updates = { isFeatured: !existing.isFeatured };
    message = existing.isFeatured
      ? "Product removed from featured"
      : "Product marked as featured";
  } else {
    throw new HttpError(400, "Unsupported product action");
  }

  const product = await updateProduct(id, updates);

  syncProductToMeili(product);

  return {
    product,
    message,
    success: true as const,
    error: false as const,
  };
}

export async function deleteProductRecord(id: Id, { permanent = false }: { permanent?: boolean } = {}) {
  const product = await findProductById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  if (permanent) {
    for (const image of product.images || []) {
      await deleteUploadByPublicPath(image);
    }
    await deleteProductById(id);
    unsyncProductFromMeili(id);
    return {
      message: "Product permanently deleted",
      success: true as const,
      error: false as const,
    };
  }

  await setProductStatus(id, "archived");
  syncProductToMeili({ ...product, status: "archived" });
  return {
    message: "Product archived. It is hidden from the storefront and can be restored from the admin.",
    success: true as const,
    error: false as const,
    archived: true as const,
  };
}

export async function restoreProductRecord(id: Id) {
  const product = await findProductById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }
  await setProductStatus(id, "active");
  syncProductToMeili({ ...product, status: "active" });
  return {
    message: "Product restored.",
    success: true as const,
    error: false as const,
  };
}

export async function bulkDeleteProducts(
  ids: Array<Id | string | number>,
  { permanent = false }: { permanent?: boolean } = {}
) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "No product IDs provided");
  }

  if (permanent) {
    const products = await listProductsByIds(ids);
    for (const product of products) {
      for (const image of product.images || []) {
        await deleteUploadByPublicPath(image);
      }
    }
    await deleteProductsByIds(ids);
    for (const id of ids) unsyncProductFromMeili(Number(id));
    return {
      message: "Products permanently deleted",
      success: true as const,
      error: false as const,
    };
  }

  const affected = await setProductsStatus(ids, "archived");
  if (isMeilisearchEnabled() && affected > 0) {
    listProductsByIds(ids).then((products) => {
      for (const product of products) syncProductToMeili(product);
    }).catch(() => {});
  }
  return {
    message: `Archived ${affected} product${affected === 1 ? "" : "s"}.`,
    success: true as const,
    error: false as const,
    archived: true as const,
    affected,
  };
}

export async function bulkSetProductStatus(
  ids: Array<Id | string | number>,
  status: string
) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "No product IDs provided");
  }
  const normalized = normalizeStatus(status);
  const affected = await setProductsStatus(ids, normalized);
  if (isMeilisearchEnabled() && affected > 0) {
    listProductsByIds(ids).then((products) => {
      for (const product of products) syncProductToMeili(product);
    }).catch(() => {});
  }
  return {
    message: `${normalized === "active" ? "Activated" : normalized === "archived" ? "Archived" : "Updated"} ${affected} product${affected === 1 ? "" : "s"}.`,
    success: true as const,
    error: false as const,
    affected,
    status: normalized,
  };
}

export async function getProductBrands() {
  return { brands: await listBrands(), success: true as const };
}
