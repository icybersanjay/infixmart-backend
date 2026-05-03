import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * EmptyState — consistent empty-state UI used throughout the app.
 */
const EmptyState = ({ icon, title, subtitle, actionLabel, onAction, className = '' }: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
  >
    {icon && (
      <div style={{ fontSize: 64, color: '#d1d5db', marginBottom: '1rem', lineHeight: 1 }}>
        {icon}
      </div>
    )}
    {title && (
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.4rem' }}>
        {title}
      </h3>
    )}
    {subtitle && (
      <p
        style={{
          fontSize: '0.875rem',
          color: '#9ca3af',
          maxWidth: 340,
          lineHeight: 1.6,
          marginBottom: actionLabel ? '1.5rem' : 0,
        }}
      >
        {subtitle}
      </p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        style={{
          padding: '0.6rem 1.5rem',
          background: '#1565C0',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
