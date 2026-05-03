// Server component — fetches the user's orders on the server so the page can
// stream a hydrated list on first paint instead of showing skeletons while a
// client `useEffect` round-trips `/api/order/myorders`. The (protected) layout
// already gates access; the auth read here is just to know WHICH user's orders
// to fetch — we tolerate a missing token (returns null) and let the client
// component fall back to its existing fetch path so behavior never breaks.
import MyOrdersPage from "./MyOrdersPage.jsx";
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
  return <MyOrdersPage initialOrders={initialOrders} />;
}
