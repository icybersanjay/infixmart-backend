import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type {
  AbandonedCartReminderStatus,
  DecimalString,
  Id,
  SqlDateTime,
} from "../types.js";

let smsColumnsReady = false;

async function ensureTable(): Promise<void> {
  await execute(
    `CREATE TABLE IF NOT EXISTS AbandonedCartReminders (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      userId        INT NOT NULL,
      cartSubtotal  DECIMAL(10,2) NOT NULL DEFAULT 0,
      cartSnapshot  JSON,
      status        ENUM('active','recovered','dismissed') NOT NULL DEFAULT 'active',
      lastEmailSentAt     DATETIME DEFAULT NULL,
      lastWhatsappSentAt  DATETIME DEFAULT NULL,
      lastSmsSentAt       DATETIME DEFAULT NULL,
      emailCount          INT NOT NULL DEFAULT 0,
      whatsappCount       INT NOT NULL DEFAULT 0,
      smsCount            INT NOT NULL DEFAULT 0,
      detectedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user (userId)
    )`,
    {}
  );

  // Idempotent auto-heal for installs created before SMS columns existed.
  if (!smsColumnsReady) {
    await execute(
      `ALTER TABLE AbandonedCartReminders
         ADD COLUMN IF NOT EXISTS lastSmsSentAt DATETIME DEFAULT NULL,
         ADD COLUMN IF NOT EXISTS smsCount      INT NOT NULL DEFAULT 0`
    );
    smsColumnsReady = true;
  }
}

export interface ListAbandonedCartsOptions {
  minIdleMinutes?: number;
  page?: number;
  perPage?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  exportAll?: boolean;
}

export interface AbandonedCartRow extends RowDataPacket {
  userId: Id;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  itemCount: number | string;
  cartSubtotal: DecimalString | number | null;
  lastCartActivity: SqlDateTime;
  idleMinutes: number;
  reminderId: Id | null;
  reminderStatus: AbandonedCartReminderStatus | string | null;
  lastEmailSentAt: SqlDateTime | null;
  lastWhatsappSentAt: SqlDateTime | null;
  lastSmsSentAt: SqlDateTime | null;
  emailCount: number | null;
  whatsappCount: number | null;
  smsCount: number | null;
  detectedAt: SqlDateTime | null;
}

export interface ListAbandonedCartsResult {
  rows: AbandonedCartRow[];
  total: number;
}

export async function listAbandonedCarts({
  minIdleMinutes = 60,
  page = 1,
  perPage = 30,
  dateFrom = null,
  dateTo = null,
  exportAll = false,
}: ListAbandonedCartsOptions = {}): Promise<ListAbandonedCartsResult> {
  await ensureTable();
  const offset = (page - 1) * perPage;

  const dateClause = [
    dateFrom ? `AND MAX(cp.updatedAt) >= :dateFrom` : "",
    dateTo ? `AND MAX(cp.updatedAt) <= DATE_ADD(:dateTo, INTERVAL 1 DAY)` : "",
  ].join(" ");

  const limitClause = exportAll ? "" : "LIMIT :perPage OFFSET :offset";

  const params: Record<string, unknown> = {
    minIdle: minIdleMinutes,
    perPage,
    offset,
    dateFrom,
    dateTo,
  };

  const rows = await query<AbandonedCartRow>(
    `SELECT
       u.id            AS userId,
       u.name          AS userName,
       u.email         AS userEmail,
       u.mobile        AS userPhone,
       COUNT(cp.id)    AS itemCount,
       SUM(p.price * cp.quantity) AS cartSubtotal,
       MAX(cp.updatedAt) AS lastCartActivity,
       TIMESTAMPDIFF(MINUTE, MAX(cp.updatedAt), NOW()) AS idleMinutes,
       acr.id          AS reminderId,
       acr.status      AS reminderStatus,
       acr.lastEmailSentAt,
       acr.lastWhatsappSentAt,
       acr.lastSmsSentAt,
       acr.emailCount,
       acr.whatsappCount,
       acr.smsCount,
       acr.detectedAt
     FROM CartProducts cp
     JOIN Users u ON u.id = cp.userId
     JOIN Products p ON p.id = cp.productId
     LEFT JOIN AbandonedCartReminders acr ON acr.userId = u.id
     WHERE cp.updatedAt < DATE_SUB(NOW(), INTERVAL :minIdle MINUTE)
       AND (acr.status IS NULL OR acr.status = 'active')
     GROUP BY u.id, u.name, u.email, u.mobile,
              acr.id, acr.status, acr.lastEmailSentAt, acr.lastWhatsappSentAt,
              acr.lastSmsSentAt, acr.emailCount, acr.whatsappCount, acr.smsCount,
              acr.detectedAt
     HAVING 1=1 ${dateClause}
     ORDER BY cartSubtotal DESC
     ${limitClause}`,
    params
  );

  const countRows = await query<{ total: number } & RowDataPacket>(
    `SELECT COUNT(*) AS total FROM (
       SELECT u.id
       FROM CartProducts cp
       JOIN Users u ON u.id = cp.userId
       LEFT JOIN AbandonedCartReminders acr ON acr.userId = cp.userId
       WHERE cp.updatedAt < DATE_SUB(NOW(), INTERVAL :minIdle MINUTE)
         AND (acr.status IS NULL OR acr.status = 'active')
       GROUP BY u.id
       HAVING 1=1 ${dateClause}
     ) sub`,
    params
  );
  const countRow = countRows[0];

  return { rows, total: Number(countRow?.total || 0) };
}

