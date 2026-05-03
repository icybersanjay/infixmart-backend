import type { RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type { Id, PriceTier, Product, ProductRow, ProductStatus } from "../types.js";

// Auto-heal: older databases were created before the 2026-04 catalog migration
// added `status` / `viewCount` / `purchaseCount` / `reorderThreshold`. Run the
// idempotent ALTER once per process so the app keeps working without a manual
// `db/migrate.sql` step.
let schemaEnsured = false;
async function ensureProductsSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    await execute(
      `ALTER TABLE Products
         ADD COLUMN IF NOT EXISTS status           ENUM('draft','active','archived') NOT NULL DEFAULT 'active' AFTER sku,
         ADD COLUMN IF NOT EXISTS viewCount        INT NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS purchaseCount    INT NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS reorderThreshold INT NOT NULL DEFAULT 5,
         ADD COLUMN IF NOT EXISTS priceTiers       JSON NULL`,
      {}
    );
    schemaEnsured = true;
  } catch (err) {
    console.error(
      "[products:ensureSchema] failed to auto-add catalog columns:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  sku,
  status,
  description,
  images,
  brand,
  price,
  oldprice,
  priceTiers,
  catName,
  catId,
  subCatId,
  subCat,
  thirdSubCatId,
  thirdSubCat,
  countInStock,
  rating,
  isFeatured,
  discount,
  productRam,
  size,
  productWeight,
  videoUrl,
  saleEndsAt,
  viewCount,
  purchaseCount,
  reorderThreshold,
  createdAt,
  updatedAt
`;

type ProductDbRow = ProductRow & RowDataPacket;

interface MappedProduct extends Product {
  // Re-exported for convenience; identical to Product.
}

function mapProduct(row: ProductDbRow | undefined): MappedProduct | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    status: (row.status || "active") as ProductStatus,
    images: safeParseJson<string[]>(row.images, []),
    productRam: safeParseArrayLike(row.productRam),
    size: safeParseJson<string[]>(row.size, []),
    productWeight: safeParseJson<string[]>(row.productWeight, []),
    priceTiers: safeParseJson(row.priceTiers, [] as never),
    isFeatured: Boolean(row.isFeatured),
    videoUrl: row.videoUrl || null,
    saleEndsAt: row.saleEndsAt ? new Date(row.saleEndsAt as string).toISOString() : null,
    viewCount: Number(row.viewCount || 0),
    purchaseCount: Number(row.purchaseCount || 0),
    reorderThreshold: Number(row.reorderThreshold ?? 5),
  };
}

interface BrandRow extends RowDataPacket {
  brand: string;
}

export async function listBrands(): Promise<string[]> {
  const rows = await query<BrandRow>(
    `SELECT DISTINCT brand FROM Products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC`
  );
  return rows.map((r) => r.brand);
}

export interface ListProductsOptions {
  page?: number;
  perPage?: number;
  category?: string | number;
  categoryName?: string;
  subCategory?: string | number;
  subCategoryName?: string;
  thirdCategory?: string | number;
  thirdCategoryName?: string;
  search?: string;
  onSale?: string;
  minRating?: string | number;
  exactRating?: string | number;
  inStockOnly?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  sort?: string;
  brand?: string;
  status?: ProductStatus | string;
  includeAllStatuses?: boolean;
}

export interface ListProductsResult {
  products: MappedProduct[];
  totalProducts: number;
  totalPages: number;
  page: number;
}

export async function listProducts({
  page = 1,
  perPage = 10,
  category = "",
  categoryName = "",
  subCategory = "",
  subCategoryName = "",
  thirdCategory = "",
  thirdCategoryName = "",
  search = "",
  onSale = "",
  minRating = "",
  exactRating = "",
  inStockOnly = "",
  minPrice = "",
  maxPrice = "",
  sort = "",
  brand = "",
  status = "active",
  includeAllStatuses = false,
}: ListProductsOptions): Promise<ListProductsResult> {
  await ensureProductsSchema();
  const offset = (page - 1) * perPage;
  const filters: string[] = [];
  const params: SqlParams = { limit: perPage, offset };

  if (!includeAllStatuses) {
    filters.push("status = :status");
    params.status = status || "active";
  }

  if (category) {
    filters.push("catId = :category");
    params.category = Number(category);
  }
  if (categoryName) {
    filters.push("catName = :categoryName");
    params.categoryName = String(categoryName);
  }
  if (subCategory) {
    filters.push("subCatId = :subCategory");
    params.subCategory = Number(subCategory);
  }
  if (subCategoryName) {
    filters.push("subCat = :subCategoryName");
    params.subCategoryName = String(subCategoryName);
  }
  if (thirdCategory) {
    filters.push("thirdSubCatId = :thirdCategory");
    params.thirdCategory = Number(thirdCategory);
  }
  if (thirdCategoryName) {
    filters.push("thirdSubCat = :thirdCategoryName");
    params.thirdCategoryName = String(thirdCategoryName);
  }
  if (search) {
    // Use MySQL FULLTEXT for queries long enough to be indexed (default ft_min_word_len=4 → we relax to 3),
    // fall back to LIKE for shorter ones so 1–2 char queries still work.
    const trimmed = String(search).trim();
    if (trimmed.length >= 3) {
      filters.push("MATCH(name, brand, description, sku) AGAINST(:search IN NATURAL LANGUAGE MODE)");
      params.search = trimmed;
    } else {
      filters.push("(name LIKE :searchLike OR sku LIKE :searchLike OR brand LIKE :searchLike)");
      params.searchLike = `%${trimmed}%`;
    }
  }
  if (onSale === "true") {
    filters.push("discount > 0");
  }
  if (minRating) {
    filters.push("rating >= :minRating");
    params.minRating = Number(minRating);
  }
  if (exactRating !== "") {
    filters.push("rating = :exactRating");
    params.exactRating = Number(exactRating);
  }
  if (inStockOnly === "true") {
    filters.push("countInStock > 0");
  }
  if (brand) {
    filters.push("brand = :brand");
    params.brand = String(brand);
  }
  if (minPrice !== "" && maxPrice !== "") {
    filters.push("price BETWEEN :minPrice AND :maxPrice");
    params.minPrice = Number(minPrice);
    params.maxPrice = Number(maxPrice);
  } else if (minPrice !== "") {
    filters.push("price >= :minPrice");
    params.minPrice = Number(minPrice);
  } else if (maxPrice !== "") {
    filters.push("price <= :maxPrice");
    params.maxPrice = Number(maxPrice);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const orderBy = getProductOrderBy(sort);

  const [countRows, productRows] = await Promise.all([
    query<{ total: number } & RowDataPacket>(
      `SELECT COUNT(*) AS total
       FROM Products
       ${whereClause}`,
      params
    ),
    query<ProductDbRow>(
      `SELECT ${PRODUCT_SELECT}
       FROM Products
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT :limit OFFSET :offset`,
      params
    ),
  ]);

  const total = Number(countRows[0]?.total || 0);
  return {
    products: productRows.map((r) => mapProduct(r) as MappedProduct),
    totalProducts: total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    page,
  };
}

export async function listProductsByCategoryId(
  categoryId: Id | string,
  { page = 1, perPage = 10000 }: { page?: number; perPage?: number } = {}
): Promise<ListProductsResult> {
  return listProducts({ page, perPage, category: categoryId });
}

export interface ListProductFacetsOptions {
  category?: string | number;
  categoryName?: string;
  subCategory?: string | number;
  thirdCategory?: string | number;
  search?: string;
  onSale?: string;
  inStockOnly?: string;
  brand?: string;
  minRating?: string | number;
  minPrice?: string | number;
  maxPrice?: string | number;
  status?: ProductStatus | string;
  includeAllStatuses?: boolean;
}

export interface ProductFacetsResult {
  total: number;
  brands: { name: string; count: number }[];
  ratings: { minRating: number; count: number }[];
  prices: { range: [number, number | null]; label: string; count: number }[];
}

/**
 * Facet counts for the same filter set used by `listProducts`. Brand counts
 * exclude any active brand filter (so the user can switch brands), but every
 * other filter applies — i.e. category + price + rating still narrow the
 * brand list. Price + rating bucket counts ignore their own filter to let
 * the user widen the bucket.
 */
export async function listProductFacets({
  category = "",
  categoryName = "",
  subCategory = "",
  thirdCategory = "",
  search = "",
  onSale = "",
  inStockOnly = "",
  brand = "",
  minRating = "",
  minPrice = "",
  maxPrice = "",
  status = "active",
  includeAllStatuses = false,
}: ListProductFacetsOptions = {}): Promise<ProductFacetsResult> {
  await ensureProductsSchema();
  const baseFilters: string[] = [];
  const params: SqlParams = {};

  if (!includeAllStatuses) {
    baseFilters.push("status = :status");
    params.status = status || "active";
  }
  if (category) {
    baseFilters.push("catId = :category");
    params.category = Number(category);
  }
  if (categoryName) {
    baseFilters.push("catName = :categoryName");
    params.categoryName = String(categoryName);
  }
  if (subCategory) {
    baseFilters.push("subCatId = :subCategory");
    params.subCategory = Number(subCategory);
  }
  if (thirdCategory) {
    baseFilters.push("thirdSubCatId = :thirdCategory");
    params.thirdCategory = Number(thirdCategory);
  }
  if (search) {
    const trimmed = String(search).trim();
    if (trimmed.length >= 3) {
      baseFilters.push("MATCH(name, brand, description, sku) AGAINST(:search IN NATURAL LANGUAGE MODE)");
      params.search = trimmed;
    } else {
      baseFilters.push("(name LIKE :searchLike OR sku LIKE :searchLike OR brand LIKE :searchLike)");
      params.searchLike = `%${trimmed}%`;
    }
  }
  if (onSale === "true") baseFilters.push("discount > 0");
  if (inStockOnly === "true") baseFilters.push("countInStock > 0");

  const baseWhere = baseFilters.length ? `WHERE ${baseFilters.join(" AND ")}` : "";

  const brandFilters = [...baseFilters];
  if (minRating) {
    brandFilters.push("rating >= :minRatingForBrand");
    params.minRatingForBrand = Number(minRating);
  }
  if (minPrice !== "" || maxPrice !== "") {
    if (minPrice !== "" && maxPrice !== "") {
      brandFilters.push("price BETWEEN :minPriceForBrand AND :maxPriceForBrand");
      params.minPriceForBrand = Number(minPrice);
      params.maxPriceForBrand = Number(maxPrice);
    } else if (minPrice !== "") {
      brandFilters.push("price >= :minPriceForBrand");
      params.minPriceForBrand = Number(minPrice);
    } else {
      brandFilters.push("price <= :maxPriceForBrand");
      params.maxPriceForBrand = Number(maxPrice);
    }
  }
  const brandWhere = brandFilters.length ? `WHERE ${brandFilters.join(" AND ")}` : "";

  const ratingFilters = [...baseFilters];
  if (brand) {
    ratingFilters.push("brand = :brandForRating");
    params.brandForRating = String(brand);
  }
  const ratingWhere = ratingFilters.length ? `WHERE ${ratingFilters.join(" AND ")}` : "";

  const priceFilters = [...baseFilters];
  if (brand) {
    priceFilters.push("brand = :brandForPrice");
    params.brandForPrice = String(brand);
  }
  if (minRating) {
    priceFilters.push("rating >= :minRatingForPrice");
    params.minRatingForPrice = Number(minRating);
  }
  const priceWhere = priceFilters.length ? `WHERE ${priceFilters.join(" AND ")}` : "";

  type FacetBrandRow = { brand: string; n: number } & RowDataPacket;
  type FacetRatingRow = { bucket: number; n: number } & RowDataPacket;
  type FacetPriceRow = {
    p_under_500: number;
    p_500_999: number;
    p_1000_2499: number;
    p_2500_4999: number;
    p_5000_plus: number;
  } & RowDataPacket;
  type FacetTotalRow = { total: number } & RowDataPacket;

  const [brandRows, ratingRows, priceRows, totalRow] = await Promise.all([
    query<FacetBrandRow>(
      `SELECT brand, COUNT(*) AS n
         FROM Products
         ${brandWhere}
         ${brandWhere ? "AND" : "WHERE"} brand IS NOT NULL AND brand <> ''
         GROUP BY brand
         ORDER BY n DESC, brand ASC
         LIMIT 50`,
      params
    ),
    query<FacetRatingRow>(
      `SELECT FLOOR(rating) AS bucket, COUNT(*) AS n
         FROM Products
         ${ratingWhere}
         GROUP BY bucket
         ORDER BY bucket DESC`,
      params
    ),
    query<FacetPriceRow>(
      `SELECT
          SUM(CASE WHEN price <  500 THEN 1 ELSE 0 END) AS p_under_500,
          SUM(CASE WHEN price BETWEEN 500 AND 999 THEN 1 ELSE 0 END) AS p_500_999,
          SUM(CASE WHEN price BETWEEN 1000 AND 2499 THEN 1 ELSE 0 END) AS p_1000_2499,
          SUM(CASE WHEN price BETWEEN 2500 AND 4999 THEN 1 ELSE 0 END) AS p_2500_4999,
          SUM(CASE WHEN price >= 5000 THEN 1 ELSE 0 END) AS p_5000_plus
         FROM Products
         ${priceWhere}`,
      params
    ),
    query<FacetTotalRow>(
      `SELECT COUNT(*) AS total FROM Products ${baseWhere}`,
      params
    ),
  ]);

  return {
    total: Number(totalRow[0]?.total || 0),
    brands: brandRows.map((r) => ({ name: r.brand, count: Number(r.n || 0) })),
    ratings: ratingRows.map((r) => ({ minRating: Number(r.bucket || 0), count: Number(r.n || 0) })),
    prices: [
      { range: [0, 499],     label: "Under ₹500",      count: Number(priceRows[0]?.p_under_500 || 0) },
      { range: [500, 999],   label: "₹500 – ₹999",     count: Number(priceRows[0]?.p_500_999 || 0) },
      { range: [1000, 2499], label: "₹1,000 – ₹2,499", count: Number(priceRows[0]?.p_1000_2499 || 0) },
      { range: [2500, 4999], label: "₹2,500 – ₹4,999", count: Number(priceRows[0]?.p_2500_4999 || 0) },
      { range: [5000, null], label: "₹5,000 & above",  count: Number(priceRows[0]?.p_5000_plus || 0) },
    ],
  };
}

export async function listFeaturedProducts(): Promise<MappedProduct[]> {
  await ensureProductsSchema();
  const rows = await query<ProductDbRow>(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE isFeatured = 1`
  );

  return rows.map((r) => mapProduct(r) as MappedProduct);
}

