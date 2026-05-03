import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Id, ReferralLogRow } from "../types.js";

let tableReady = false;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await execute(`
    CREATE TABLE IF NOT EXISTS ReferralLogs (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      referrerId  INT NOT NULL,
      refereeId   INT NOT NULL,
      orderId     INT DEFAULT NULL,
      credited    TINYINT(1) NOT NULL DEFAULT 0,
      creditedAt  DATETIME DEFAULT NULL,
      createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_referee (refereeId)
    )
  `);
  tableReady = true;
}

type ReferralDbRow = ReferralLogRow & RowDataPacket;

export async function logReferral(referrerId: Id, refereeId: Id): Promise<void> {
  await ensureTable();
  await execute(
    `INSERT IGNORE INTO ReferralLogs (referrerId, refereeId) VALUES (:referrerId, :refereeId)`,
    { referrerId, refereeId }
  );
}

export async function markReferralCredited(refereeId: Id, orderId: Id): Promise<void> {
  await ensureTable();
  await execute(
    `UPDATE ReferralLogs SET credited = 1, orderId = :orderId, creditedAt = NOW()
     WHERE refereeId = :refereeId AND credited = 0`,
    { refereeId, orderId }
  );
}

export async function getReferralByReferee(
  refereeId: Id
): Promise<ReferralDbRow | null> {
  await ensureTable();
  const rows = await query<ReferralDbRow>(
    `SELECT * FROM ReferralLogs WHERE refereeId = :refereeId LIMIT 1`,
    { refereeId }
  );
  return rows[0] || null;
}

interface ReferralWithRefereeRow extends ReferralLogRow, RowDataPacket {
  refereeName: string | null;
  refereeEmail: string | null;
}

export async function getReferralsByReferrer(
  referrerId: Id
): Promise<ReferralWithRefereeRow[]> {
  await ensureTable();
  const rows = await query<ReferralWithRefereeRow>(
    `SELECT rl.*, u.name AS refereeName, u.email AS refereeEmail
     FROM ReferralLogs rl
     JOIN Users u ON u.id = rl.refereeId
     WHERE rl.referrerId = :referrerId
     ORDER BY rl.createdAt DESC`,
    { referrerId }
  );
  return rows;
}
