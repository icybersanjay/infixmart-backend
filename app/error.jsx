"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[InfixMart] Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        textAlign: "center",
        padding: "2rem",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      <div style={{ fontSize: "3rem" }}>😕</div>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>
        Something went wrong
      </h2>
      <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0, maxWidth: 400 }}>
        An unexpected error occurred. Please try again or refresh the page.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.6rem 1.4rem",
            background: "#1565C0",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            padding: "0.6rem 1.4rem",
            background: "transparent",
            color: "#1565C0",
            border: "2px solid #1565C0",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