export async function findProductById(id: Id): Promise<MappedProduct | null> {
  await ensureProductsSchema();
  const rows = await query<ProductDbRow>(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapProduct(rows[0]);
}

export async function findProductBySlug(slug: string): Promise<MappedProduct | null> {
  await ensureProductsSchema();
  const rows = await query<ProductDbRow>(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE slug = :slug
     LIMIT 1`,
    { slug }
  );

  return mapProduct(rows[0]);
}

export async function findProductBySku(sku: string | null | undefined): Promise<MappedProduct | null> {
  if (!sku) return null;
  await ensureProductsSchema();
  const rows = await query<ProductDbRow>(
    `SELECT ${PRODUCT_SELECT}
       FROM Products
      WHERE sku = :sku
      LIMIT 1`,
    { sku }
  );
  return mapProduct(rows[0]);
}

export async function countProducts(): Promise<number> {
  const rows = await query<{ productCount: number } & RowDataPacket>(
    `SELECT COUNT(*) AS productCount FROM Products`
  );
  return Number(rows[0]?.productCount || 0);
}

export interface ProductPayload {
  name?: string;
  slug?: string | null;
  sku?: string | null;
  status?: ProductStatus | string;
  description?: string | null;
  images?: string[] | string;
  brand?: string | null;
  price?: number;
  oldprice?: number;
  catName?: string | null;
  catId?: Id | null;
  subCatId?: Id | null;
  subCat?: string | null;
  thirdSubCatId?: Id | null;
  thirdSubCat?: string | null;
  countInStock?: number;
  rating?: number;
  isFeatured?: boolean | 0 | 1;
  discount?: number;
  productRam?: string[] | string | null;
  size?: string[] | string | null;
  productWeight?: string[] | string | null;
  priceTiers?: PriceTier[] | string | null;
  videoUrl?: string | null;
  saleEndsAt?: Date | string | null;
  reorderThreshold?: number;
}

export async function createProduct(payload: ProductPayload): Promise<MappedProduct | null> {
  const result = await execute(
    `INSERT INTO Products (
      name,
      slug,
      sku,
      status,
      description,
      images,
      brand,
      price,
      oldprice,
      catName,
      catId,
      subCatId,
      subCat,
      thirdSubCatId,
      thirdSubCat,
      countInStock,
      rating,
      isFeatured,
      discount,
      productRam,
      size,
      productWeight,
      priceTiers,
      videoUrl,
      saleEndsAt,
      reorderThreshold,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :slug,
      :sku,
      :status,
      :description,
      :images,
      :brand,
      :price,
      :oldprice,
      :catName,
      :catId,
      :subCatId,
      :subCat,
      :thirdSubCatId,
      :thirdSubCat,
      :countInStock,
      :rating,
      :isFeatured,
      :discount,
      :productRam,
      :size,
      :productWeight,
      :priceTiers,
      :videoUrl,
      :saleEndsAt,
      :reorderThreshold,
      NOW(),
      NOW()
    )`,
    serializeProductPayload(payload) as unknown as SqlParams
  );

  return findProductById(result.insertId);
}

export async function incrementProductView(id: Id | null | undefined): Promise<void> {
  if (!id) return;
  await execute(
    `UPDATE Products SET viewCount = viewCount + 1 WHERE id = :id`,
    { id }
  );
}

export async function setProductStatus(id: Id, status: ProductStatus | string): Promise<void> {
  await execute(
    `UPDATE Products SET status = :status, updatedAt = NOW() WHERE id = :id`,
    { id, status }
  );
}

export async function listLowStockProducts(
  { limit = 200 }: { limit?: number } = {}
): Promise<MappedProduct[]> {
  await ensureProductsSchema();
  const rows = await query<ProductDbRow>(
    `SELECT ${PRODUCT_SELECT}
       FROM Products
      WHERE status = 'active'
        AND countInStock <= reorderThreshold
        AND countInStock >= 0
      ORDER BY (countInStock - reorderThreshold) ASC, countInStock ASC
      LIMIT :limit`,
    { limit: Number(limit) || 200 }
  );
  return rows.map((r) => mapProduct(r) as MappedProduct);
}

export async function setProductsStatus(
  ids: (Id | string | number)[],
  status: ProductStatus | string
): Promise<number> {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const normalized = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (!normalized.length) return 0;
  const result = await execute(
    `UPDATE Products
       SET status = :status, updatedAt = NOW()
     WHERE id IN (${normalized.join(",")})`,
    { status }
  );
  return result.affectedRows || 0;
}

export async function incrementProductPurchase(
  id: Id | null | undefined,
  qty: number = 1
): Promise<void> {
  if (!id) return;
  await execute(
    `UPDATE Products SET purchaseCount = purchaseCount + :qty WHERE id = :id`,
    { id, qty: Number(qty) || 1 }
  );
}

export async function updateProduct(id: Id, payload: ProductPayload): Promise<MappedProduct | null> {
  const serialized = serializeProductPayload(payload, { partial: true });
  const entries = Object.entries(serialized).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return findProductById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE Products
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findProductById(id);
}

export async function deleteProductById(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM Products
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

export async function listProductsByIds(
  ids: (Id | string | number)[]
): Promise<MappedProduct[]> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const normalizedIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!normalizedIds.length) {
    return [];
  }

  await ensureProductsSchema();
  const rows = await query<ProductDbRow>(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE id IN (${normalizedIds.join(",")})`
  );

  return rows.map((r) => mapProduct(r) as MappedProduct);
}

export async function deleteProductsByIds(
  ids: (Id | string | number)[]
): Promise<number> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }

  const normalizedIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!normalizedIds.length) {
    return 0;
  }

  const result = await execute(
    `DELETE FROM Products
     WHERE id IN (${normalizedIds.join(",")})`
  );

  return Number(result.affectedRows || 0);
}

