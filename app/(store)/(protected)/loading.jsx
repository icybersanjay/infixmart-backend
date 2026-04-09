export default function ProtectedPageLoading() {
  return (
    <div style={{ minHeight: "60vh", padding: "2rem 1rem", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sk { background: linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 50%,#e8e8e8 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>

      <div className="sk" style={{ height: 32, width: 200, marginBottom: 24 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="sk" style={{ height: 72, marginBottom: 12 }} />
      ))}
    </div>
  );
}
