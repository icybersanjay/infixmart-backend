import { fileURLToPath } from "url";

const reactRouterCompatPath = fileURLToPath(
  new URL("./app/_legacy/compat/react-router-dom.js", import.meta.url)
);
const isProduction = process.env.NODE_ENV === "production";
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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://apis.google.com https://accounts.google.com",
        "connect-src 'self' https: ws: wss:",
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

  webpack(config, { webpack }) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-router-dom": reactRouterCompatPath,
    };

    config.plugins.push(
      new webpack.DefinePlugin({
        "import.meta.env.VITE_API_URL": JSON.stringify(
          process.env.NEXT_PUBLIC_API_URL || ""
        ),
        "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(
          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
        ),
        "import.meta.env.VITE_RAZORPAY_KEY_ID": JSON.stringify(
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
        ),
        "import.meta.env.VITE_SITE_NAME": JSON.stringify(
          process.env.NEXT_PUBLIC_SITE_NAME || "InfixMart Wholesale"
        ),
        "import.meta.env.VITE_SITE_URL": JSON.stringify(
          process.env.NEXT_PUBLIC_SITE_URL || ""
        ),
      })
    );

    return config;
  },

  output: "standalone",

  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/mysql2/**/*"],
  },

  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
