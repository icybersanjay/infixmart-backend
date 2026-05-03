import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { CounterRow } from "../types.js";

type CounterValueRow = Pick<CounterRow, "value"> & RowDataPacket;

/**
 * Atomically allocate the next counter value for `(name, period)`. Uses
 * INSERT … ON DUPLICATE KEY UPDATE so it's safe under concurrent calls
 * without explicit transactions. Returns the post-increment value.
 *
 * Pass an existing connection to participate in a caller's transaction.
 */
export async function nextCounter(
  name: string,
  period: string,
  conn: PoolConnection | null = null
): Promise<number> {
  const params = { name: String(name), period: String(period) };
  const insertSql = `INSERT INTO CounterSequences (name, period, value)
        VALUES (:name, :period, 1)
   ON DUPLICATE KEY UPDATE value = value + 1, updatedAt = NOW()`;
  const selectSql = `SELECT value FROM CounterSequences WHERE name = :name AND period = :period LIMIT 1`;

  if (conn) {
    await conn.execute(insertSql, params);
    const [rows] = await conn.query<CounterValueRow[]>(selectSql, params);
    return Number(rows[0]?.value || 0);
  }

  await execute(insertSql, params);
  const rows = await query<CounterValueRow>(selectSql, params);
  return Number(rows[0]?.value || 0);
}
