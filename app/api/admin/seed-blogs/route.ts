import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { ok, handleRouteError } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import { execute, query } from "../../../../lib/server/db/mysql.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toSlug = (str: string) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BLOGS = [
  {
    title: "How to Start a Reselling Business in India (2025 Guide)",
    excerpt: "Everything you need to know to launch a profitable reselling business in India — from picking products to your first sale.",
    content: `<h2>Why Reselling is One of the Best Businesses to Start in India</h2><p>Reselling is one of the fastest-growing income opportunities in India. With platforms like InfixMart offering wholesale prices on hundreds of product categories, anyone with a smartphone and a small starting capital can build a profitable side income — or a full-time business.</p><h2>Step 1: Choose Your Niche</h2><p>The biggest mistake new resellers make is trying to sell everything. Instead, pick one or two categories you understand well. Popular categories for resellers in India include toys, home & kitchen products, electronics accessories, and personal care items.</p><h2>Step 2: Source Products at Wholesale Prices</h2><p>Buying wholesale is the key to healthy profit margins. When you buy in bulk from a platform like InfixMart, you pay significantly less per unit than retail.</p><h2>Step 3: Choose Your Selling Channel</h2><p>You have several options: WhatsApp groups, Instagram shops, Meesho, Amazon, Flipkart, or your own website. Most first-time resellers start with WhatsApp or Instagram because there are no listing fees.</p><h2>Step 4: Price Your Products Right</h2><p>A good rule of thumb: aim for at least 40–60% gross margin. Factor in shipping, platform fees, and returns when setting your price.</p><h2>Step 5: Scale What Works</h2><p>Once you find a product that sells consistently, increase your order quantity to get better wholesale rates and grow your margins over time.</p>`,
  },
  {
    title: "Top 10 Wholesale Products to Sell Online in India",
    excerpt: "Not all products are equal when it comes to reselling. Here are the 10 best wholesale product categories for Indian resellers in 2025.",
    content: `<h2>The Best Products to Resell in India Right Now</h2><p>Choosing the right product is half the battle in reselling. You want something with high demand, low competition, easy shipping, and good margins.</p><h3>1. Toys & Games</h3><p>Toys are perennial bestsellers — birthdays, festivals, and school seasons drive consistent demand.</p><h3>2. Home & Kitchen Accessories</h3><p>Small kitchen gadgets, organizers, and storage products sell fast at low price points.</p><h3>3. Mobile Accessories</h3><p>Phone cases, charging cables, earphones, and screen protectors — everyone needs them and they're easy to ship.</p><h3>4. Personal Care Products</h3><p>Skincare, haircare, and grooming products have huge repeat purchase potential.</p><h3>5. Smart Gadgets</h3><p>Affordable smart devices like fitness bands, Bluetooth speakers, and smart plugs are increasingly popular in Tier 2 and Tier 3 cities.</p><h3>6. Stationery & School Supplies</h3><p>Season-driven but highly reliable. Schools reopen twice a year — back-to-school season is a goldmine for resellers.</p><h3>7. Baby Products</h3><p>Parents spend generously on babies. Feeding accessories, teethers, and nursery organizers have great margins.</p><h3>8. Fitness & Sports Equipment</h3><p>Resistance bands, yoga mats, and jump ropes are affordable to stock and easy to sell.</p><h3>9. Festival & Gifting Products</h3><p>Diwali, Holi, Christmas, Raksha Bandhan — India has festivals year-round. Gifting sets and decorations sell like hotcakes every season.</p><h3>10. Eco-Friendly Products</h3><p>Reusable bags, bamboo products, and sustainable kitchenware are growing fast as consumers become more environmentally conscious.</p>`,
  },
  {
    title: "How to Buy in Bulk and Maximise Your Profit Margins",
    excerpt: "Buying in bulk is the foundation of wholesale reselling. Here's how to do it smartly to protect your cash flow and maximise profits.",
    content: `<h2>Why Bulk Buying is the Key to Reselling Success</h2><p>Every successful reseller understands one fundamental truth: your profit is made when you buy, not when you sell. The lower your cost per unit, the higher your margin.</p><h2>Understand Tiered Pricing</h2><p>Most wholesale suppliers offer tiered pricing. The more you buy, the less you pay per unit. At higher quantities, you're paying 30% less than a single-unit buyer — that difference goes straight to your profit.</p><h2>Don't Overbuy: Test First</h2><p>The biggest risk in bulk buying is unsold stock. Before committing to 50 units, test with 5–10. If they sell quickly, scale up. If they don't move, you've only tied up a small amount of capital.</p><h2>Calculate Your True Cost</h2><p>Your cost per unit isn't just the wholesale price. Include shipping, packaging materials, platform fees, and a returns buffer of 3–5%.</p><h2>Manage Cash Flow Carefully</h2><p>Don't buy more stock than you can sell in 30 days. Unsold inventory is cash sitting idle. Keep your inventory lean, especially when starting out.</p>`,
  },
  {
    title: "Toys vs Electronics — Which Category is Best for Wholesale?",
    excerpt: "Toys and electronics are both popular wholesale categories. But which one is actually better for your reselling business? We break it down.",
    content: `<h2>Toys vs Electronics: A Wholesale Reseller's Comparison</h2><p>Two of the most popular wholesale categories are toys and electronics. Both have loyal buyers, but they work very differently as reselling businesses.</p><h2>Toys: Pros & Cons</h2><p>Pros: Year-round demand with seasonal spikes, wide price range, low return rates, easy to market on Instagram/WhatsApp. Cons: Trend-driven (popular toys change fast), storage space required for bulky items.</p><h2>Electronics: Pros & Cons</h2><p>Pros: Higher average order value, strong online demand, mobile accessories are lightweight and easy to ship. Cons: Higher return rates, quality control is critical, more competition from large sellers.</p><h2>The Verdict</h2><p>For beginners, <strong>toys are usually the safer starting point</strong>. Lower risk, easy to understand, and great demand during festival seasons. Electronics offer bigger rewards but require more experience. The ideal strategy: start with toys, then layer in electronics accessories as you grow.</p>`,
  },
  {
    title: "How InfixMart Works — A Beginner's Guide for Resellers",
    excerpt: "New to InfixMart? This step-by-step guide explains everything — from browsing products to placing your first wholesale order.",
    content: `<h2>Welcome to InfixMart — India's Wholesale Marketplace</h2><p>InfixMart is a wholesale marketplace where resellers, small businesses, and entrepreneurs can buy products at bulk prices — directly without middlemen.</p><h2>Step 1: Browse Products by Category</h2><p>Explore our catalogue by category — Toys, Home & Kitchen, Smart Gadgets, Electronics, and more. Each product page shows the wholesale price, available stock, and minimum order quantity.</p><h2>Step 2: Compare Prices by Quantity</h2><p>InfixMart shows tiered pricing on many products. As your order quantity increases, the price per unit drops.</p><h2>Step 3: Add to Cart and Checkout</h2><p>Once you've chosen your products and quantities, add them to your cart and proceed to checkout. We accept UPI, credit/debit cards, net banking, and EMI options.</p><h2>Step 4: Receive Your Order</h2><p>Orders are typically dispatched within 1–2 business days. Delivery typically takes 3–7 days depending on your location.</p><h2>Step 5: Sell and Repeat</h2><p>Once your products arrive, list them on WhatsApp, Instagram, or any e-commerce platform. When stock runs low, come back to InfixMart for a refill.</p>`,
  },
  {
    title: "7 Mistakes New Resellers Make (And How to Avoid Them)",
    excerpt: "Most new resellers make the same mistakes. Learn the 7 most common pitfalls and exactly how to avoid them to build a sustainable business.",
    content: `<h2>The 7 Biggest Mistakes New Resellers Make</h2><h3>Mistake 1: Buying Too Much Too Soon</h3><p>Don't bulk up on stock before you know what sells. Start small, validate demand, then scale.</p><h3>Mistake 2: Ignoring Shipping Costs</h3><p>Offering free shipping without building it into your price is a fast way to kill your margins.</p><h3>Mistake 3: Choosing Products Based on Personal Taste</h3><p>Do market research — look at what's trending on Meesho and Amazon before you buy.</p><h3>Mistake 4: Underpricing to Beat Competition</h3><p>Competing on price alone is a race to the bottom. Compete on trust, fast delivery, and customer service instead.</p><h3>Mistake 5: Not Keeping Track of Expenses</h3><p>Use a simple spreadsheet to track every rupee in and out.</p><h3>Mistake 6: No Clear Selling Channel</h3><p>Pick one primary channel, master it, then expand.</p><h3>Mistake 7: Giving Up Too Early</h3><p>Most resellers don't make significant income in the first 30 days. Success comes from consistency.</p>`,
  },
  {
    title: "Best Platforms to Sell Wholesale Products Online in India",
    excerpt: "Where should you sell your wholesale products? Here's an honest comparison of the top selling platforms for Indian resellers.",
    content: `<h2>Where to Sell Your Wholesale Products in India</h2><h3>1. WhatsApp Business</h3><p>Zero fees, direct communication with buyers, easy to start. Best for beginners and local resellers.</p><h3>2. Instagram Shop</h3><p>Great for visual products like home decor, personal care, and gifts. Instagram's shopping features allow you to tag products in posts and reels.</p><h3>3. Meesho</h3><p>Allows you to resell products without holding inventory — but margins are thin. If you're sourcing your own wholesale stock, you'll earn more by selling directly.</p><h3>4. Amazon India</h3><p>Most buyers in India, but competition is high and fees are significant (15–20%).</p><h3>5. Flipkart</h3><p>Good for electronics and gadgets. Flipkart's buyer base skews toward these categories.</p><h3>6. Your Own Website</h3><p>No platform fees, full control. The most profitable channel in the long run.</p><h2>Recommendation</h2><p>Start with WhatsApp + Instagram. Once you have consistent sales, expand to Amazon or Flipkart. Build your own website when you're ready to invest in branding.</p>`,
  },
  {
    title: "How to Price Wholesale Products for Retail — Formula & Tips",
    excerpt: "Pricing your wholesale products correctly is the difference between profit and loss. Here's a simple formula and practical tips.",
    content: `<h2>The Art and Science of Pricing Wholesale Products</h2><h2>The Basic Pricing Formula</h2><p>Selling Price = (Wholesale Cost + All Overheads) ÷ (1 - Target Margin %)</p><p>Example: If your wholesale cost is ₹200, overheads are ₹50, and you want a 40% margin: Selling Price = ₹250 ÷ 0.6 = ₹417. Round up to ₹419 or ₹449 for psychological pricing.</p><h2>What to Include in "Overheads"</h2><ul><li>Shipping cost to the customer</li><li>Packaging materials</li><li>Platform fees (Amazon: ~15%, Meesho: ~15-18%)</li><li>Return & damage buffer: 3–5%</li><li>Payment gateway fees: ~2%</li></ul><h2>Know Your Minimum Viable Price</h2><p>Calculate your break-even price and never sell below it.</p><h2>Research Competitor Pricing</h2><p>Check what competitors charge on Amazon and Flipkart. Price within 10–15% of the market.</p><h2>Use Psychological Pricing</h2><p>₹499 feels much cheaper than ₹500. Use just-below-round-number pricing whenever possible.</p>`,
  },
  {
    title: "Free Shipping vs Fast Shipping — What Your Customers Actually Want",
    excerpt: "Should you offer free shipping or fast shipping? The answer depends on your product type and customer base. Here's what the data says.",
    content: `<h2>The Shipping Dilemma Every Reseller Faces</h2><p>Shipping is one of the biggest factors in whether a customer completes a purchase. What do customers value more: free shipping or fast shipping?</p><h2>What Research Shows</h2><p><strong>Free shipping is the #1 purchase driver</strong> for online shoppers in India. More than 60% of online buyers have added extra items to an order just to qualify for free shipping.</p><p>However, for time-sensitive purchases (gifts, urgent needs), fast delivery wins.</p><h2>How to Decide</h2><p>Offer free shipping if your average order value is above ₹500 and you can absorb the cost into your margin. Prioritise fast shipping if you sell gifts, seasonal items, or festival products.</p><h2>The Best Strategy: Both</h2><p>Offer <strong>free shipping above a minimum order value</strong> (e.g., free above ₹999) AND clearly communicate your delivery timeline at checkout. This gives customers the free shipping they want while setting realistic delivery expectations.</p>`,
  },
  {
    title: "Home & Kitchen Products — Why They're the Best Category for New Resellers",
    excerpt: "Home & kitchen is one of the most underrated wholesale categories. Here's why it might be the perfect starting point for your reselling business.",
    content: `<h2>Why Home & Kitchen is the Hidden Gem of Wholesale Reselling</h2><h2>1. Everyone Needs These Products</h2><p>Home and kitchen items are needed year-round by virtually every household. Storage solutions, kitchen gadgets, cleaning tools, and organizers are purchased repeatedly.</p><h2>2. Low Return Rates</h2><p>Home & kitchen products have some of the lowest return rates in e-commerce. A chopping board or storage container is exactly what it looks like.</p><h2>3. Great Margins at Wholesale</h2><p>Many home & kitchen products have 100–300% markup potential. A stainless steel organizer that costs ₹120 wholesale can easily sell for ₹349–₹499 retail.</p><h2>4. Easy to Photograph and Market</h2><p>A clean kitchen product looks great in photos. A well-shot photo of a clever kitchen gadget can go viral in cooking communities.</p><h2>5. Perfect for Gifting</h2><p>Home products make excellent gifts. Housewarming gifts, wedding presents, and festival gifts are all occasions where these products sell in volume.</p><h2>Getting Started</h2><p>Browse InfixMart's Home & Kitchen category for wholesale-priced products with strong resale potential. Start with 5–10 items, test what sells in your network, and build from there.</p>`,
  },
];

export async function GET(request: NextRequest) {
  try {
    const userId = requireAccessUserId(request);
    await requireAdmin(userId);

    let inserted = 0;
    let skipped = 0;

    for (const blog of BLOGS) {
      const slug = toSlug(blog.title);
      const rows = await query<{ id: number } & RowDataPacket>(
        "SELECT id FROM Blogs WHERE slug = :slug LIMIT 1",
        { slug }
      );

      if (rows.length > 0) {
        skipped++;
        continue;
      }

      await execute(
        `INSERT INTO Blogs (title, slug, excerpt, content, image, author, published, createdAt, updatedAt)
         VALUES (:title, :slug, :excerpt, :content, :image, :author, :published, NOW(), NOW())`,
        { title: blog.title, slug, excerpt: blog.excerpt, content: blog.content, image: "", author: "InfixMart Team", published: 1 }
      );
      inserted++;
    }

    return ok({ inserted, skipped, message: `Done — ${inserted} blog posts inserted, ${skipped} already existed.` });
  } catch (error) {
    return handleRouteError(error, request);
  }
}
