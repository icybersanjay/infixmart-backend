import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type { Id, ProductVariant, ProductVariantRow } from "../types.js";

// Auto-heal: stand up the variants table on first read so the app keeps
// working without a manual `db/migrate.sql` step. Idempotent CREATE TABLE.
let schemaEnsured = false;
async function ensureProductVariantsSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    await execute(
      `CREATE TABLE IF NOT EXISTS ProductVariants (
        id         INT            NOT NULL AUTO_INCREMENT,
        productId  INT            NOT NULL,
        sku        VARCHAR(100)       NULL,
        name       VARCHAR(255)   NOT NULL,
        attributes JSON               NULL,
        price      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
        stock      INT            NOT NULL DEFAULT 0,
        isActive   TINYINT(1)     NOT NULL DEFAULT 1,
        position   INT            NOT NULL DEFAULT 0,
        createdAt  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_variants_productId (productId),
        KEY idx_variants_active    (isActive),
        UNIQUE KEY uq_variants_sku (sku)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      {}
    );
    schemaEnsured = true;
  } catch (err) {
    console.error(
      "[product-variants:ensureSchema] failed to create table:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

const VARIANT_SELECT = `
  id,
  productId,
  sku,
  name,
  attributes,
  price,
  stock,
  isActive,
  position,
  createdAt,
  updatedAt
`;

type VariantDbRow = ProductVariantRow & RowDataPacket;

function mapVariant(row: VariantDbRow | undefined): ProductVariant | null {
  if (!row) return null;
  return {
    ...row,
    attributes: safeParseJson<Record<string, string>>(row.attributes, {}),
    price: Number(row.price || 0),
    stock: Number(row.stock || 0),
    isActive: Boolean(row.isActive),
    position: Number(row.position || 0),
  };
}

export async function listVariantsByProductId(productId: Id): Promise<ProductVariant[]> {
  await ensureProductVariantsSchema();
  const rows = await query<VariantDbRow>(
    `SELECT ${VARIANT_SELECT}
       FROM ProductVariants
      WHERE productId = :productId
      ORDER BY position ASC, id ASC`,
    { productId }
  );
  return rows.map((r) => mapVariant(r) as ProductVariant);
}

export async function findVariantById(
  id: Id,
  conn: PoolConnection | null = null
): Promise<ProductVariant | null> {
  await ensureProductVariantsSchema();
  const rows = await runQuery<VariantDbRow>(
    conn,
    `SELECT ${VARIANT_SELECT}
       FROM ProductVariants
      WHERE id = :id
      LIMIT 1`,
    { id }
  );
  return mapVariant(rows[0]);
}

export async function findVariantBySku(
  sku: string | null | undefined
): Promise<ProductVariant | null> {
  if (!sku) return null;
  await ensureProductVariantsSchema();
  const rows = await query<VariantDbRow>(
    `SELECT ${VARIANT_SELECT}
       FROM ProductVariants
      WHERE sku = :sku
      LIMIT 1`,
    { sku }
  );
  return mapVariant(rows[0]);
}

export interface CreateVariantPayload {
  productId: Id;
  sku?: string | null;
  name: string;
  attributes?: Record<string, string>;
  price?: number;
  stock?: number;
  isActive?: boolean;
  position?: number;
}

export async function createVariant(
  payload: CreateVariantPayload,
  conn: PoolConnection | null = null
): Promise<ProductVariant | null> {
  await ensureProductVariantsSchema();
  const result = await runExecute(
    conn,
    `INSERT INTO ProductVariants (
      productId,
      sku,
      name,
      attributes,
      price,
      stock,
      isActive,
      position
    ) VALUES (
      :productId,
      :sku,
      :name,
      :attributes,
      :price,
      :stock,
      :isActive,
      :position
    )`,
    {
      productId: payload.productId,
      sku: payload.sku ?? null,
      name: payload.name,
      attributes: JSON.stringify(payload.attributes || {}),
      price: payload.price ?? 0,
      stock: payload.stock ?? 0,
      isActive: payload.isActive === false ? 0 : 1,
      position: payload.position ?? 0,
    }
  );

  return findVariantById(result.insertId, conn);
}

export interface UpdateVariantPayload {
  sku?: string | null;
  name?: string;
  attributes?: Record<string, string>;
  price?: number;
  stock?: number;
  isActive?: boolean;
  position?: number;
}

export async function updateVariant(
  id: Id,
  payload: UpdateVariantPayload,
  conn: PoolConnection | null = null
): Promise<ProductVariant | null> {
  await ensureProductVariantsSchema();
  const serialized: Record<string, unknown> = {};
  if (payload.sku !== undefined) serialized.sku = payload.sku;
  if (payload.name !== undefined) serialized.name = payload.name;
  if (payload.attributes !== undefined)
    serialized.attributes = JSON.stringify(payload.attributes || {});
  if (payload.price !== undefined) serialized.price = payload.price;
  if (payload.stock !== undefined) serialized.stock = payload.stock;
  if (payload.isActive !== undefined) serialized.isActive = payload.isActive ? 1 : 0;
  if (payload.position !== undefined) serialized.position = payload.position;

  const entries = Object.entries(serialized);
  if (entries.length === 0) {
    return findVariantById(id, conn);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await runExecute(
    conn,
    `UPDATE ProductVariants
       SET ${setClause}
     WHERE id = :id`,
    { ...Object.fromEntries(entries), id }
  );

  return findVariantById(id, conn);
}

export async function deleteVariantById(
  id: Id,
  conn: PoolConnection | null = null
): Promise<boolean> {
  await ensureProductVariantsSchema();
  const result = await runExecute(
    conn,
    `DELETE FROM ProductVariants WHERE id = :id`,
    { id }
  );
  return result.affectedRows > 0;
}

export async function deleteVariantsByProductId(
  productId: Id,
  conn: PoolConnection | null = null
): Promise<number> {
  await ensureProductVariantsSchema();
  const result = await runExecute(
    conn,
    `DELETE FROM ProductVariants WHERE productId = :productId`,
    { productId }
  );
  return result.affectedRows || 0;
}

/**
 * Atomic stock decrement. Returns true only if the variant had enough stock
 * AND was active. Mirrors `decrementProductStock` in services/orders.ts so
 * checkout can fail loudly when a variant is oversold.
 */
export async function decrementVariantStock(
  variantId: Id,
  qty: number,
  conn: PoolConnection
): Promise<boolean> {
  const result = await runExecute(
    conn,
    `UPDATE ProductVariants
        SET stock = stock - :qty
      WHERE id = :variantId
        AND isActive = 1
        AND stock >= :qty`,
    { variantId, qty }
  );
  return result.affectedRows > 0;
}

/**
 * Bulk-insert variants from a backfill or admin form. Uses INSERT IGNORE so
 * duplicate (productId, name) combinations from re-runs don't throw — the
 * caller decides whether to update afterwards.
 */
export async function bulkCreateVariants(
  rows: CreateVariantPayload[],
  conn: PoolConnection | null = null
): Promise<number> {
  if (!rows.length) return 0;
  await ensureProductVariantsSchema();
  // INSERT one at a time so the caller can opt into a transaction; mysql2's
  // multi-row INSERT placeholder syntax doesn't compose with named params.
  let inserted = 0;
  for (const row of rows) {
    try {
      await runExecute(
        conn,
        `INSERT INTO ProductVariants (
          productId, sku, name, attributes, price, stock, isActive, position
        ) VALUES (
          :productId, :sku, :name, :attributes, :price, :stock, :isActive, :position
        )`,
        {
          productId: row.productId,
          sku: row.sku ?? null,
          name: row.name,
          attributes: JSON.stringify(row.attributes || {}),
          price: row.price ?? 0,
          stock: row.stock ?? 0,
          isActive: row.isActive === false ? 0 : 1,
          position: row.position ?? 0,
        }
      );
      inserted += 1;
    } catch (err) {
      // ER_DUP_ENTRY (1062) on the SKU unique index — skip silently for re-runs.
      const isDuplicate =
        err instanceof Error && /duplicate|ER_DUP_ENTRY/i.test(err.message);
      if (!isDuplicate) throw err;
    }
  }
  return inserted;
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
