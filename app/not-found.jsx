import Link from "next/link";

export const metadata = {
  title: "Page Not Found | InfixMart Wholesale",
  robots: {
    index: false,
    follow: false,
  },
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "2rem",
  background: "#F5F5F5",
  textAlign: "center",
};

const buttonBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "180px",
  padding: "0.75rem 1.75rem",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: "0.95rem",
  textDecoration: "none",
};

export default function NotFound() {
  return (
    <main style={pageStyle}>
      <div
        style={{
          fontSize: "6rem",
          fontWeight: 800,
          color: "#1565C0",
          lineHeight: 1,
          letterSpacing: "-4px",
        }}
      >
        404
      </div>

      <h1
        style={{
          margin: "1rem 0 0.5rem",
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "#1A237E",
        }}
      >
        Oops! Page not found
      </h1>

      <p
        style={{
          maxWidth: 400,
          marginBottom: "2rem",
          color: "#666",
          fontSize: "0.95rem",
          lineHeight: 1.6,
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/"
          style={{
            ...buttonBaseStyle,
            background: "#1565C0",
            color: "#fff",
            border: "none",
          }}
        >
          Go Home
        </Link>

        <Link
          href="/productListing"
          style={{
            ...buttonBaseStyle,
            background: "transparent",
            color: "#1565C0",
            border: "2px solid #1565C0",
          }}
        >
          Browse Products
        </Link>
      </div>
    </main>
  );
}
