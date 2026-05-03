import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Base Skeleton component — animated shimmer placeholder.
 * Visual language is owned by `.skeleton-pulse` in app/globals.css so every
 * skeleton in the app shares the same shimmer.
 */
const Skeleton = ({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  className = '',
  style = {},
}: SkeletonProps) => (
  <div
    className={`skeleton-pulse ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
  />
);

export default Skeleton;
