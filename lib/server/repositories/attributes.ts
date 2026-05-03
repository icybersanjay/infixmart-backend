import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { AttributeTypeRow, AttributeValueRow, Id } from "../types.js";

type AttributeTypeDbRow = AttributeTypeRow & RowDataPacket;
type AttributeValueDbRow = AttributeValueRow & RowDataPacket;

export interface MappedAttributeType extends AttributeTypeRow {
  _id: Id;
}

export interface MappedAttributeValue extends AttributeValueRow {
  _id: Id;
}

export interface MappedAttributeTypeWithValues extends MappedAttributeType {
  values: MappedAttributeValue[];
}

function mapType(row: AttributeTypeDbRow | undefined): MappedAttributeType | null {
  return row ? { ...row, _id: row.id } : null;
}

function mapValue(row: AttributeValueDbRow | undefined): MappedAttributeValue | null {
  return row ? { ...row, _id: row.id } : null;
}

export async function listAttributeTypes(): Promise<MappedAttributeTypeWithValues[]> {
  const [types, values] = await Promise.all([
    query<AttributeTypeDbRow>(
      `SELECT id, name, createdAt, updatedAt
       FROM AttributeTypes
       ORDER BY name ASC`
    ),
    query<AttributeValueDbRow>(
      `SELECT id, attributeTypeId, value, createdAt, updatedAt
       FROM AttributeValues
       ORDER BY value ASC`
    ),
  ]);

  const groupedValues = values.reduce<Record<number, MappedAttributeValue[]>>(
    (acc, row) => {
      const key = row.attributeTypeId;
      acc[key] ||= [];
      acc[key].push(mapValue(row) as MappedAttributeValue);
      return acc;
    },
    {}
  );

  return types.map((row) => ({
    ...(mapType(row) as MappedAttributeType),
    values: groupedValues[row.id] || [],
  }));
}

export async function findAttributeTypeById(
  id: Id
): Promise<MappedAttributeType | null> {
  const rows = await query<AttributeTypeDbRow>(
    `SELECT id, name, createdAt, updatedAt
     FROM AttributeTypes
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapType(rows[0]);
}

export async function findAttributeTypeByName(
  name: string
): Promise<MappedAttributeType | null> {
  const rows = await query<AttributeTypeDbRow>(
    `SELECT id, name, createdAt, updatedAt
     FROM AttributeTypes
     WHERE name = :name
     LIMIT 1`,
    { name }
  );

  return mapType(rows[0]);
}

export async function createAttributeType(
  name: string
): Promise<MappedAttributeType | null> {
  const result = await execute(
    `INSERT INTO AttributeTypes (name, createdAt, updatedAt)
     VALUES (:name, NOW(), NOW())`,
    { name }
  );

  return findAttributeTypeById(result.insertId);
}

export async function updateAttributeType(
  id: Id,
  name: string
): Promise<MappedAttributeType | null> {
  await execute(
    `UPDATE AttributeTypes
     SET name = :name, updatedAt = NOW()
     WHERE id = :id`,
    { id, name }
  );

  return findAttributeTypeById(id);
}

export async function deleteAttributeType(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM AttributeTypes
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

export async function listAttributeValues(
  attributeTypeId: Id
): Promise<MappedAttributeValue[]> {
  const rows = await query<AttributeValueDbRow>(
    `SELECT id, attributeTypeId, value, createdAt, updatedAt
     FROM AttributeValues
     WHERE attributeTypeId = :attributeTypeId
     ORDER BY value ASC`,
    { attributeTypeId }
  );

  return rows.map((r) => mapValue(r) as MappedAttributeValue);
}

export async function createAttributeValue(
  attributeTypeId: Id,
  value: string
): Promise<MappedAttributeValue | null> {
  const result = await execute(
    `INSERT INTO AttributeValues (attributeTypeId, value, createdAt, updatedAt)
     VALUES (:attributeTypeId, :value, NOW(), NOW())`,
    { attributeTypeId, value }
  );

  const rows = await query<AttributeValueDbRow>(
    `SELECT id, attributeTypeId, value, createdAt, updatedAt
     FROM AttributeValues
     WHERE id = :id
     LIMIT 1`,
    { id: result.insertId }
  );

  return mapValue(rows[0]);
}

export async function findAttributeValueById(
  id: Id
): Promise<MappedAttributeValue | null> {
  const rows = await query<AttributeValueDbRow>(
    `SELECT id, attributeTypeId, value, createdAt, updatedAt
     FROM AttributeValues
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapValue(rows[0]);
}

export async function deleteAttributeValue(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM AttributeValues
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}
