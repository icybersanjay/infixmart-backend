import { fileURLToPath } from "url";

const reactRouterCompatPath = fileURLToPath(
  new URL("./app/_legacy/compat/react-router-dom.js", import.meta.url)
);

const nextConfig = {
  // ── Server-side packages that must run in Node.js runtime ─────────────────
  serverExternalPackages: [
    "express",
    "sequelize",
    "mysql2",
    "sharp",
    "multer",
    "nodemailer",
    "razorpay",
  ],

  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost" },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // ── Rewrites: serve /uploads/* from the Express static handler ─────────────
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },

  // ── Security & performance headers ────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
      {
        // Long-lived cache for uploaded images (served via /api/uploads)
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
      {
        // Long-lived cache for Next.js static assets
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // ── Webpack: react-router-dom compatibility shim ──────────────────────────
  webpack(config, { webpack }) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-router-dom": reactRouterCompatPath,
    };

    // Inject VITE_* env vars so legacy components using import.meta.env still work
    config.plugins.push(
      new webpack.DefinePlugin({
        "import.meta.env.VITE_API_URL":         JSON.stringify(process.env.NEXT_PUBLIC_API_URL        || "http://localhost:3000"),
        "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""),
        "import.meta.env.VITE_RAZORPAY_KEY_ID": JSON.stringify(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID  || ""),
        "import.meta.env.VITE_SITE_NAME":       JSON.stringify(process.env.NEXT_PUBLIC_SITE_NAME       || "InfixMart Wholesale"),
        "import.meta.env.VITE_SITE_URL":        JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL        || "http://localhost:3000"),
      })
    );

    return config;
  },

  // ── Standalone output for Hostinger deployment ────────────────────────────
  output: "standalone",

  // ── Limit build workers (prevents EAGAIN on shared hosting) ─────────────
  experimental: {
    cpus: 1,
  },

  // ── Compress responses ────────────────────────────────────────────────────
  compress: true,

  // ── Disable powered-by header ──────────────────────────────────────────────
  poweredByHeader: false,
};

export default nextConfig;
