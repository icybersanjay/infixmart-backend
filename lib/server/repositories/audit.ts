import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { AdminAuditLogRow, Id } from "../types.js";

let tableReady = false;

async function ensureAuditTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS AdminAuditLog (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      adminId     INT UNSIGNED NOT NULL,
      action      VARCHAR(64)  NOT NULL,
      entity      VARCHAR(64)  NOT NULL,
      entityId    VARCHAR(128) DEFAULT NULL,
      detail      TEXT         DEFAULT NULL,
      ip          VARCHAR(64)  DEFAULT NULL,
      createdAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_adminId (adminId),
      INDEX idx_entity  (entity, entityId),
      INDEX idx_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export interface WriteAuditLogPayload {
  adminId: Id;
  action: string;
  entity: string;
  entityId?: Id | string | null;
  detail?: string | null;
  ip?: string | null;
}

/**
 * Write one audit log entry. Failures are swallowed so they never
 * break the primary request flow.
 */
export async function writeAuditLog({
  adminId,
  action,
  entity,
  entityId = null,
  detail = null,
  ip = null,
}: WriteAuditLogPayload): Promise<void> {
  try {
    if (!tableReady) {
      await ensureAuditTable();
      tableReady = true;
    }
    await execute(
      `INSERT INTO AdminAuditLog (adminId, action, entity, entityId, detail, ip)
       VALUES (:adminId, :action, :entity, :entityId, :detail, :ip)`,
      {
        adminId,
        action: String(action).toUpperCase().slice(0, 64),
        entity: String(entity).toLowerCase().slice(0, 64),
        entityId: entityId != null ? String(entityId).slice(0, 128) : null,
        detail: detail ? String(detail).slice(0, 2000) : null,
        ip: ip ? String(ip).slice(0, 64) : null,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AuditLog] Failed to write audit log:", message);
  }
}

type AdminAuditLogDbRow = AdminAuditLogRow & RowDataPacket;

export interface GetAuditLogsResult {
  logs: AdminAuditLogDbRow[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * Retrieve audit logs for the admin panel UI (paginated).
 */
export async function getAuditLogs({
  page = 1,
  perPage = 50,
  adminId = null,
}: { page?: number; perPage?: number; adminId?: Id | null } = {}): Promise<GetAuditLogsResult> {
  const offset = (page - 1) * perPage;
  const params: Record<string, unknown> = { limit: perPage, offset };

  let where = "";
  if (adminId) {
    where = "WHERE adminId = :adminId";
    params.adminId = adminId;
  }

  const rows = await query<AdminAuditLogDbRow>(
    `SELECT id, adminId, action, entity, entityId, detail, ip, createdAt
     FROM AdminAuditLog
     ${where}
     ORDER BY createdAt DESC
     LIMIT :limit OFFSET :offset`,
    params
  );

  const countRows = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) AS total FROM AdminAuditLog ${where}`,
    adminId ? { adminId } : {}
  );
  const countRow = countRows[0];

  return {
    logs: rows,
    total: countRow?.total ?? 0,
    page,
    perPage,
  };
}
