import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";

interface SettingDefault {
  key: string;
  value: string;
}

const DEFAULT_SETTINGS: SettingDefault[] = [
  { key: "min_order_value", value: "999" },
  { key: "cod_enabled", value: "true" },
  { key: "gst_percent", value: "18" },
  { key: "membership_price", value: "49" },
  { key: "membership_enabled", value: "true" },
  {
    key: "membership_benefits",
    value: JSON.stringify([
      { icon: "cart",    title: "Shop from just ₹499",           subtitle: "Half the usual ₹999 minimum — always"   },
      { icon: "truck",   title: "Free Delivery on Every Order",   subtitle: "Zero shipping charges, forever"          },
      { icon: "zap",     title: "Priority Fast Delivery",         subtitle: "Your orders are dispatched first"        },
      { icon: "headset", title: "Dedicated Customer Support",     subtitle: "Skip the queue — member-only care"       },
    ]),
  },
  { key: "cart_timeline_enabled", value: "true" },
  { key: "cart_timeline_max", value: "1999" },
  {
    key: "cart_milestones",
    value: JSON.stringify([
      { amount: 1499, label: "Free Shipping", type: "free_shipping", enabled: true },
    ]),
  },
];

interface SettingsState {
  ensured: boolean;
}

const globalState: SettingsState =
  (globalThis as unknown as { __infixmartSettingsRepo?: SettingsState })
    .__infixmartSettingsRepo ||
  ((globalThis as unknown as { __infixmartSettingsRepo: SettingsState })
    .__infixmartSettingsRepo = { ensured: false });

async function ensureDefaultSettings(): Promise<void> {
  if (globalState.ensured) {
    return;
  }

  for (const row of DEFAULT_SETTINGS) {
    await execute(
      `INSERT INTO StoreSettings (\`key\`, \`value\`, updatedAt)
       VALUES (:key, :value, NOW())
       ON DUPLICATE KEY UPDATE updatedAt = updatedAt`,
      row as unknown as Record<string, unknown>
    );
  }

  globalState.ensured = true;
}

type SettingKVRow = { key: string; value: string | null } & RowDataPacket;

export async function listSettings(): Promise<Record<string, string | null>> {
  await ensureDefaultSettings();
  const rows = await query<SettingKVRow>(
    `SELECT \`key\`, \`value\`
     FROM StoreSettings`
  );

  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await ensureDefaultSettings();
  await execute(
    `INSERT INTO StoreSettings (\`key\`, \`value\`, updatedAt)
     VALUES (:key, :value, NOW())
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updatedAt = NOW()`,
    { key, value }
  );
}
