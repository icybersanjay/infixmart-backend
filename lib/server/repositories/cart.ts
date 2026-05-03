import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type { Id } from "../types.js";

// Auto-heal: older databases predate the ProductVariants rollout. Add
// `variantId` to CartProducts and relax the (userId, productId) unique
// constraint to (userId, productId, variantId) so the same product can sit in
// the cart twice with different variants. Idempotent, ran once per process.
let cartSchemaEnsured = false;
async function ensureCartVariantSchema(): Promise<void> {
  if (cartSchemaEnsured) return;
  try {
    await execute(
      `ALTER TABLE CartProducts
         ADD COLUMN IF NOT EXISTS variantId INT NULL AFTER productId`,
      {}
    );
    // Best-effort: drop the legacy 2-column unique key + add the 3-column one.
    // Both wrapped in try so a missing/already-applied state doesn't crash.
    try {
      await execute(`ALTER TABLE CartProducts DROP INDEX uq_cart_user_product`, {});
    } catch {
      // index may already be gone — that's fine
    }
    try {
      await execute(
        `ALTER TABLE CartProducts
           ADD UNIQUE KEY uq_cart_user_product_variant (userId, productId, variantId)`,
        {}
      );
    } catch {
      // index may already exist — that's fine
    }
    cartSchemaEnsured = true;
  } catch (err) {
    console.error(
      "[cart:ensureVariantSchema] failed to add variantId column:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

const PRODUCT_SELECT = `
  p.id,
  p.name,
  p.slug,
  p.sku,
  p.description,
  p.images,
  p.brand,
  p.price,
  p.oldprice,
  p.catName,
  p.catId,
  p.subCatId,
  p.subCat,
  p.thirdSubCatId,
  p.thirdSubCat,
  p.countInStock,
  p.rating,
  p.isFeatured,
  p.discount,
  p.productRam,
  p.size,
  p.productWeight,
  p.createdAt,
  p.updatedAt
`;

interface CartJoinedRow extends RowDataPacket {
  cartId: Id;
  quantity: number;
  userId: Id;
  cartVariantId: Id | null;
  cartCreatedAt: Date | string;
  cartUpdatedAt: Date | string;
  id: Id;
  name: string;
  slug: string | null;
  sku: string | null;
  description: string | null;
  images: string | string[] | null;
  brand: string | null;
  price: string | number;
  oldprice: string | number | null;
  catName: string | null;
  catId: Id | null;
  subCatId: Id | null;
  subCat: string | null;
  thirdSubCatId: Id | null;
  thirdSubCat: string | null;
  countInStock: number;
  rating: string | number;
  isFeatured: 0 | 1;
  discount: number;
  productRam: string | string[] | null;
  size: string | string[] | null;
  productWeight: string | string[] | null;
  variantName: string | null;
  variantSku: string | null;
  variantPrice: string | number | null;
  variantStock: number | null;
  variantAttributes: string | Record<string, string> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface MappedCartProduct {
  id: Id;
  _id: Id;
  name: string;
  slug: string | null;
  sku: string | null;
  description: string | null;
  images: string[];
  brand: string | null;
  price: number;
  oldprice: number;
  catName: string | null;
  catId: Id | null;
  subCatId: Id | null;
  subCat: string | null;
  thirdSubCatId: Id | null;
  thirdSubCat: string | null;
  countInStock: number;
  rating: number;
  isFeatured: boolean;
  discount: number;
  productRam: string[];
  size: string[];
  productWeight: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MappedCartVariant {
  id: Id;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface MappedCartItem {
  id: Id;
  _id: Id;
  productId: MappedCartProduct | null;
  /** Selected variant (null when the line is the base product). */
  variant: MappedCartVariant | null;
  /** Effective unit price — variant.price when present, else product.price. */
  unitPrice: number;
  /** Effective stock — variant.stock when present, else product.countInStock. */
  unitStock: number;
  quantity: number;
  userId: Id;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function mapProduct(row: CartJoinedRow | undefined): MappedCartProduct | null {
  if (!row || row.id == null) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    images: safeParseJson<string[]>(row.images, []),
    brand: row.brand,
    price: Number(row.price || 0),
    oldprice: Number(row.oldprice || 0),
    catName: row.catName,
    catId: row.catId,
    subCatId: row.subCatId,
    subCat: row.subCat,
    thirdSubCatId: row.thirdSubCatId,
    thirdSubCat: row.thirdSubCat,
    countInStock: Number(row.countInStock || 0),
    rating: Number(row.rating || 0),
    isFeatured: Boolean(row.isFeatured),
    discount: Number(row.discount || 0),
    productRam: safeParseArrayLike(row.productRam),
    size: safeParseJson<string[]>(row.size, []),
    productWeight: safeParseJson<string[]>(row.productWeight, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapVariant(row: CartJoinedRow): MappedCartVariant | null {
  if (row.cartVariantId == null) return null;
  return {
    id: row.cartVariantId,
    name: row.variantName || "",
    sku: row.variantSku,
    price: Number(row.variantPrice || 0),
    stock: Number(row.variantStock || 0),
    attributes: safeParseJson<Record<string, string>>(row.variantAttributes, {}),
  };
}

function mapCartItem(row: CartJoinedRow): MappedCartItem {
  const product = mapProduct(row);
  const variant = mapVariant(row);
  // When a variant is attached, the customer-facing unit price/stock should
  // come from the variant — that's the whole point of first-class variants.
  const unitPrice = variant ? variant.price : product?.price ?? 0;
  const unitStock = variant ? variant.stock : product?.countInStock ?? 0;
  return {
    id: row.cartId,
    _id: row.cartId,
    productId: product,
    variant,
    unitPrice,
    unitStock,
    quantity: Number(row.quantity || 1),
    userId: row.userId,
    createdAt: row.cartCreatedAt,
    updatedAt: row.cartUpdatedAt,
  };
}

export async function listCartItemsByUserId(userId: Id): Promise<MappedCartItem[]> {
  await ensureCartVariantSchema();
  const rows = await query<CartJoinedRow>(
    `SELECT
       cp.id        AS cartId,
       cp.quantity,
       cp.userId,
       cp.variantId AS cartVariantId,
       cp.createdAt AS cartCreatedAt,
       cp.updatedAt AS cartUpdatedAt,
       ${PRODUCT_SELECT},
       v.name       AS variantName,
       v.sku        AS variantSku,
       v.price      AS variantPrice,
       v.stock      AS variantStock,
       v.attributes AS variantAttributes
     FROM CartProducts cp
     LEFT JOIN Products p         ON p.id = cp.productId
     LEFT JOIN ProductVariants v  ON v.id = cp.variantId
     WHERE cp.userId = :userId
     ORDER BY cp.createdAt DESC`,
    { userId }
  );

  return rows.map(mapCartItem);
}

export interface CartLine {
  id: Id;
  productId: Id;
  variantId: Id | null;
  quantity: number;
}

interface CartLineRow extends RowDataPacket {
  id: Id;
  productId: Id;
  variantId: Id | null;
  quantity: number;
}

export async function listCartLinesByUserId(
  userId: Id,
  conn: PoolConnection | null = null
): Promise<CartLine[]> {
  await ensureCartVariantSchema();
  const rows = await runQuery<CartLineRow>(
    conn,
    `SELECT id, productId, variantId, quantity
     FROM CartProducts
     WHERE userId = :userId
     ORDER BY createdAt DESC`,
    { userId }
  );

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    variantId: row.variantId ?? null,
    quantity: Number(row.quantity || 1),
  }));
}

export interface CartRowMapped {
  id: Id;
  _id: Id;
  productId: Id;
  variantId: Id | null;
  quantity: number;
  userId: Id;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CartRowDb extends RowDataPacket {
  id: Id;
  productId: Id;
  variantId: Id | null;
  quantity: number;
  userId: Id;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Look up an existing cart line for `(userId, productId, variantId)`. The
 * variantId match is exact (including null vs null) so the same product with
 * different variants are treated as distinct cart lines.
 */
export async function findCartItemByUserAndProduct(
  userId: Id,
  productId: Id,
  variantId: Id | null = null,
  conn: PoolConnection | null = null
): Promise<CartRowMapped | null> {
  await ensureCartVariantSchema();
  const variantClause =
    variantId == null ? "AND variantId IS NULL" : "AND variantId = :variantId";
  const params: SqlParams = { userId, productId };
  if (variantId != null) params.variantId = variantId;

  const rows = await runQuery<CartRowDb>(
    conn,
    `SELECT id, productId, variantId, quantity, userId, createdAt, updatedAt
     FROM CartProducts
     WHERE userId = :userId AND productId = :productId ${variantClause}
     LIMIT 1`,
    params
  );

  const row = rows[0];
  return row
    ? { ...row, _id: row.id, quantity: Number(row.quantity || 1), variantId: row.variantId ?? null }
    : null;
}

export async function createCartItem(
  userId: Id,
  productId: Id,
  quantity: number = 1,
  variantId: Id | null = null,
  conn: PoolConnection | null = null
): Promise<{ id: Id; _id: Id; productId: Id; variantId: Id | null; quantity: number; userId: Id }> {
  const result = await runExecute(
    conn,
    `INSERT INTO CartProducts (
      productId,
      variantId,
      quantity,
      userId,
      createdAt,
      updatedAt
    ) VALUES (
      :productId,
      :variantId,
      :quantity,
      :userId,
      NOW(),
      NOW()
    )`,
    { userId, productId, variantId, quantity }
  );

  return { id: result.insertId, _id: result.insertId, productId, variantId, quantity, userId };
}

export async function updateCartItemQuantity(
  id: Id,
  userId: Id,
  quantity: number,
  conn: PoolConnection | null = null
): Promise<boolean> {
  const result = await runExecute(
    conn,
    `UPDATE CartProducts
     SET quantity = :quantity, updatedAt = NOW()
     WHERE id = :id AND userId = :userId`,
    { id, userId, quantity }
  );

  return result.affectedRows > 0;
}

export async function deleteCartItem(
  id: Id,
  userId: Id,
  conn: PoolConnection | null = null
): Promise<boolean> {
  const result = await runExecute(
    conn,
    `DELETE FROM CartProducts
     WHERE id = :id AND userId = :userId`,
    { id, userId }
  );

  return result.affectedRows > 0;
}

export async function clearCartItems(
  userId: Id,
  conn: PoolConnection | null = null
): Promise<void> {
  await runExecute(
    conn,
    `DELETE FROM CartProducts
     WHERE userId = :userId`,
    { userId }
  );
}

export async function deleteCartItemsByIds(
  userId: Id,
  ids: Id[],
  conn: PoolConnection | null = null
): Promise<void> {
  if (!ids.length) return;
  await runExecute(
    conn,
    `DELETE FROM CartProducts
     WHERE userId = :userId AND id IN (${ids.map((id) => Number(id)).join(",")})`,
    { userId }
  );
}

async function runQuery<T extends RowDataPacket>(
  conn: PoolConnection | null,
  sql: string,
  params: SqlParams = {}
): Promise<T[]> {
  if (conn) {
    const [rows] = await conn.query<T[]>(sql, params as unknown as never);
    return rows as T[];
  }
  return query<T>(sql, params);
}

async function runExecute(
  conn: PoolConnection | null,
  sql: string,
  params: SqlParams = {}
): Promise<ResultSetHeader> {
  if (conn) {
    const [result] = await conn.execute<ResultSetHeader>(sql, params as unknown as never);
    return result;
  }
  return execute(sql, params);
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
