// JS re-export shim — see product-variants.ts for the real implementation.
export {
  bulkCreateVariants,
  createVariant,
  decrementVariantStock,
  deleteVariantById,
  deleteVariantsByProductId,
  findVariantById,
  findVariantBySku,
  listVariantsByProductId,
  updateVariant,
} from "./product-variants.ts";
