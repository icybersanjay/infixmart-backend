import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Id, SqlDateTime } from "../types.js";

export function normalizeQuery(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 250);
}

export interface LogSearchQueryPayload {
  query: string;
  resultCount?: number;
  userId?: Id | null;
  ip?: string | null;
}

export async function logSearchQuery({
  query: rawQuery,
  resultCount = 0,
  userId = null,
  ip = null,
}: LogSearchQueryPayload): Promise<void> {
  const q = String(rawQuery || "").trim().slice(0, 250);
  if (!q) return;
  await execute(
    `INSERT INTO SearchLogs (query, queryNorm, resultCount, userId, ip)
     VALUES (:query, :queryNorm, :resultCount, :userId, :ip)`,
    {
      query: q,
      queryNorm: normalizeQuery(q),
      resultCount: Number(resultCount) || 0,
      userId: userId ? Number(userId) : null,
      ip: ip ? String(ip).slice(0, 64) : null,
    }
  );
}

export interface TopSearchEntry {
  query: string;
  searches: number;
  avgResults: number;
  zeroResultCount: number;
  lastSearchedAt: SqlDateTime;
}

interface TopSearchRow extends RowDataPacket {
  query: string;
  searches: number | string;
  avgResults: number | string | null;
  zeroResultCount: number | string;
  lastSearchedAt: SqlDateTime;
}

export async function listTopSearches({
  days = 30,
  limit = 50,
}: { days?: number; limit?: number } = {}): Promise<TopSearchEntry[]> {
  const rows = await query<TopSearchRow>(
    `SELECT queryNorm AS query,
            COUNT(*) AS searches,
            AVG(resultCount) AS avgResults,
            SUM(CASE WHEN resultCount = 0 THEN 1 ELSE 0 END) AS zeroResultCount,
            MAX(createdAt) AS lastSearchedAt
       FROM SearchLogs
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
      GROUP BY queryNorm
      ORDER BY searches DESC, lastSearchedAt DESC
      LIMIT :limit`,
    { days: Number(days) || 30, limit: Number(limit) || 50 }
  );
  return rows.map((r) => ({
    query: r.query,
    searches: Number(r.searches || 0),
    avgResults: Number(r.avgResults || 0),
    zeroResultCount: Number(r.zeroResultCount || 0),
    lastSearchedAt: r.lastSearchedAt,
  }));
}

export interface ZeroResultSearchEntry {
  query: string;
  searches: number;
  lastSearchedAt: SqlDateTime;
}

interface ZeroResultSearchRow extends RowDataPacket {
  query: string;
  searches: number | string;
  lastSearchedAt: SqlDateTime;
}

export async function listZeroResultSearches({
  days = 30,
  limit = 50,
}: { days?: number; limit?: number } = {}): Promise<ZeroResultSearchEntry[]> {
  const rows = await query<ZeroResultSearchRow>(
    `SELECT queryNorm AS query,
            COUNT(*) AS searches,
            MAX(createdAt) AS lastSearchedAt
       FROM SearchLogs
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
        AND resultCount = 0
      GROUP BY queryNorm
      ORDER BY searches DESC, lastSearchedAt DESC
      LIMIT :limit`,
    { days: Number(days) || 30, limit: Number(limit) || 50 }
  );
  return rows.map((r) => ({
    query: r.query,
    searches: Number(r.searches || 0),
    lastSearchedAt: r.lastSearchedAt,
  }));
}
