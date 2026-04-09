export default function StoreLoading() {
  return (
    <div style={{ minHeight: "60vh", padding: "2rem 1rem" }}>
      {/* Hero banner skeleton */}
      <div
        style={{
          width: "100%",
          height: 340,
          background: "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
          borderRadius: 8,
          marginBottom: "2rem",
        }}
      />

      {/* Category row skeleton */}
      <div style={{ display: "flex", gap: 16, marginBottom: "2rem", overflowX: "hidden" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: "0 0 120px",
              height: 100,
              borderRadius: 8,
              background: "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }}
          />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{
                height: 180,
                background: "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                height: 16,
                width: "80%",
                borderRadius: 4,
                background: "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 14,
                width: "50%",
                borderRadius: 4,
                background: "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
