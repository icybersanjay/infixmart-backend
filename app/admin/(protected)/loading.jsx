export default function AdminLoading() {
  return (
    <div style={{ padding: "2rem", minHeight: "60vh" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sk { background: linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 50%,#e8e8e8 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>

      {/* Page title */}
      <div className="sk" style={{ height: 28, width: 200, marginBottom: 24 }} />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 100 }} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="sk" style={{ height: 48, marginBottom: 8 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="sk" style={{ height: 52, marginBottom: 8, opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}
