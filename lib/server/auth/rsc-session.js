import { cookies } from "next/headers";
import { verifyAccessToken } from "./tokens.js";

/**
 * Read the logged-in user id inside an App Router Server Component.
 * Returns null when no/invalid token — callers handle the 403/redirect.
 */
async function getAccessUserIdFromRsc() {
  try {
    const store = await cookies();
    const token = store.get("accessToken")?.value;
    if (!token) return null;
    const decoded = verifyAccessToken(token);
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

export { getAccessUserIdFromRsc };
