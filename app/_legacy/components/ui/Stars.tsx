import type { MouseEvent } from "react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

const SIZE_PX = { small: 14, medium: 18, large: 22 };

type StarSize = keyof typeof SIZE_PX | number;

interface StarsProps {
  value?: number;
  defaultValue?: number;
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: number) => void;
  readOnly?: boolean;
  precision?: number;
  size?: StarSize;
  name?: string;
  className?: string;
}

// Drop-in replacement for MUI <Rating>.
// - Read-only by default. Pass `onChange={(_, value) => ...}` for an interactive version.
// - `precision={0.5}` enables half-stars on display (read-only only — interactive picks integers).
export default function Stars({
  value = 0,
  defaultValue = 0,
  onChange,
  readOnly = false,
  precision = 1,
  size = "small",
  name,
  className = "",
}: StarsProps) {
  const v = Number(value || defaultValue || 0);
  const px = typeof size === "number" ? size : SIZE_PX[size as keyof typeof SIZE_PX] || 14;
  const filled = Math.floor(v);
  const half = precision !== 1 && v - filled >= 0.4;
  const interactive = !readOnly && typeof onChange === "function";

  if (interactive) {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className}`} role="radiogroup" aria-label={name || "Rating"}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => onChange!(e, i)}
            className="transition-colors"
            style={{ color: i <= v ? "#facc15" : "#e5e7eb", lineHeight: 0 }}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
          >
            <FaStar size={px} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${v} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= filled) return <FaStar key={i} size={px} style={{ color: "#facc15" }} />;
        if (i === filled + 1 && half) return <FaStarHalfAlt key={i} size={px} style={{ color: "#facc15" }} />;
        return <FaRegStar key={i} size={px} style={{ color: "#e5e7eb" }} />;
      })}
    </span>
  );
}
