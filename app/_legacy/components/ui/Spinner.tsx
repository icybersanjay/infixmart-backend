interface SpinnerProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

// Lightweight spinner replacing MUI CircularProgress.
// Usage: <Spinner size={14} className="text-white" />
export default function Spinner({ size = 16, className = "", strokeWidth = 2 }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth={strokeWidth} />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
