import { execute, query } from "../db/mysql.js";

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  sku,
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
  createdAt,
  updatedAt
`;

function mapProduct(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    images: safeParseJson(row.images, []),
    productRam: safeParseArrayLike(row.productRam),
    size: safeParseJson(row.size, []),
    productWeight: safeParseJson(row.productWeight, []),
    isFeatured: Boolean(row.isFeatured),
  };
}

async function listProducts({
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
}) {
  const offset = (page - 1) * perPage;
  const filters = [];
  const params = { limit: perPage, offset };

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
    filters.push("name LIKE :search");
    params.search = `%${search}%`;
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
    query(
      `SELECT COUNT(*) AS total
       FROM Products
       ${whereClause}`,
      params
    ),
    query(
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
    products: productRows.map(mapProduct),
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    page,
  };
}

async function listProductsByCategoryId(categoryId, { page = 1, perPage = 10000 } = {}) {
  return listProducts({ page, perPage, category: categoryId });
}

async function listFeaturedProducts() {
  const rows = await query(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE isFeatured = 1`
  );

  return rows.map(mapProduct);
}

async function findProductById(id) {
  const rows = await query(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapProduct(rows[0]);
}

async function findProductBySlug(slug) {
  const rows = await query(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE slug = :slug
     LIMIT 1`,
    { slug }
  );

  return mapProduct(rows[0]);
}

async function countProducts() {
  const rows = await query(`SELECT COUNT(*) AS productCount FROM Products`);
  return Number(rows[0]?.productCount || 0);
}

async function createProduct(payload) {
  const result = await execute(
    `INSERT INTO Products (
      name,
      slug,
      sku,
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
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :slug,
      :sku,
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
      NOW(),
      NOW()
    )`,
    serializeProductPayload(payload)
  );

  return findProductById(result.insertId);
}

async function updateProduct(id, payload) {
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

async function deleteProductById(id) {
  const result = await execute(
    `DELETE FROM Products
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

async function listProductsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const normalizedIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!normalizedIds.length) {
    return [];
  }

  const rows = await query(
    `SELECT ${PRODUCT_SELECT}
     FROM Products
     WHERE id IN (${normalizedIds.join(",")})`
  );

  return rows.map(mapProduct);
}

async function deleteProductsByIds(ids) {
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

async function slugExists(slug, excludeId = null) {
  const rows = await query(
    `SELECT id
     FROM Products
     WHERE slug = :slug
       ${excludeId ? "AND id != :excludeId" : ""}
     LIMIT 1`,
    excludeId ? { slug, excludeId } : { slug }
  );

  return Boolean(rows[0]);
}

function serializeProductPayload(payload, { partial = false } = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const valueFor = (key, value) => (partial && !has(key) ? undefined : value);

  return {
    name: valueFor("name", payload.name),
    slug: valueFor("slug", payload.slug),
    sku: valueFor("sku", payload.sku),
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
  };
}

function getProductOrderBy(sort) {
  if (sort === "price-asc") return "price ASC";
  if (sort === "price-desc") return "price DESC";
  if (sort === "rating-desc") return "rating DESC";
  if (sort === "name-asc") return "name ASC";
  if (sort === "popular") return "rating DESC";
  if (sort === "bestseller") return "discount DESC, rating DESC";
  return "createdAt DESC";
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function safeParseArrayLike(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}

export {
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
};
