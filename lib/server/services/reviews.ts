import { HttpError } from "../api/http.js";
import { findProductById } from "../repositories/products.js";
import { findUserById } from "../repositories/users.js";
import {
  createReview,
  deleteReview,
  findReviewById,
  findUserReview,
  getProductReviewStats,
  listProductReviews,
  listReviewsByUserId,
  updateProductRating,
  updateReview,
  userHasPurchasedProduct,
} from "../repositories/reviews.js";
import type { Id } from "../types.js";

type RatingMap = Record<1 | 2 | 3 | 4 | 5, number>;

function toRatingMap(rows: Array<{ rating: number; count: number }>): RatingMap {
  const ratingMap: RatingMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    const k = row.rating as 1 | 2 | 3 | 4 | 5;
    if (k >= 1 && k <= 5) ratingMap[k] = row.count;
  }
  return ratingMap;
}

function normalizeRating(value: unknown): number {
  return Number.parseInt(String(value), 10);
}

function cleanText(value: unknown, maxLength: number | null = null): string {
  const text = String(value || "").trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

interface ReviewBody {
  productId?: Id | string;
  rating?: number | string;
  title?: string;
  comment?: string;
  images?: string[];
}

export async function getProductReviews(
  productId: Id,
  params: { page?: number; perPage?: number } = {}
) {
  const [{ reviews, total, page, perPage }, stats] = await Promise.all([
    listProductReviews(productId, params),
    getProductReviewStats(productId),
  ]);

  const ratingMap = toRatingMap(stats);
  const totalRatings = Object.values(ratingMap).reduce((sum, value) => sum + value, 0);
  const avgRating = totalRatings
    ? Number(
        (
          Object.entries(ratingMap).reduce(
            (sum, [rating, count]) => sum + Number(rating) * count,
            0
          ) / totalRatings
        ).toFixed(1)
      )
    : 0;

  return {
    success: true as const,
    error: false as const,
    data: {
      reviews,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      currentPage: page,
      totalReviews: total,
    },
    summary: { avgRating, totalRatings, ratingMap },
  };
}

export async function createReviewRecord(userId: Id, body: ReviewBody) {
  const productId = Number(body.productId);
  const rating = normalizeRating(body.rating);

  if (!productId || !rating) {
    throw new HttpError(400, "productId and rating are required");
  }

  if (rating < 1 || rating > 5) {
    throw new HttpError(400, "Rating must be between 1 and 5");
  }

  const product = await findProductById(productId);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  const existing = await findUserReview(userId, productId);
  if (existing) {
    throw new HttpError(400, "You have already reviewed this product");
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === "string" && u.startsWith("http")).slice(0, 3)
    : [];

  const review = await createReview({
    userId,
    productId,
    rating,
    title: cleanText(body.title, 120),
    comment: cleanText(body.comment),
    verified: await userHasPurchasedProduct(userId, productId),
    images,
  });

  await updateProductRating(productId);

  return {
    success: true as const,
    error: false as const,
    message: "Review submitted successfully",
    data: review,
  };
}

export async function updateReviewRecord(userId: Id, id: Id, body: ReviewBody) {
  const existing = await findReviewById(id);
  if (!existing || existing.userId !== Number(userId)) {
    throw new HttpError(404, "Review not found");
  }

  let nextRating: number | undefined;
  if (body.rating !== undefined) {
    nextRating = normalizeRating(body.rating);
    if (nextRating < 1 || nextRating > 5) {
      throw new HttpError(400, "Rating must be between 1 and 5");
    }
  }

  const review = await updateReview(id, {
    rating: nextRating,
    title: body.title !== undefined ? cleanText(body.title, 120) : undefined,
    comment: body.comment !== undefined ? cleanText(body.comment) : undefined,
  });

  await updateProductRating(existing.productId);

  return {
    success: true as const,
    error: false as const,
    message: "Review updated",
    data: review,
  };
}

export async function deleteReviewRecord(userId: Id, id: Id) {
  const review = await findReviewById(id);
  if (!review) {
    throw new HttpError(404, "Review not found");
  }

  if (review.userId !== Number(userId)) {
    const user = await findUserById(userId);
    if (!user || user.role !== "admin") {
      throw new HttpError(403, "Access denied");
    }
  }

  await deleteReview(id);
  await updateProductRating(review.productId);

  return {
    success: true as const,
    error: false as const,
    message: "Review deleted",
  };
}

export async function getMyReviews(userId: Id) {
  return {
    success: true as const,
    error: false as const,
    data: await listReviewsByUserId(userId),
  };
}

export async function checkMyReview(userId: Id, productId: Id) {
  return {
    success: true as const,
    error: false as const,
    review: await findUserReview(userId, productId),
  };
}
