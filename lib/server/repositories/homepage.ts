import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { HomePageContent, HomePageContentRow, Id } from "../types.js";

const HOMEPAGE_SELECT = `
  id,
  section,
  \`key\`,
  title,
  subtitle,
  image,
  link,
  badge,
  badgeColor,
  bgColor,
  textColor,
  isActive,
  \`order\`,
  meta,
  createdAt,
  updatedAt
`;

type HomePageDbRow = HomePageContentRow & RowDataPacket;

function mapHomePageItem(row: HomePageDbRow | undefined): HomePageContent | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    isActive: Boolean(row.isActive),
  };
}

export async function listHomePageItemsBySection(
  section: string,
  { activeOnly = true }: { activeOnly?: boolean } = {}
): Promise<Array<HomePageContent | null>> {
  const rows = await query<HomePageDbRow>(
    `SELECT ${HOMEPAGE_SELECT}
     FROM HomePageContents
     WHERE section = :section
       ${activeOnly ? "AND isActive = 1" : ""}
     ORDER BY \`order\` ASC, createdAt ASC`,
    { section }
  );

  return rows.map(mapHomePageItem);
}

export async function listAllHomePageItems(): Promise<Array<HomePageContent | null>> {
  const rows = await query<HomePageDbRow>(
    `SELECT ${HOMEPAGE_SELECT}
     FROM HomePageContents
     ORDER BY section ASC, \`order\` ASC, createdAt ASC`
  );

  return rows.map(mapHomePageItem);
}

export async function findHomePageItemById(id: Id): Promise<HomePageContent | null> {
  const rows = await query<HomePageDbRow>(
    `SELECT ${HOMEPAGE_SELECT}
     FROM HomePageContents
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapHomePageItem(rows[0]);
}

export interface CreateHomePageItemPayload {
  section: string;
  key?: string | null;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  link?: string | null;
  badge?: string | null;
  badgeColor?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  isActive?: boolean;
  order?: number;
  meta?: string | null;
}

export async function createHomePageItem(
  payload: CreateHomePageItemPayload
): Promise<HomePageContent | null> {
  const result = await execute(
    `INSERT INTO HomePageContents (
      section,
      \`key\`,
      title,
      subtitle,
      image,
      link,
      badge,
      badgeColor,
      bgColor,
      textColor,
      isActive,
      \`order\`,
      meta,
      createdAt,
      updatedAt
    ) VALUES (
      :section,
      :key,
      :title,
      :subtitle,
      :image,
      :link,
      :badge,
      :badgeColor,
      :bgColor,
      :textColor,
      :isActive,
      :order,
      :meta,
      NOW(),
      NOW()
    )`,
    {
      ...payload,
      isActive: payload.isActive ? 1 : 0,
    }
  );

  return findHomePageItemById(result.insertId);
}

export type UpdateHomePageItemPayload = Partial<CreateHomePageItemPayload>;

export async function updateHomePageItem(
  id: Id,
  payload: UpdateHomePageItemPayload
): Promise<HomePageContent | null> {
  const serialized: Record<string, unknown> = {
    ...payload,
    isActive:
      payload.isActive === undefined ? undefined : payload.isActive ? 1 : 0,
  };
  const entries = Object.entries(serialized).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return findHomePageItemById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE HomePageContents
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findHomePageItemById(id);
}

export async function deleteHomePageItem(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM HomePageContents
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}
