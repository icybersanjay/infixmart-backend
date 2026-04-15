import { execute, query } from "../db/mysql.js";

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

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    images: safeParseJson(row.images, []),
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
    size: safeParseJson(row.size, []),
    productWeight: safeParseJson(row.productWeight, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCartItem(row) {
  return {
    id: row.cartId,
    _id: row.cartId,
    productId: mapProduct(row),
    quantity: Number(row.quantity || 1),
    userId: row.userId,
    createdAt: row.cartCreatedAt,
    updatedAt: row.cartUpdatedAt,
  };
}

async function listCartItemsByUserId(userId) {
  const rows = await query(
    `SELECT
       cp.id AS cartId,
       cp.quantity,
       cp.userId,
       cp.createdAt AS cartCreatedAt,
       cp.updatedAt AS cartUpdatedAt,
       ${PRODUCT_SELECT}
     FROM CartProducts cp
     LEFT JOIN Products p ON p.id = cp.productId
     WHERE cp.userId = :userId
     ORDER BY cp.createdAt DESC`,
    { userId }
  );

  return rows.map(mapCartItem);
}

async function listCartLinesByUserId(userId, conn = null) {
  const rows = await runQuery(
    conn,
    `SELECT id, productId, quantity
     FROM CartProducts
     WHERE userId = :userId
     ORDER BY createdAt DESC`,
    { userId }
  );

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: Number(row.quantity || 1),
  }));
}

async function findCartItemByUserAndProduct(userId, productId, conn = null) {
  const rows = await runQuery(
    conn,
    `SELECT id, productId, quantity, userId, createdAt, updatedAt
     FROM CartProducts
     WHERE userId = :userId AND productId = :productId
     LIMIT 1`,
    { userId, productId }
  );

  return rows[0]
    ? { ...rows[0], _id: rows[0].id, quantity: Number(rows[0].quantity || 1) }
    : null;
}

async function createCartItem(userId, productId, quantity = 1, conn = null) {
  const result = await runExecute(
    conn,
    `INSERT INTO CartProducts (
      productId,
      quantity,
      userId,
      createdAt,
      updatedAt
    ) VALUES (
      :productId,
      :quantity,
      :userId,
      NOW(),
      NOW()
    )`,
    { userId, productId, quantity }
  );

  return { id: result.insertId, _id: result.insertId, productId, quantity, userId };
}

async function updateCartItemQuantity(id, userId, quantity, conn = null) {
  const result = await runExecute(
    conn,
    `UPDATE CartProducts
     SET quantity = :quantity, updatedAt = NOW()
     WHERE id = :id AND userId = :userId`,
    { id, userId, quantity }
  );

  return result.affectedRows > 0;
}

async function deleteCartItem(id, userId, conn = null) {
  const result = await runExecute(
    conn,
    `DELETE FROM CartProducts
     WHERE id = :id AND userId = :userId`,
    { id, userId }
  );

  return result.affectedRows > 0;
}

async function clearCartItems(userId, conn = null) {
  await runExecute(
    conn,
    `DELETE FROM CartProducts
     WHERE userId = :userId`,
    { userId }
  );
}

async function deleteCartItemsByIds(userId, ids, conn = null) {
  if (!ids.length) return;
  await runExecute(
    conn,
    `DELETE FROM CartProducts
     WHERE userId = :userId AND id IN (${ids.map((id) => Number(id)).join(",")})`,
    { userId }
  );
}

async function runQuery(conn, sql, params = {}) {
  if (conn) {
    const [rows] = await conn.query(sql, params);
    return rows;
  }
  return query(sql, params);
}

async function runExecute(conn, sql, params = {}) {
  if (conn) {
    const [result] = await conn.execute(sql, params);
    return result;
  }
  return execute(sql, params);
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
  clearCartItems,
  createCartItem,
  deleteCartItem,
  deleteCartItemsByIds,
  findCartItemByUserAndProduct,
  listCartItemsByUserId,
  listCartLinesByUserId,
  updateCartItemQuantity,
};
