// JS re-export shim — see reviews.ts for the real implementation.
export {
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
} from "./reviews.ts";
