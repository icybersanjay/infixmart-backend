"use client";

import { useEffect } from "react";

export default function ProtectedStoreError({ error, reset }) {
  useEffect(() => {
    console.error("[Protected Store Error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "#666", marginBottom: "1.5rem", maxWidth: 400 }}>
        {error?.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.6rem 1.6rem",
          background: "#1565C0",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        Try again
      </button>
    </div>
  );
}