interface CartItemRow extends RowDataPacket {
  quantity: number;
  productId: Id;
  name: string;
  price: DecimalString | number;
  images: Json | null;
}

type Json = string | object;

export async function getCartItemsForUser(userId: Id): Promise<CartItemRow[]> {
  return query<CartItemRow>(
    `SELECT cp.quantity, p.id AS productId, p.name, p.price, p.images
     FROM CartProducts cp
     JOIN Products p ON p.id = cp.productId
     WHERE cp.userId = :userId`,
    { userId }
  );
}

export type ReminderChannel = "email" | "whatsapp" | "sms";

export interface UpsertReminderPayload {
  cartSubtotal: number;
  cartSnapshot: unknown;
  channel: ReminderChannel;
}

export async function upsertReminder(
  userId: Id,
  { cartSubtotal, cartSnapshot, channel }: UpsertReminderPayload
): Promise<void> {
  await ensureTable();

  if (channel === "email") {
    await execute(
      `INSERT INTO AbandonedCartReminders
         (userId, cartSubtotal, cartSnapshot, lastEmailSentAt, emailCount, detectedAt, updatedAt)
       VALUES (:userId, :cartSubtotal, :cartSnapshot, NOW(), 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         cartSubtotal        = VALUES(cartSubtotal),
         cartSnapshot        = VALUES(cartSnapshot),
         lastEmailSentAt     = NOW(),
         emailCount          = emailCount + 1,
         updatedAt           = NOW()`,
      { userId, cartSubtotal, cartSnapshot: JSON.stringify(cartSnapshot) }
    );
  } else if (channel === "whatsapp") {
    await execute(
      `INSERT INTO AbandonedCartReminders
         (userId, cartSubtotal, cartSnapshot, lastWhatsappSentAt, whatsappCount, detectedAt, updatedAt)
       VALUES (:userId, :cartSubtotal, :cartSnapshot, NOW(), 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         cartSubtotal          = VALUES(cartSubtotal),
         cartSnapshot          = VALUES(cartSnapshot),
         lastWhatsappSentAt    = NOW(),
         whatsappCount         = whatsappCount + 1,
         updatedAt             = NOW()`,
      { userId, cartSubtotal, cartSnapshot: JSON.stringify(cartSnapshot) }
    );
  } else if (channel === "sms") {
    await execute(
      `INSERT INTO AbandonedCartReminders
         (userId, cartSubtotal, cartSnapshot, lastSmsSentAt, smsCount, detectedAt, updatedAt)
       VALUES (:userId, :cartSubtotal, :cartSnapshot, NOW(), 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         cartSubtotal     = VALUES(cartSubtotal),
         cartSnapshot     = VALUES(cartSnapshot),
         lastSmsSentAt    = NOW(),
         smsCount         = smsCount + 1,
         updatedAt        = NOW()`,
      { userId, cartSubtotal, cartSnapshot: JSON.stringify(cartSnapshot) }
    );
  }
}

export async function setReminderStatus(
  userId: Id,
  status: AbandonedCartReminderStatus | string
): Promise<void> {
  await ensureTable();
  await execute(
    `INSERT INTO AbandonedCartReminders (userId, cartSubtotal, status, detectedAt, updatedAt)
     VALUES (:userId, 0, :status, NOW(), NOW())
     ON DUPLICATE KEY UPDATE status = :status, updatedAt = NOW()`,
    { userId, status }
  );
}

export async function markRecovered(userId: Id): Promise<void> {
  await ensureTable();
  await execute(
    `UPDATE AbandonedCartReminders SET status = 'recovered', updatedAt = NOW()
     WHERE userId = :userId`,
    { userId }
  );
}
