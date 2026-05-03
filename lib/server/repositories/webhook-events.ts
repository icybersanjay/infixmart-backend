import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { WebhookEventRow } from "../types.js";

type WebhookEventDbRow = WebhookEventRow & RowDataPacket;

export interface RecordWebhookEventPayload {
  provider?: string;
  eventId: string;
  type: string;
  entityId?: string | null;
  payload: unknown;
}

export interface RecordWebhookEventResult {
  inserted: boolean;
  id: number | null;
}

export async function recordWebhookEvent({
  provider = "razorpay",
  eventId,
  type,
  entityId = null,
  payload,
}: RecordWebhookEventPayload): Promise<RecordWebhookEventResult> {
  const result = await execute(
    `INSERT IGNORE INTO WebhookEvents (provider, eventId, type, entityId, payload, status)
     VALUES (:provider, :eventId, :type, :entityId, :payload, 'received')`,
    {
      provider,
      eventId,
      type,
      entityId,
      payload: JSON.stringify(payload || {}),
    }
  );

  return {
    inserted: result.affectedRows === 1,
    id: result.insertId || null,
  };
}

export async function markWebhookProcessed(
  provider: string,
  eventId: string
): Promise<void> {
  await execute(
    `UPDATE WebhookEvents
        SET status = 'processed',
            processedAt = NOW()
      WHERE provider = :provider AND eventId = :eventId`,
    { provider, eventId }
  );
}

export async function markWebhookFailed(
  provider: string,
  eventId: string,
  error: unknown
): Promise<void> {
  await execute(
    `UPDATE WebhookEvents
        SET status = 'failed',
            error  = :error,
            processedAt = NOW()
      WHERE provider = :provider AND eventId = :eventId`,
    { provider, eventId, error: String(error || "").slice(0, 2000) }
  );
}

export async function findWebhookEvent(
  provider: string,
  eventId: string
): Promise<WebhookEventDbRow | null> {
  const rows = await query<WebhookEventDbRow>(
    `SELECT id, provider, eventId, type, entityId, status, error, receivedAt, processedAt
       FROM WebhookEvents
      WHERE provider = :provider AND eventId = :eventId
      LIMIT 1`,
    { provider, eventId }
  );
  return rows[0] || null;
}
