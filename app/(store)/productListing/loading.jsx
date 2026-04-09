export default function ProductListingLoading() {
  return (
    <div style={{ minHeight: "60vh", padding: "1.5rem 1rem" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sk { background: linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 50%,#e8e8e8 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar skeleton */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="sk" style={{ height: 40 }} />
          ))}
        </div>

        {/* Grid skeleton */}
        <div style={{ flex: 1 }}>
          {/* Sort bar */}
          <div className="sk" style={{ height: 44, marginBottom: 16 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="sk" style={{ height: 200, marginBottom: 8 }} />
                <div className="sk" style={{ height: 16, width: "80%", marginBottom: 6 }} />
                <div className="sk" style={{ height: 14, width: "50%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