export async function slugExists(
  slug: string,
  excludeId: Id | null = null
): Promise<boolean> {
  const rows = await query<{ id: Id } & RowDataPacket>(
    `SELECT id
     FROM Products
     WHERE slug = :slug
       ${excludeId ? "AND id != :excludeId" : ""}
     LIMIT 1`,
    excludeId ? { slug, excludeId } : { slug }
  );

  return Boolean(rows[0]);
}

function serializeProductPayload(
  payload: ProductPayload,
  { partial = false }: { partial?: boolean } = {}
): Record<string, unknown> {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);
  const valueFor = <T>(key: string, value: T): T | undefined =>
    partial && !has(key) ? undefined : value;

  return {
    name: valueFor("name", payload.name),
    slug: valueFor("slug", payload.slug),
    sku: valueFor("sku", payload.sku),
    status: valueFor("status", payload.status ?? "active"),
    description: valueFor("description", payload.description),
    images: valueFor(
      "images",
      payload.images ? JSON.stringify(payload.images) : JSON.stringify([])
    ),
    brand: valueFor("brand", payload.brand ?? null),
    price: valueFor("price", payload.price ?? 0),
    oldprice: valueFor("oldprice", payload.oldprice ?? 0),
    catName: valueFor("catName", payload.catName ?? null),
    catId: valueFor("catId", payload.catId ?? null),
    subCatId: valueFor("subCatId", payload.subCatId ?? null),
    subCat: valueFor("subCat", payload.subCat ?? null),
    thirdSubCatId: valueFor("thirdSubCatId", payload.thirdSubCatId ?? null),
    thirdSubCat: valueFor("thirdSubCat", payload.thirdSubCat ?? null),
    countInStock: valueFor("countInStock", payload.countInStock ?? 0),
    rating: valueFor("rating", payload.rating ?? 0),
    isFeatured: valueFor("isFeatured", payload.isFeatured ? 1 : 0),
    discount: valueFor("discount", payload.discount ?? 0),
    productRam: valueFor(
      "productRam",
      Array.isArray(payload.productRam)
        ? JSON.stringify(payload.productRam)
        : payload.productRam ?? JSON.stringify([])
    ),
    size: valueFor(
      "size",
      payload.size ? JSON.stringify(payload.size) : JSON.stringify([])
    ),
    productWeight: valueFor(
      "productWeight",
      payload.productWeight
        ? JSON.stringify(payload.productWeight)
        : JSON.stringify([])
    ),
    priceTiers: valueFor(
      "priceTiers",
      Array.isArray(payload.priceTiers)
        ? (payload.priceTiers.length ? JSON.stringify(payload.priceTiers) : null)
        : payload.priceTiers ?? null
    ),
    videoUrl: valueFor("videoUrl", payload.videoUrl ?? null),
    saleEndsAt: valueFor("saleEndsAt", payload.saleEndsAt ?? null),
    reorderThreshold: valueFor("reorderThreshold", payload.reorderThreshold ?? 5),
  };
}

function getProductOrderBy(sort: string): string {
  if (sort === "price-asc") return "price ASC";
  if (sort === "price-desc") return "price DESC";
  if (sort === "rating-desc") return "rating DESC";
  if (sort === "name-asc") return "name ASC";
  if (sort === "popular") return "(purchaseCount * 5 + viewCount) DESC, rating DESC";
  if (sort === "trending") return "viewCount DESC, rating DESC";
  if (sort === "best-seller" || sort === "bestseller") return "purchaseCount DESC, rating DESC";
  if (sort === "bestseller") return "discount DESC, rating DESC";
  return "createdAt DESC";
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  try {
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return value as T;
    }
    return JSON.parse((value as string) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function safeParseArrayLike(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value as string[];
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}
