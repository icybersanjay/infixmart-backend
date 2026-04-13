"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/admin/login", { email, password }, { withCredentials: true });
      const data = res.data;

      if (!data.success) {
        setError(data.message || "Invalid credentials");
        return;
      }

      router.push("/admin/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1A237E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 400,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          padding: "2.5rem 2rem",
        }}
      >
        <h1
          style={{
            color: "#1565C0",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "1.6rem",
            marginBottom: "0.25rem",
          }}
        >
          InfixMart Admin
        </h1>
        <p style={{ textAlign: "center", color: "#666", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
          Sign in to your admin account
        </p>

        {error && (
          <div
            style={{
              background: "#FFEBEE",
              border: "1px solid #FFCDD2",
              color: "#E53935",
              borderRadius: 6,
              padding: "0.65rem 0.875rem",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.875rem", fontWeight: 500, color: "#333" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@infixmart.com"
            style={{
              width: "100%",
              padding: "0.65rem 0.875rem",
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: "0.9rem",
              marginBottom: "1rem",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
            onBlur={(e) => (e.target.style.borderColor = "#ddd")}
          />

          <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.875rem", fontWeight: 500, color: "#333" }}>
            Password
          </label>
          <div style={{ position: "relative", marginBottom: "1.5rem" }}>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.65rem 2.5rem 0.65rem 0.875rem",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
              onBlur={(e) => (e.target.style.borderColor = "#ddd")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#666",
                fontSize: "1.1rem",
                lineHeight: 1,
              }}
            >
              {showPwd ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: loading ? "#90CAF9" : "#1565C0",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
