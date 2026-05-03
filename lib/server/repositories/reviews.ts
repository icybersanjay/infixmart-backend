import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Id, Review, ReviewRow } from "../types.js";

interface ReviewJoinRow extends ReviewRow, RowDataPacket {
  userName?: string | null;
  userAvatar?: string | null;
}

export interface MappedReview extends Omit<Review, "createdAt" | "updatedAt"> {
  createdAt: ReviewRow["createdAt"];
  updatedAt: ReviewRow["updatedAt"];
  user?: { name: string; avatar: string };
}

function mapReview(row: ReviewJoinRow | undefined): MappedReview | null {
  if (!row) {
    return null;
  }

  let images: string[] = [];
  try {
    images = JSON.parse((row.images as string) || "[]");
  } catch {
    images = [];
  }

  return {
    id: row.id,
    rating: Number(row.rating),
    title: row.title,
    comment: row.comment,
    verified: Boolean(row.verified),
    images: Array.isArray(images) ? images : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userId: row.userId,
    productId: row.productId,
    user:
      row.userName || row.userAvatar
        ? { name: row.userName || "User", avatar: row.userAvatar || "" }
        : undefined,
  };
}

export interface ListProductReviewsResult {
  reviews: Array<MappedReview | null>;
  total: number;
  page: number;
  perPage: number;
}

export async function listProductReviews(
  productId: Id,
  { page = 1, perPage = 10 }: { page?: number; perPage?: number } = {}
): Promise<ListProductReviewsResult> {
  const offset = (page - 1) * perPage;
  const [countRows, reviewRows] = await Promise.all([
    query<{ total: number } & RowDataPacket>(
      `SELECT COUNT(*) AS total
       FROM Reviews
       WHERE productId = :productId`,
      { productId }
    ),
    query<ReviewJoinRow>(
      `SELECT
         r.id,
         r.userId,
         r.productId,
         r.rating,
         r.title,
         r.comment,
         r.verified,
         r.images,
         r.createdAt,
         r.updatedAt,
         u.name AS userName,
         u.avatar AS userAvatar
       FROM Reviews r
       LEFT JOIN Users u ON u.id = r.userId
       WHERE r.productId = :productId
       ORDER BY r.createdAt DESC
       LIMIT :limit OFFSET :offset`,
      { productId, limit: perPage, offset }
    ),
  ]);

  return {
    reviews: reviewRows.map(mapReview),
    total: Number(countRows[0]?.total || 0),
    page,
    perPage,
  };
}

export interface ProductReviewStatEntry {
  rating: number;
  count: number;
}

export async function getProductReviewStats(
  productId: Id
): Promise<ProductReviewStatEntry[]> {
  const rows = await query<{ rating: number | string; count: number | string } & RowDataPacket>(
    `SELECT rating, COUNT(*) AS count
     FROM Reviews
     WHERE productId = :productId
     GROUP BY rating`,
    { productId }
  );

  return rows.map((row) => ({
    rating: Number(row.rating),
    count: Number(row.count),
  }));
}

export async function findReviewById(id: Id): Promise<MappedReview | null> {
  const rows = await query<ReviewJoinRow>(
    `SELECT
       r.id,
       r.userId,
       r.productId,
       r.rating,
       r.title,
       r.comment,
       r.verified,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.avatar AS userAvatar
     FROM Reviews r
     LEFT JOIN Users u ON u.id = r.userId
     WHERE r.id = :id
     LIMIT 1`,
    { id }
  );

  return mapReview(rows[0]);
}

export async function findUserReview(
  userId: Id,
  productId: Id
): Promise<MappedReview | null> {
  const rows = await query<ReviewJoinRow>(
    `SELECT
       r.id,
       r.userId,
       r.productId,
       r.rating,
       r.title,
       r.comment,
       r.verified,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.avatar AS userAvatar
     FROM Reviews r
     LEFT JOIN Users u ON u.id = r.userId
     WHERE r.userId = :userId AND r.productId = :productId
     LIMIT 1`,
    { userId, productId }
  );

  return mapReview(rows[0]);
}

export async function listReviewsByUserId(
  userId: Id
): Promise<Array<MappedReview | null>> {
  const rows = await query<ReviewJoinRow>(
    `SELECT
       r.id,
       r.userId,
       r.productId,
       r.rating,
       r.title,
       r.comment,
       r.verified,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.avatar AS userAvatar
     FROM Reviews r
     LEFT JOIN Users u ON u.id = r.userId
     WHERE r.userId = :userId
     ORDER BY r.createdAt DESC`,
    { userId }
  );

  return rows.map(mapReview);
}

export interface CreateReviewPayload {
  userId: Id;
  productId: Id;
  rating: number;
  title?: string | null;
  comment?: string | null;
  verified?: boolean;
  images?: string[];
}

export async function createReview(
  payload: CreateReviewPayload
): Promise<MappedReview | null> {
  const result = await execute(
    `INSERT INTO Reviews (
      userId,
      productId,
      rating,
      title,
      comment,
      verified,
      images,
      createdAt,
      updatedAt
    ) VALUES (
      :userId,
      :productId,
      :rating,
      :title,
      :comment,
      :verified,
      :images,
      NOW(),
      NOW()
    )`,
    {
      ...payload,
      verified: payload.verified ? 1 : 0,
      images: payload.images ? JSON.stringify(payload.images) : JSON.stringify([]),
    }
  );

  return findReviewById(result.insertId);
}

export type UpdateReviewPayload = Partial<CreateReviewPayload>;

export async function updateReview(
  id: Id,
  payload: UpdateReviewPayload
): Promise<MappedReview | null> {
  const serialized: Record<string, unknown> = {
    ...payload,
    verified:
      payload.verified === undefined ? undefined : payload.verified ? 1 : 0,
  };
  const entries = Object.entries(serialized).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return findReviewById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE Reviews
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findReviewById(id);
}

export async function deleteReview(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM Reviews
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

export async function userHasPurchasedProduct(
  userId: Id,
  productId: Id
): Promise<boolean> {
  const rows = await query<{ id: Id } & RowDataPacket>(
    `SELECT o.id
     FROM Orders o
     INNER JOIN OrderItems oi ON oi.orderId = o.id
     WHERE o.userId = :userId
       AND o.status IN ('delivered', 'shipped')
       AND oi.productId = :productId
     LIMIT 1`,
    { userId, productId }
  );

  return Boolean(rows[0]);
}

export async function updateProductRating(productId: Id): Promise<void> {
  const rows = await query<{ avgRating: number | string | null } & RowDataPacket>(
    `SELECT AVG(rating) AS avgRating
     FROM Reviews
     WHERE productId = :productId`,
    { productId }
  );

  const rating = rows[0]?.avgRating ? Number(Number(rows[0].avgRating).toFixed(1)) : 0;
  await execute(
    `UPDATE Products
     SET rating = :rating, updatedAt = NOW()
     WHERE id = :productId`,
    { rating, productId }
  );
}
