import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
    },
    {
      urlPattern: /\/api\/product($|\?)/,
      handler: "NetworkFirst",
      options: { cacheName: "api-products", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
    },
    {
      urlPattern: /\/uploads\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "uploads", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 } },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "next-static", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 } },
    },
  ],
});

const isProduction = process.env.NODE_ENV === "production";
const distDir = isProduction ? ".next" : ".next-dev";
const contentSecurityPolicy =
  process.env.CONTENT_SECURITY_POLICY ||
  (isProduction
    ? [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // 'unsafe-inline' kept because Next.js injects inline bootstrap scripts
        // without a CSP nonce. 'unsafe-eval' deliberately omitted — only needed
        // for dev HMR; Razorpay/Google/Workbox don't use eval in production.
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://apis.google.com https://accounts.google.com",
        // ws: only used by Next dev-server HMR, so keep prod to wss: only.
        "connect-src 'self' https: wss:",
        "frame-src 'self' https://*.razorpay.com https://accounts.google.com",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "upgrade-insecure-requests",
      ].join("; ")
    : "");
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
  ...(contentSecurityPolicy
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
];

const nextConfig = {
  distDir,

  serverExternalPackages: [
    "mysql2",
    "sharp",
    "nodemailer",
    "razorpay",
  ],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: baseSecurityHeaders,
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/mysql2/**/*"],
  },

  compress: true,
  poweredByHeader: false,
};

export default withPWA(nextConfig);
