export default function ProductDetailLoading() {
  return (
    <div style={{ minHeight: "60vh", padding: "1.5rem 1rem", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sk { background: linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 50%,#e8e8e8 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {/* Image panel */}
        <div style={{ flex: "0 0 420px" }}>
          <div className="sk" style={{ height: 420, marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="sk" style={{ width: 72, height: 72 }} />
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sk" style={{ height: 28, width: "70%" }} />
          <div className="sk" style={{ height: 20, width: "40%" }} />
          <div className="sk" style={{ height: 36, width: "30%" }} />
          <div className="sk" style={{ height: 16, width: "90%" }} />
          <div className="sk" style={{ height: 16, width: "80%" }} />
          <div className="sk" style={{ height: 16, width: "60%" }} />
          <div className="sk" style={{ height: 48, marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}
