import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Category, CategoryRow, Id } from "../types.js";

const CATEGORY_SELECT = `
  id,
  name,
  images,
  parentCatName,
  parentCatId,
  createdAt,
  updatedAt
`;

type CategoryDbRow = CategoryRow & RowDataPacket;

function mapCategory(row: CategoryDbRow | undefined): Category | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    images: safeParseJson<string[]>(row.images, []),
  };
}

export async function listCategories(): Promise<Array<Category | null>> {
  const rows = await query<CategoryDbRow>(
    `SELECT ${CATEGORY_SELECT}
     FROM Categories
     ORDER BY createdAt DESC`
  );

  return rows.map(mapCategory);
}

export async function findCategoryById(id: Id): Promise<Category | null> {
  const rows = await query<CategoryDbRow>(
    `SELECT ${CATEGORY_SELECT}
     FROM Categories
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapCategory(rows[0]);
}

export async function countRootCategories(): Promise<number> {
  const rows = await query<{ count: number } & RowDataPacket>(
    `SELECT COUNT(*) AS count
     FROM Categories
     WHERE parentCatId IS NULL`
  );

  return Number(rows[0]?.count || 0);
}

export async function countSubCategories(): Promise<number> {
  const rows = await query<{ count: number } & RowDataPacket>(
    `SELECT COUNT(*) AS count
     FROM Categories
     WHERE parentCatId IS NOT NULL`
  );

  return Number(rows[0]?.count || 0);
}

export interface CreateCategoryPayload {
  name: string;
  images?: string[];
  parentCatName?: string | null;
  parentCatId?: Id | null;
}

export async function createCategory(
  payload: CreateCategoryPayload
): Promise<Category | null> {
  const result = await execute(
    `INSERT INTO Categories (
      name,
      images,
      parentCatName,
      parentCatId,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :images,
      :parentCatName,
      :parentCatId,
      NOW(),
      NOW()
    )`,
    {
      name: payload.name,
      images: JSON.stringify(payload.images || []),
      parentCatName: payload.parentCatName || null,
      parentCatId: payload.parentCatId || null,
    }
  );

  return findCategoryById(result.insertId);
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export async function updateCategory(
  id: Id,
  payload: UpdateCategoryPayload
): Promise<Category | null> {
  const entries = Object.entries({
    name: payload.name,
    images: payload.images ? JSON.stringify(payload.images) : undefined,
    parentCatName: payload.parentCatName || null,
    parentCatId: payload.parentCatId || null,
  }).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return findCategoryById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE Categories
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findCategoryById(id);
}

export async function deleteCategoryById(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM Categories
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

export async function listChildCategories(
  parentCatId: Id
): Promise<Array<Category | null>> {
  const rows = await query<CategoryDbRow>(
    `SELECT ${CATEGORY_SELECT}
     FROM Categories
     WHERE parentCatId = :parentCatId`,
    { parentCatId }
  );

  return rows.map(mapCategory);
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(
      (value as string) || JSON.stringify(fallback)
    ) as T;
  } catch {
    return fallback;
  }
}
