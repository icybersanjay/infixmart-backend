// Server component — fetches addresses on the server so the page renders
// hydrated on first paint (no skeleton flash). The (protected) layout already
// gates access; the auth read here is just to know which user's addresses to
// fetch — null token returns null so the client falls back to its own fetch
// path. Mutations (add/edit/delete) still flow through the existing API.
import MyAddressPage from "./MyAddressPage.jsx";
import { getAccessUserIdFromRsc } from "../../../../lib/server/auth/rsc-session.js";
import { getMyAddresses } from "../../../../lib/server/services/addresses.js";

export const dynamic = "force-dynamic";

async function fetchInitialAddresses() {
  try {
    const userId = await getAccessUserIdFromRsc();
    if (!userId) return null;
    const result = await getMyAddresses(userId);
    return Array.isArray(result?.data) ? result.data : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const initialAddresses = await fetchInitialAddresses();
  return <MyAddressPage initialAddresses={initialAddresses} />;
}
