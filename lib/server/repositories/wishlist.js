// JS re-export shim — see wishlist.ts for the real implementation.
export {
  createWishlistItem,
  deleteWishlistItem,
  findWishlistItemByUserAndProduct,
  findWishlistItemsBackInStock,
  listWishlistItemsByUserId,
  markWishlistBackInStockNotified,
} from "./wishlist.ts";
