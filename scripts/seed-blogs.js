import dotenv from "dotenv";
import { getMysqlPool } from "../lib/server/db/mysql.js";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const toSlug = (title) =>
  title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BLOGS = [
  {
    title: "How to Start a Reselling Business in India (2025 Guide)",
    excerpt: "Everything you need to know to launch a profitable reselling business in India — from picking products to your first sale.",
    content: `<h2>Why Reselling is One of the Best Businesses to Start in India</h2>
<p>Reselling is one of the fastest-growing income opportunities in India. With platforms like InfixMart offering wholesale prices on hundreds of product categories, anyone with a smartphone and a small starting capital can build a profitable side income — or a full-time business.</p>
<h2>Step 1: Choose Your Niche</h2>
<p>The biggest mistake new resellers make is trying to sell everything. Instead, pick one or two categories you understand well. Popular categories for resellers in India include toys, home & kitchen products, electronics accessories, and personal care items.</p>
<h2>Step 2: Source Products at Wholesale Prices</h2>
<p>Buying wholesale is the key to healthy profit margins. When you buy in bulk from a platform like InfixMart, you pay significantly less per unit than retail. For example, a toy set that retails for ₹599 might cost you ₹199 at wholesale — that's a 200% markup potential.</p>
<h2>Step 3: Choose Your Selling Channel</h2>
<p>You have several options: WhatsApp groups, Instagram shops, Meesho, Amazon, Flipkart, or your own website. Most first-time resellers start with WhatsApp or Instagram because there are no listing fees.</p>
<h2>Step 4: Price Your Products Right</h2>
<p>A good rule of thumb: aim for at least 40–60% gross margin. If you buy a product for ₹200, sell it for at least ₹330–₹400. Factor in shipping, platform fees, and returns when setting your price.</p>
<h2>Step 5: Scale What Works</h2>
<p>Once you find a product that sells consistently, increase your order quantity to get better wholesale rates and grow your margins over time.</p>
<p>Start small, learn fast, and reinvest your profits. InfixMart makes it easy to order as few as one unit or as many as a hundred — so you can test before committing to bulk.</p>`,
  },
  {
    title: "Top 10 Wholesale Products to Sell Online in India",
    excerpt: "Not all products are equal when it comes to reselling. Here are the 10 best wholesale product categories for Indian resellers in 2025.",
    content: `<h2>The Best Products to Resell in India Right Now</h2>
<p>Choosing the right product is half the battle in reselling. You want something with high demand, low competition, easy shipping, and good margins. Here are the top 10 categories based on what actually sells.</p>
<h3>1. Toys & Games</h3>
<p>Toys are perennial bestsellers — birthdays, festivals, and school seasons drive consistent demand. Educational toys and outdoor play sets are especially popular.</p>
<h3>2. Home & Kitchen Accessories</h3>
<p>Indians are upgrading their homes constantly. Small kitchen gadgets, organizers, and storage products sell fast at low price points.</p>
<h3>3. Mobile Accessories</h3>
<p>Phone cases, charging cables, earphones, and screen protectors — everyone needs them and they're easy to ship.</p>
<h3>4. Personal Care Products</h3>
<p>Skincare, haircare, and grooming products have huge repeat purchase potential. Customers who love a product will come back month after month.</p>
<h3>5. Smart Gadgets</h3>
<p>Affordable smart devices like fitness bands, Bluetooth speakers, and smart plugs are increasingly popular in Tier 2 and Tier 3 cities.</p>
<h3>6. Stationery & School Supplies</h3>
<p>Season-driven but highly reliable. Schools reopen twice a year — back-to-school season is a goldmine for resellers.</p>
<h3>7. Baby Products</h3>
<p>Parents spend generously on babies. Feeding accessories, teethers, and nursery organizers have great margins.</p>
<h3>8. Fitness & Sports Equipment</h3>
<p>Post-pandemic fitness awareness is still strong. Resistance bands, yoga mats, and jump ropes are affordable to stock and easy to sell.</p>
<h3>9. Festival & Gifting Products</h3>
<p>Diwali, Holi, Christmas, Raksha Bandhan — India has festivals year-round. Gifting sets and decorations sell like hotcakes every season.</p>
<h3>10. Eco-Friendly Products</h3>
<p>Reusable bags, bamboo products, and sustainable kitchenware are growing fast as consumers become more environmentally conscious.</p>
<p>Browse all these categories at wholesale prices on InfixMart and start your reselling journey today.</p>`,
  },
  {
    title: "How to Buy in Bulk and Maximise Your Profit Margins",
    excerpt: "Buying in bulk is the foundation of wholesale reselling. Here's how to do it smartly to protect your cash flow and maximise profits.",
    content: `<h2>Why Bulk Buying is the Key to Reselling Success</h2>
<p>Every successful reseller understands one fundamental truth: your profit is made when you buy, not when you sell. The lower your cost per unit, the higher your margin — and bulk buying is the most reliable way to lower your cost.</p>
<h2>Understand Tiered Pricing</h2>
<p>Most wholesale suppliers, including InfixMart, offer tiered pricing. The more you buy, the less you pay per unit. For example:</p>
<ul>
<li>1–5 units: ₹250/unit</li>
<li>6–20 units: ₹210/unit</li>
<li>21+ units: ₹175/unit</li>
</ul>
<p>At 21 units, you're paying 30% less than a single-unit buyer. That difference goes straight to your profit.</p>
<h2>Don't Overbuy: Test First</h2>
<p>The biggest risk in bulk buying is unsold stock. Before committing to 50 units, test with 5–10. If they sell quickly, scale up. If they don't move, you've only tied up a small amount of capital.</p>
<h2>Calculate Your True Cost</h2>
<p>Your cost per unit isn't just the wholesale price. Include:
<ul>
<li>Shipping to you</li>
<li>Packaging materials</li>
<li>Platform fees (if selling on Meesho, Amazon, etc.)</li>
<li>Returns & damage buffer (usually 3–5%)</li>
</ul>
Add these up before setting your selling price.</p>
<h2>Manage Cash Flow Carefully</h2>
<p>Don't buy more stock than you can sell in 30 days. Unsold inventory is cash sitting idle. Keep your inventory lean, especially when starting out.</p>
<h2>Negotiate for Better Deals</h2>
<p>Once you're a regular buyer, don't be afraid to negotiate. Suppliers value reliable repeat customers and often give additional discounts or priority stock to their best buyers.</p>`,
  },
  {
    title: "Toys vs Electronics — Which Category is Best for Wholesale?",
    excerpt: "Toys and electronics are both popular wholesale categories. But which one is actually better for your reselling business? We break it down.",
    content: `<h2>Toys vs Electronics: A Wholesale Reseller's Comparison</h2>
<p>Two of the most popular wholesale categories on InfixMart are toys and electronics. Both have loyal buyers, but they work very differently as reselling businesses. Here's an honest comparison.</p>
<h2>Toys: Pros & Cons</h2>
<h3>Pros:</h3>
<ul>
<li>Year-round demand with seasonal spikes (Diwali, Christmas, birthdays)</li>
<li>Wide price range — from ₹100 to ₹2,000+</li>
<li>Low return rates compared to electronics</li>
<li>Easy to photograph and market on Instagram/WhatsApp</li>
</ul>
<h3>Cons:</h3>
<ul>
<li>Trend-driven — popular toys change fast</li>
<li>Storage space required for bulky items</li>
<li>Quality complaints if you pick the wrong supplier</li>
</ul>
<h2>Electronics: Pros & Cons</h2>
<h3>Pros:</h3>
<ul>
<li>Higher average order value = bigger profits per sale</li>
<li>Strong online demand across all demographics</li>
<li>Mobile accessories are lightweight and easy to ship</li>
</ul>
<h3>Cons:</h3>
<ul>
<li>Higher return rates due to defects and buyer expectations</li>
<li>Quality control is critical — one bad batch can damage your reputation</li>
<li>More competition from large sellers</li>
</ul>
<h2>The Verdict</h2>
<p>For beginners, <strong>toys are usually the safer starting point</strong>. Lower risk, easy to understand, and great demand during festival seasons. Electronics offer bigger rewards but require more experience in quality sourcing and customer support.</p>
<p>The ideal strategy: start with toys to build cash flow and confidence, then layer in electronics accessories (phone cases, cables) as you grow.</p>`,
  },
  {
    title: "How InfixMart Works — A Beginner's Guide for Resellers",
    excerpt: "New to InfixMart? This step-by-step guide explains everything — from browsing products to placing your first wholesale order.",
    content: `<h2>Welcome to InfixMart — India's Wholesale Marketplace</h2>
<p>InfixMart is a wholesale marketplace where resellers, small businesses, and entrepreneurs can buy products at bulk prices — directly without middlemen. Here's how it works.</p>
<h2>Step 1: Browse Products by Category</h2>
<p>Explore our catalogue by category — Toys, Home & Kitchen, Smart Gadgets, Electronics, and more. Each product page shows the wholesale price, available stock, and minimum order quantity.</p>
<h2>Step 2: Compare Prices by Quantity</h2>
<p>InfixMart shows tiered pricing on many products. As your order quantity increases, the price per unit drops. You can see exactly how much you save at different quantities before adding to your cart.</p>
<h2>Step 3: Add to Cart and Checkout</h2>
<p>Once you've chosen your products and quantities, add them to your cart. Review your order, apply any coupon codes, and proceed to checkout. We accept UPI, credit/debit cards, net banking, and EMI options.</p>
<h2>Step 4: Receive Your Order</h2>
<p>Orders are typically dispatched within 1–2 business days. You'll receive tracking updates via SMS and email. Delivery typically takes 3–7 days depending on your location.</p>
<h2>Step 5: Sell and Repeat</h2>
<p>Once your products arrive, list them on WhatsApp, Instagram, or any e-commerce platform. When stock runs low, come back to InfixMart for a refill — your purchase history makes reordering even faster.</p>
<h2>Need Help?</h2>
<p>Our support team is available on WhatsApp and email. Whether you have questions about a product, need help with an order, or want advice on what to stock — we're here to help.</p>`,
  },
  {
    title: "7 Mistakes New Resellers Make (And How to Avoid Them)",
    excerpt: "Most new resellers make the same mistakes. Learn the 7 most common pitfalls and exactly how to avoid them to build a sustainable business.",
    content: `<h2>The 7 Biggest Mistakes New Resellers Make</h2>
<p>Starting a reselling business seems simple, but many newcomers stumble on the same avoidable mistakes. Here's what to watch out for.</p>
<h3>Mistake 1: Buying Too Much Too Soon</h3>
<p>Enthusiasm is great, but don't bulk up on stock before you know what sells in your market. Start small, validate demand, then scale.</p>
<h3>Mistake 2: Ignoring Shipping Costs</h3>
<p>Many resellers forget to factor in the cost of shipping to their customers. Offering "free shipping" without building it into your price is a fast way to kill your margins.</p>
<h3>Mistake 3: Choosing Products Based on Personal Taste</h3>
<p>Just because you love a product doesn't mean your customers will. Do market research — look at what's trending on Meesho, Amazon, and Instagram before you buy.</p>
<h3>Mistake 4: Underpricing to Beat Competition</h3>
<p>Competing on price alone is a race to the bottom. Compete on trust, fast delivery, and customer service instead. Customers will pay a premium for reliability.</p>
<h3>Mistake 5: Not Keeping Track of Expenses</h3>
<p>Many resellers don't track their true costs and assume they're profitable when they're not. Use a simple spreadsheet to track every rupee in and out.</p>
<h3>Mistake 6: No Clear Selling Channel</h3>
<p>Trying to sell everywhere at once is overwhelming. Pick one primary channel (WhatsApp, Instagram, or a marketplace), master it, then expand.</p>
<h3>Mistake 7: Giving Up Too Early</h3>
<p>Most resellers don't make significant income in the first 30 days. Success comes from consistency — keep improving your product selection, pricing, and marketing every week.</p>
<p>Avoid these mistakes and you'll be well ahead of 80% of new resellers starting out today.</p>`,
  },
  {
    title: "Best Platforms to Sell Wholesale Products Online in India",
    excerpt: "Where should you sell your wholesale products? Here's an honest comparison of the top selling platforms for Indian resellers.",
    content: `<h2>Where to Sell Your Wholesale Products in India</h2>
<p>Once you've sourced products from InfixMart, the next question is: where do you sell them? Here's a breakdown of the best platforms for different types of resellers.</p>
<h3>1. WhatsApp Business</h3>
<p><strong>Best for:</strong> Beginners and local resellers</p>
<p>Zero fees, direct communication with buyers, easy to start. Build a customer list and share product catalogues directly. Best for personal networks and community selling.</p>
<h3>2. Instagram Shop</h3>
<p><strong>Best for:</strong> Visual products like home decor, personal care, and gifts</p>
<p>Instagram's shopping features allow you to tag products in posts and reels. Great for building a brand and reaching younger buyers.</p>
<h3>3. Meesho</h3>
<p><strong>Best for:</strong> Zero-investment resellers</p>
<p>Meesho allows you to resell products without holding inventory — but margins are thin. If you're sourcing your own wholesale stock, you'll earn more by selling directly.</p>
<h3>4. Amazon India</h3>
<p><strong>Best for:</strong> Established sellers with consistent stock</p>
<p>Amazon has the most buyers in India. But competition is high, fees are significant (15–20%), and you need to maintain stock levels consistently.</p>
<h3>5. Flipkart</h3>
<p><strong>Best for:</strong> Electronics and gadgets</p>
<p>Flipkart's buyer base skews toward electronics and fashion. Good choice if your wholesale sourcing is in those categories.</p>
<h3>6. Your Own Website</h3>
<p><strong>Best for:</strong> Long-term brand building</p>
<p>No platform fees, full control. Higher upfront effort but the most profitable channel in the long run.</p>
<h2>Recommendation</h2>
<p>Start with WhatsApp + Instagram. Once you have consistent sales, expand to Amazon or Flipkart. Build your own website when you're ready to invest in branding.</p>`,
  },
  {
    title: "How to Price Wholesale Products for Retail — Formula & Tips",
    excerpt: "Pricing your wholesale products correctly is the difference between profit and loss. Here's a simple formula and practical tips.",
    content: `<h2>The Art and Science of Pricing Wholesale Products</h2>
<p>Getting your pricing right is one of the most important skills in reselling. Price too high and customers walk away. Price too low and you work hard for nothing. Here's how to find the sweet spot.</p>
<h2>The Basic Pricing Formula</h2>
<p>Selling Price = (Wholesale Cost + All Overheads) ÷ (1 - Target Margin %)</p>
<p>Example: If your wholesale cost is ₹200, overheads (shipping + packaging + fees) are ₹50, and you want a 40% margin:</p>
<p>Selling Price = (₹200 + ₹50) ÷ 0.6 = ₹417</p>
<p>Round up to ₹419 or ₹449 for psychological pricing.</p>
<h2>What to Include in "Overheads"</h2>
<ul>
<li>Shipping cost to the customer (or a buffer for free shipping)</li>
<li>Packaging materials (boxes, bubble wrap, tape)</li>
<li>Platform fees (Amazon: ~15%, Meesho: ~15-18%)</li>
<li>Return & damage buffer: 3–5% of revenue</li>
<li>Payment gateway fees: ~2%</li>
</ul>
<h2>Know Your Minimum Viable Price</h2>
<p>Calculate your break-even price (where you make zero profit). Never sell below this. When offering discounts, only discount from your target price, not your margin.</p>
<h2>Research Competitor Pricing</h2>
<p>Check what competitors are charging for similar products on Amazon and Flipkart. Price within 10–15% of the market — matching or slightly undercutting is the safest strategy.</p>
<h2>Use Psychological Pricing</h2>
<p>₹499 feels much cheaper than ₹500. ₹999 converts better than ₹1,000. Use just-below-round-number pricing whenever possible.</p>
<h2>Revisit Prices Regularly</h2>
<p>Wholesale prices change. If your supplier raises prices, review and adjust your retail prices promptly. Don't let margins silently erode.</p>`,
  },
  {
    title: "Free Shipping vs Fast Shipping — What Your Customers Actually Want",
    excerpt: "Should you offer free shipping or fast shipping? The answer depends on your product type and customer base. Here's what the data says.",
    content: `<h2>The Shipping Dilemma Every Reseller Faces</h2>
<p>Shipping is one of the biggest factors in whether a customer completes a purchase — or abandons their cart. But what do customers actually value more: free shipping or fast shipping?</p>
<h2>What Research Shows</h2>
<p>Study after study shows that <strong>free shipping is the #1 purchase driver</strong> for online shoppers in India. More than 60% of online buyers have added extra items to an order just to qualify for free shipping.</p>
<p>However, for time-sensitive purchases (gifts, urgent needs), fast delivery wins. A customer buying a birthday gift that's needed in two days doesn't care about the ₹50 shipping fee — they care about getting it on time.</p>
<h2>How to Decide</h2>
<p><strong>Offer free shipping if:</strong></p>
<ul>
<li>Your average order value is above ₹500</li>
<li>Your product is not urgently needed</li>
<li>You can absorb the shipping cost into your margin</li>
</ul>
<p><strong>Prioritise fast shipping if:</strong></p>
<ul>
<li>You sell gifts, seasonal items, or festival products</li>
<li>Your customers are in Tier 1 cities where same/next-day delivery is possible</li>
<li>You're competing with Amazon where speed is the benchmark</li>
</ul>
<h2>The Best Strategy: Both</h2>
<p>The winning approach is to offer <strong>free shipping above a minimum order value</strong> (e.g., free above ₹999) AND clearly communicate your delivery timeline at checkout. This gives customers the free shipping they want while setting realistic delivery expectations.</p>
<h2>InfixMart's Approach</h2>
<p>At InfixMart, we offer free shipping on orders above ₹999 with delivery in 3–7 business days. This works well for wholesale buyers who are ordering in quantity and planning ahead.</p>`,
  },
  {
    title: "Home & Kitchen Products — Why They're the Best Category for New Resellers",
    excerpt: "Home & kitchen is one of the most underrated wholesale categories. Here's why it might be the perfect starting point for your reselling business.",
    content: `<h2>Why Home & Kitchen is the Hidden Gem of Wholesale Reselling</h2>
<p>When most people think of reselling, they think of electronics or fashion. But home & kitchen products are consistently one of the best-performing categories for wholesale resellers — especially beginners. Here's why.</p>
<h2>1. Everyone Needs These Products</h2>
<p>Unlike seasonal or niche products, home and kitchen items are needed year-round by virtually every household. Storage solutions, kitchen gadgets, cleaning tools, and organizers are purchased repeatedly as items wear out or better options become available.</p>
<h2>2. Low Return Rates</h2>
<p>Home & kitchen products have some of the lowest return rates in e-commerce. Unlike electronics (which can have defects) or clothing (which has sizing issues), a chopping board or storage container is exactly what it looks like.</p>
<h2>3. Great Margins at Wholesale</h2>
<p>Many home & kitchen products have 100–300% markup potential. A stainless steel organizer that costs ₹120 wholesale can easily sell for ₹349–₹499 retail. These margins leave room for platform fees, shipping, and still make a healthy profit.</p>
<h2>4. Easy to Photograph and Market</h2>
<p>A clean kitchen product looks great in photos, especially when styled in a kitchen setting. Instagram and WhatsApp are highly visual — and a well-shot photo of a clever kitchen gadget can go viral in cooking communities.</p>
<h2>5. Perfect for Gifting</h2>
<p>Home products make excellent gifts. Housewarming gifts, wedding presents, and festival gifts are all occasions where kitchen and home accessories sell in volume.</p>
<h2>Getting Started</h2>
<p>Browse InfixMart's Home & Kitchen category for wholesale-priced products with strong resale potential. Start with 5–10 items, test what sells in your network, and build from there.</p>`,
  },
];

async function run() {
  const pool = await getMysqlPool();
  let inserted = 0;
  let skipped = 0;

  for (const blog of BLOGS) {
    const slug = toSlug(blog.title);
    const [rows] = await pool.execute("SELECT id FROM Blogs WHERE slug = ?", [slug]);
    if (rows.length > 0) {
      console.log(`  SKIP  "${blog.title}" (slug already exists)`);
      skipped++;
      continue;
    }

    await pool.execute(
      `INSERT INTO Blogs (title, slug, excerpt, content, image, author, published, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [blog.title, slug, blog.excerpt, blog.content, "", "InfixMart Team", 1]
    );
    console.log(`  INSERT "${blog.title}"`);
    inserted++;
  }

  console.log(`\nDone — ${inserted} inserted, ${skipped} skipped.`);
  await pool.end();
}

run().catch((err) => { console.error(err); process.exit(1); });
