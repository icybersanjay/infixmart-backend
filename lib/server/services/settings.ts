import { HttpError } from "../api/http.js";
import { listSettings, upsertSetting } from "../repositories/settings.js";

interface SettingsCache {
  data: Record<string, string | null> | null;
  ts: number;
}

const cache: SettingsCache = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

export function invalidateSettingsCache(): void {
  cache.ts = 0;
  cache.data = null;
}

export interface SettingsEnvelope {
  settings: Record<string, string | null>;
  success: true;
  error: false;
}

export async function getSettingsPublic(): Promise<SettingsEnvelope> {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    return { settings: cache.data, success: true, error: false };
  }

  cache.data = await listSettings();
  cache.ts = Date.now();

  return { settings: cache.data, success: true, error: false };
}

export async function getSettingsAdmin(): Promise<SettingsEnvelope> {
  return {
    settings: await listSettings(),
    success: true,
    error: false,
  };
}

export interface SaveSettingResult {
  message: string;
  success: true;
  error: false;
}

export async function saveSetting(body: {
  key?: string;
  value?: unknown;
} | null | undefined): Promise<SaveSettingResult> {
  const key = body?.key;
  if (!key) {
    throw new HttpError(400, "key is required");
  }

  await upsertSetting(key, String(body?.value ?? ""));
  invalidateSettingsCache();

  return {
    message: "Setting saved",
    success: true,
    error: false,
  };
}
