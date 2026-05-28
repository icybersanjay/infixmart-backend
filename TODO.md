# InfixMart TODO

## Hero Section Image & Mobile Fix
- [x] Change hero container from fixed `height: 480` → responsive `h-[200px] sm:h-[300px] md:h-[400px] lg:h-[480px]` in `app/_legacy/Pages/Home/index.jsx`
- [x] Update `style.css` min-height from 280px → 200px to match mobile height
- [x] Set `object-position: left center` on mobile (< 768px) so banner text/logo is never cropped; desktop stays `center`
- [ ] Upload desktop banner images at `1920 × 600px` (3.2:1 ratio) via admin panel
- [ ] Test on 360px, 390px (iPhone), 768px (tablet), and 1440px (desktop) after change

## Category Section Redesign
- [x] Replace `CategoryGrid` tall card grid with a single-line horizontal Swiper strip
- [x] Use existing Swiper install (no new dependencies)
- [x] Enable `loop` mode for infinite seamless wrapping
- [x] Enable `autoplay` (delay 2000ms, pauseOnMouseEnter)
- [x] Allow user drag/swipe
- [x] Desktop: 8 tiles; Mobile: 3.5 tiles
- [x] Compact emoji + label tiles
- [x] Update clicks to `/category/<slug>` (was `/productListing?category=<id>`)
- [x] Unified Swiper for all screen sizes (removed old desktop/mobile split)

## Shop by Price Section Redesign
- [x] Convert `ShopByPrice` grid to single-line Swiper strip
- [x] Reduced card padding `p-4 sm:p-5`
- [x] Shrunk price font `text-[22px] sm:text-[26px]`
- [x] Slim Explore chip button
- [x] Loop + autoplay (delay 2500ms, pauseOnMouseEnter)
- [x] User drag/swipe enabled
- [x] Desktop: 5 cards; Mobile: 2
- [x] `SectionHead` margin tightened via `tight` prop
- [x] Preserved click/filter behaviour

## SEO — Product Slug URLs
- [x] Switch all product links site-wide from `/product/{id}` → `/product/{slug || id}` — fixed in `ProductItem`, `Compare`, `ProductListing` (list view), `ProductDetails` quick-view modal, `CartPage` (×2). Route already supported both formats.
- [x] Slider admin: added category URL hint ("Link tip: /category/electronics") in tip box and modal placeholder so admins know the correct URL format

## Product Card Improvements
- [x] Hide rating stars on home page cards (`hideRating` prop)
- [x] Change "Add to Cart" button color `#111827` → `#1565C0`
- [x] Show "No reviews yet" text when `rating === 0` instead of empty stars
- [x] Compare button replaced with small icon-only (`MdOutlineCompareArrows`) — shares bottom row with ATC button
- [x] Image aspect ratio `3/4` → `4/5`

## Dedicated Category Pages
- [x] Created `app/(store)/category/[slug]/page.jsx` route
- [x] Resolve category by slug (generated from name) from DB tree — fetches all categories, finds match
- [x] Reuses existing `ProductListingPage` component — no new UI, passes `lockedCatId` prop
- [x] Per-category metadata (title: "Buy {name} Wholesale | InfixMart", description, canonical URL, OG/Twitter)
- [x] Category grid clicks now navigate to `/category/<slug>` instead of `/productListing?category=<id>`
- [x] `generateStaticParams` for all categories (root + sub) for static generation + SEO
- [x] All category links in `ProductDetails` updated to `/category/<slug>` (4 instances)

## Product Listing Page — Full Redesign (Option B)
- [x] Removed left filter sidebar entirely on desktop
- [x] Added sticky horizontal `TopFilterBar` (desktop only): Category dropdown, Price dropdown, Brand dropdown, In Stock toggle
- [x] Active filters show as removable chips below the toolbar (existing — kept)
- [x] "Clear filters (N)" button in top bar when any filter is active
- [x] Full-width product grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`
- [x] Filters apply instantly with no page reload; URL param sync on `clearFilters` via `router.push(pathname)`
- [x] Preserved all existing filter logic (category, minPrice, maxPrice, brand, inStock, sort, search, rating)
- [x] Mobile: filters open in bottom sheet drawer — unchanged
- [x] Product count ("Showing X of Y products") below toolbar — unchanged
- [x] Load-more button instead of pagination — unchanged
- [x] `initialFilters` prop now seeds component state as fallback (enables category pages to pre-select the filter)
- [x] `lockedCatId` prop — category always passed to API, not affected by clearFilters (for `/category/[slug]` pages)
- [x] `applyPriceWith(min, max)` helper for direct preset application in `TopFilterBar`

## Product Detail Page — Left Panel Fix
- [x] Trust badges added below share row in sticky left panel: Free Shipping, 7-Day Returns, Secure Payment, Genuine Product
- [x] "More from this category" mini scroll strip added in left panel — `relatedProducts` sliced to 6 mini cards (image + name + price)
- [x] Replaced fake HDFC/Bajaj/Amazon Pay offers with real generic offers (Free Delivery, 7-Day Returns, No Cost EMI, Secure Payment)
- [x] Green rating badge hidden when `product.rating === 0` — shows "No reviews yet" instead

## Blog Seed Script
- [x] Created `scripts/seed-blogs.js` — reads `.env.local`, uses existing DB pool
- [x] 10 wholesale/reselling blogs written with full HTML content, excerpt, author = "InfixMart Team", published = true
- [x] Script skips insert if slug already exists (safe to re-run)
- [x] Added `"seed:blogs": "node scripts/seed-blogs.js"` to `package.json`
- [ ] Run locally: `npm run seed:blogs` → verify 10 rows in DB and visible on `/blog`

## Manual / Deployment Tasks
- [ ] Upload desktop banner images at `1920 × 600px` via admin panel
- [ ] Test responsive hero on 360px, 390px, 768px, 1440px
- [ ] Run `npm run seed:blogs` locally to seed blog posts
