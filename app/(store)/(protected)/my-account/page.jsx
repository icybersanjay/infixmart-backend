// Server component — seeds the order count for the stats card so the page can
// render hydrated on first paint. Wallet balance + referral data still load
// client-side because the referral endpoint auto-generates a code on first
// read and we don't want to duplicate that logic in the RSC. The (protected)
// layout already gates access; null token returns null and the client falls
// back to its own fetch.
import MyAccountPage from "./MyAccountPage.jsx";
import { getAccessUserIdFromRsc } from "../../../../lib/server/auth/rsc-session.js";
import { getUserOrders } from "../../../../lib/server/services/orders.js";

export const dynamic = "force-dynamic";

async function fetchInitialOrders() {
  try {
    const userId = await getAccessUserIdFromRsc();
    if (!userId) return null;
    const result = await getUserOrders(userId);
    return Array.isArray(result?.orders) ? result.orders : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const initialOrders = await fetchInitialOrders();
  return <MyAccountPage initialOrders={initialOrders} />;
}
