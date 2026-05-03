import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Id, WishlistItem, WishlistItemRow } from "../types.js";

// Auto-heal: older databases were created before back-in-stock notifications
// added `backInStockNotifiedAt`. Idempotent ALTER, ran once per process.
let stockSchemaEnsured = false;
async function ensureWishlistStockSchema(): Promise<void> {
  if (stockSchemaEnsured) return;
  try {
    await execute(
      `ALTER TABLE MyLists
         ADD COLUMN IF NOT EXISTS backInStockNotifiedAt DATETIME NULL`,
      {}
    );
    stockSchemaEnsured = true;
  } catch (err) {
    console.error(
      "[wishlist:ensureStockSchema] failed to auto-add column:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

type WishlistDbRow = WishlistItemRow & RowDataPacket;

function mapWishlistItem(row: WishlistDbRow | undefined): WishlistItem | null {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    rating: Number(row.rating || 0),
    price: Number(row.price || 0),
    oldPrice: Number(row.oldPrice || 0),
    discount: Number(row.discount || 0),
  };
}

const WISHLIST_SELECT = `
  id,
  productId,
  userId,
  productTitle,
  image,
  rating,
  price,
  oldPrice,
  discount,
  brand,
  createdAt,
  updatedAt
`;

export async function listWishlistItemsByUserId(userId: Id): Promise<WishlistItem[]> {
  const rows = await query<WishlistDbRow>(
    `SELECT ${WISHLIST_SELECT}
     FROM MyLists
     WHERE userId = :userId
     ORDER BY createdAt DESC`,
    { userId }
  );

  return rows.map((r) => mapWishlistItem(r) as WishlistItem);
}

export async function findWishlistItemByUserAndProduct(
  userId: Id,
  productId: Id
): Promise<WishlistItem | null> {
  const rows = await query<WishlistDbRow>(
    `SELECT ${WISHLIST_SELECT}
     FROM MyLists
     WHERE userId = :userId AND productId = :productId
     LIMIT 1`,
    { userId, productId }
  );

  return mapWishlistItem(rows[0]);
}

export interface CreateWishlistPayload {
  productId: Id;
  userId: Id;
  productTitle?: string | null;
  image?: string | null;
  rating?: number | null;
  price?: number | null;
  oldPrice?: number | null;
  discount?: number | null;
  brand?: string | null;
}

export async function createWishlistItem(
  payload: CreateWishlistPayload
): Promise<{ id: Id; _id: Id } & CreateWishlistPayload> {
  const result = await execute(
    `INSERT INTO MyLists (
      productId,
      userId,
      productTitle,
      image,
      rating,
      price,
      oldPrice,
      discount,
      brand,
      createdAt,
      updatedAt
    ) VALUES (
      :productId,
      :userId,
      :productTitle,
      :image,
      :rating,
      :price,
      :oldPrice,
      :discount,
      :brand,
      NOW(),
      NOW()
    )`,
    payload as unknown as Record<string, unknown>
  );

  return { id: result.insertId, _id: result.insertId, ...payload };
}

export async function deleteWishlistItem(id: Id, userId: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM MyLists
     WHERE id = :id AND userId = :userId`,
    { id, userId }
  );

  return result.affectedRows > 0;
}

export interface BackInStockCandidate extends RowDataPacket {
  wishlistId: Id;
  userId: Id;
  productId: Id;
  productTitle: string | null;
  image: string | null;
  countInStock: number;
  productSlug: string | null;
  price: string | number | null;
  userEmail: string | null;
  userName: string | null;
}

// Find wishlist items where the product is now in stock and the user hasn't
// been notified yet. The 1-day createdAt guard prevents notifying for items
// the user just added while the product was already in stock — a coarse but
// safe heuristic until we record stock-state-at-add-time.
export async function findWishlistItemsBackInStock(
  { limit = 100 }: { limit?: number } = {}
): Promise<BackInStockCandidate[]> {
  await ensureWishlistStockSchema();
  const rows = await query<BackInStockCandidate>(
    `SELECT
       m.id          AS wishlistId,
       m.userId,
       m.productId,
       m.productTitle,
       m.image,
       p.countInStock,
       p.slug        AS productSlug,
       p.price,
       u.email       AS userEmail,
       u.name        AS userName
     FROM MyLists m
     JOIN Products p ON p.id = m.productId
     JOIN Users u    ON u.id = m.userId
     WHERE m.backInStockNotifiedAt IS NULL
       AND p.countInStock > 0
       AND p.status = 'active'
       AND m.createdAt < NOW() - INTERVAL 1 DAY
       AND u.email IS NOT NULL AND u.email <> ''
     ORDER BY m.createdAt ASC
     LIMIT :limit`,
    { limit: Number(limit) || 100 }
  );
  return rows;
}

export async function markWishlistBackInStockNotified(wishlistId: Id): Promise<void> {
  await execute(
    `UPDATE MyLists SET backInStockNotifiedAt = NOW() WHERE id = :id`,
    { id: wishlistId }
  );
}
