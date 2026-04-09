"use client";

import { useEffect } from "react";

export default function ProtectedAdminError({ error, reset }) {
  useEffect(() => {
    console.error("[Protected Admin Error]", error);
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
        background: "#f5f6fa",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "2.5rem",
          maxWidth: 420,
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem", color: "#c0392b" }}>
          Admin Panel Error
        </h2>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          {error?.message || "An unexpected error occurred."}
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
    </div>
  );
}
