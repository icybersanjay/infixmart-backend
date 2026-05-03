import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { HomeSlide, HomeSlideRow, Id } from "../types.js";

const HOME_SLIDE_SELECT = `
  id,
  images,
  title,
  link,
  \`order\`,
  type,
  isActive,
  createdAt,
  updatedAt
`;

type HomeSlideDbRow = HomeSlideRow & RowDataPacket;

function mapHomeSlide(row: HomeSlideDbRow | undefined): HomeSlide | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    images: safeParseJson<string[]>(row.images, []),
    isActive: Boolean(row.isActive),
  };
}

export async function listHomeSlides({
  type = "",
}: { type?: string } = {}): Promise<Array<HomeSlide | null>> {
  const rows = await query<HomeSlideDbRow>(
    `SELECT ${HOME_SLIDE_SELECT}
     FROM HomeSlides
     ${type ? "WHERE type = :type" : ""}
     ORDER BY \`order\` ASC, createdAt DESC`,
    type ? { type } : {}
  );

  return rows.map(mapHomeSlide);
}

export async function findHomeSlideById(id: Id): Promise<HomeSlide | null> {
  const rows = await query<HomeSlideDbRow>(
    `SELECT ${HOME_SLIDE_SELECT}
     FROM HomeSlides
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapHomeSlide(rows[0]);
}

export interface CreateHomeSlidePayload {
  images?: string[];
  title?: string | null;
  link?: string | null;
  order?: number;
  type?: string | null;
  isActive?: boolean;
}

export async function createHomeSlide(
  payload: CreateHomeSlidePayload
): Promise<HomeSlide | null> {
  const result = await execute(
    `INSERT INTO HomeSlides (
      images,
      title,
      link,
      \`order\`,
      type,
      isActive,
      createdAt,
      updatedAt
    ) VALUES (
      :images,
      :title,
      :link,
      :order,
      :type,
      :isActive,
      NOW(),
      NOW()
    )`,
    {
      ...payload,
      images: JSON.stringify(payload.images || []),
      isActive: payload.isActive ? 1 : 0,
    }
  );

  return findHomeSlideById(result.insertId);
}

export type UpdateHomeSlidePayload = Partial<CreateHomeSlidePayload>;

export async function updateHomeSlide(
  id: Id,
  payload: UpdateHomeSlidePayload
): Promise<HomeSlide | null> {
  const serialized: Record<string, unknown> = {
    ...payload,
    images: payload.images ? JSON.stringify(payload.images) : undefined,
    isActive:
      payload.isActive === undefined ? undefined : payload.isActive ? 1 : 0,
  };
  const entries = Object.entries(serialized).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return findHomeSlideById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE HomeSlides
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findHomeSlideById(id);
}

export async function deleteHomeSlide(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM HomeSlides
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse((value as string) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}
