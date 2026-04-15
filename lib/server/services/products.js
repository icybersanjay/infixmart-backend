import { HttpError } from "../api/http.js";
import { sanitizeRichText } from "../content/html.js";
import { deleteUploadByPublicPath } from "../files/uploads.js";
import {
  countProducts,
  createProduct,
  deleteProductById,
  deleteProductsByIds,
  findProductById,
  findProductBySlug,
  listFeaturedProducts,
  listProductsByIds,
  listProducts,
  listProductsByCategoryId,
  slugExists,
  updateProduct,
} from "../repositories/products.js";

const toSlug = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function uniqueProductSlug(name, excludeId = null) {
  const base = toSlug(name || "product");
  let slug = base || "product";
  let counter = 1;

  while (await slugExists(slug, excludeId)) {
    slug = `${base || "product"}-${counter++}`;
  }

  return slug;
}

async function getAllProducts(params) {
  const result = await listProducts(params);
  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductByCategoryId(id, params) {
  const result = await listProductsByCategoryId(id, params);
  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductByCategoryName(categoryName, params = {}) {
  const result = await listProducts({
    page: Number(params.page || 1),
    perPage: Number(params.perPage || 10000),
    categoryName: categoryName || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductBySubCategoryId(id, params = {}) {
  const result = await listProducts({
    page: Number(params.page || 1),
    perPage: Number(params.perPage || 10000),
    subCategory: id || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductBySubCategoryName(subCategoryName) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    subCategoryName: subCategoryName || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductByThirdSubCategoryId(id) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    thirdCategory: id || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductByThirdSubCategoryName(thirdCategoryName) {
  const result = await listProducts({
    page: 1,
    perPage: 10000,
    thirdCategoryName: thirdCategoryName || "",
  });

  return {
    ...result,
    message: "Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductByPriceRange(params = {}) {
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
    success: true,
    error: false,
  };
}

async function getProductByExactRating(params = {}) {
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
    success: true,
    error: false,
  };
}

async function getFeaturedProducts() {
  return {
    products: await listFeaturedProducts(),
    message: "Featured Products fetched successfully",
    success: true,
    error: false,
  };
}

async function getSingleProduct(id) {
  const product = await findProductById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  return {
    product,
    message: "Product fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductBySlugValue(slug) {
  const product = await findProductBySlug(slug);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  return {
    product,
    message: "Product fetched successfully",
    success: true,
    error: false,
  };
}

async function getProductCount() {
  return {
    productCount: await countProducts(),
    message: "Product count fetched successfully",
    success: true,
    error: false,
  };
}

async function createProductRecord(body) {
  const images = Array.isArray(body.images)
    ? body.images
    : JSON.parse(body.images || "[]");
  const productRam = Array.isArray(body.productRam)
    ? body.productRam
    : JSON.parse(body.productRam || "[]");

  const product = await createProduct({
    name: body.name,
    slug: body.slug
      ? await uniqueProductSlug(body.slug)
      : await uniqueProductSlug(body.name || "product"),
    sku: body.sku ? String(body.sku).trim().toUpperCase() : `SKU-${Date.now()}`,
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
    discount: body.discount ?? 0,
    productRam,
    size: Array.isArray(body.size) ? body.size : JSON.parse(body.size || "[]"),
    productWeight: Array.isArray(body.productWeight)
      ? body.productWeight
      : JSON.parse(body.productWeight || "[]"),
  });

  return {
    product,
    message: "Product created successfully",
    success: true,
    error: false,
  };
}

async function updateProductRecord(id, body) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new HttpError(404, "Product not found");
  }

  const images = Array.isArray(body.images)
    ? body.images
    : JSON.parse(body.images || "[]");
  const productRam = Array.isArray(body.productRam)
    ? body.productRam
    : JSON.parse(body.productRam || "[]");

  const product = await updateProduct(id, {
    name: body.name,
    slug: body.slug ? await uniqueProductSlug(body.slug, id) : existing.slug,
    sku: body.sku ? String(body.sku).trim().toUpperCase() : existing.sku,
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
    discount: body.discount ?? 0,
    productRam,
    size: Array.isArray(body.size) ? body.size : JSON.parse(body.size || "[]"),
    productWeight: Array.isArray(body.productWeight)
      ? body.productWeight
      : JSON.parse(body.productWeight || "[]"),
  });

  return {
    product,
    message: "Product updated successfully",
    success: true,
    error: false,
  };
}

async function updateProductQuickAction(id, body = {}) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new HttpError(404, "Product not found");
  }

  const action = String(body.action || "").trim().toLowerCase();
  let updates = {};
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

  return {
    product,
    message,
    success: true,
    error: false,
  };
}

async function deleteProductRecord(id) {
  const product = await findProductById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  for (const image of product.images || []) {
    await deleteUploadByPublicPath(image);
  }

  await deleteProductById(id);

  return {
    message: "Product deleted successfully",
    success: true,
    error: false,
  };
}

async function bulkDeleteProducts(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "No product IDs provided");
  }

  const products = await listProductsByIds(ids);
  for (const product of products) {
    for (const image of product.images || []) {
      await deleteUploadByPublicPath(image);
    }
  }

  await deleteProductsByIds(ids);

  return {
    message: "Products deleted successfully",
    success: true,
    error: false,
  };
}

export {
  bulkDeleteProducts,
  createProductRecord,
  deleteProductRecord,
  getAllProducts,
  getFeaturedProducts,
  getProductByCategoryId,
  getProductByCategoryName,
  getProductByExactRating,
  getProductBySlugValue,
  getProductByPriceRange,
  getProductCount,
  getSingleProduct,
  getProductBySubCategoryId,
  getProductBySubCategoryName,
  getProductByThirdSubCategoryId,
  getProductByThirdSubCategoryName,
  updateProductRecord,
  updateProductQuickAction,
};
