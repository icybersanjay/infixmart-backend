import Link from "next/link";
import { listCategories } from "../lib/server/repositories/categories.js";

export const metadata = {
  title: "Page Not Found | InfixMart Wholesale",
  robots: {
    index: false,
    follow: false,
  },
};

async function loadTopCategories() {
  try {
    const cats = await listCategories();
    return cats
      .filter((c) => !c.parentCatId)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export default async function NotFound() {
  const topCategories = await loadTopCategories();

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-[#F5F7FF] px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Hero block */}
        <div className="text-center">
          <div className="text-[80px] sm:text-[110px] font-[900] leading-none text-[#1565C0] tracking-tight">
            404
          </div>
          <h1 className="mt-2 text-[22px] sm:text-[28px] font-[800] text-gray-800">
            We couldn't find that page
          </h1>
          <p className="mt-2 max-w-md mx-auto text-[14px] text-gray-500">
            The link may be broken, or the product may have moved. Try searching, or jump to a popular category below.
          </p>
        </div>

        {/* Search */}
        <form
          action="/productListing"
          method="GET"
          className="mt-7 flex gap-2 max-w-xl mx-auto"
          role="search"
        >
          <input
            type="search"
            name="search"
            placeholder="Search wholesale products…"
            autoComplete="off"
            aria-label="Search products"
            className="flex-1 h-12 px-4 text-[14px] rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:border-[#1565C0]"
          />
          <button
            type="submit"
            className="h-12 px-5 rounded-xl bg-[#1565C0] text-white text-[13px] font-[700] hover:bg-[#0D47A1] transition-colors"
          >
            Search
          </button>
        </form>

        {/* Quick links */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[12px]">
          <Link href="/" className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0] transition-colors">Home</Link>
          <Link href="/productListing" className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0] transition-colors">All products</Link>
          <Link href="/track" className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0] transition-colors">Track an order</Link>
          <Link href="/my-list" className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0] transition-colors">My wishlist</Link>
        </div>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[12px] font-[700] uppercase tracking-wide text-gray-400 text-center mb-3">
              Popular categories
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {topCategories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/productListing?category=${c.id}`}
                    className="block px-3 py-3 rounded-xl bg-white border border-gray-100 hover:border-[#1565C0] hover:bg-[#F5F8FF] text-center text-[13px] font-[600] text-gray-700 hover:text-[#1565C0] transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
