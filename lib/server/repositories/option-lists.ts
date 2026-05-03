import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Id, OptionListKind, OptionRow } from "../types.js";

type OptionDbRow = OptionRow & RowDataPacket;

export interface MappedOption extends OptionRow {
  _id: Id;
}

function mapRow(row: OptionDbRow | undefined): MappedOption | null {
  return row ? { ...row, _id: row.id } : null;
}

function tableFor(kind: OptionListKind): string {
  if (kind === "ram") return "ProductRams";
  if (kind === "size") return "ProductSizes";
  if (kind === "weight") return "ProductWeights";
  throw new Error(`Unknown option list kind: ${kind}`);
}

export async function listOptions(kind: OptionListKind): Promise<MappedOption[]> {
  const table = tableFor(kind);
  const rows = await query<OptionDbRow>(
    `SELECT id, name, createdAt, updatedAt
     FROM ${table}
     ORDER BY createdAt DESC`
  );

  return rows.map((r) => mapRow(r) as MappedOption);
}

export async function findOptionByName(
  kind: OptionListKind,
  name: string
): Promise<MappedOption | null> {
  const table = tableFor(kind);
  const rows = await query<OptionDbRow>(
    `SELECT id, name, createdAt, updatedAt
     FROM ${table}
     WHERE name = :name
     LIMIT 1`,
    { name }
  );

  return mapRow(rows[0]);
}

export async function createOption(
  kind: OptionListKind,
  name: string
): Promise<MappedOption | null> {
  const table = tableFor(kind);
  const result = await execute(
    `INSERT INTO ${table} (name, createdAt, updatedAt)
     VALUES (:name, NOW(), NOW())`,
    { name }
  );

  const rows = await query<OptionDbRow>(
    `SELECT id, name, createdAt, updatedAt
     FROM ${table}
     WHERE id = :id
     LIMIT 1`,
    { id: result.insertId }
  );

  return mapRow(rows[0]);
}

export async function deleteOption(kind: OptionListKind, id: Id): Promise<boolean> {
  const table = tableFor(kind);
  const result = await execute(
    `DELETE FROM ${table}
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}
