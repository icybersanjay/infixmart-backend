import { useRouter } from 'next/navigation';
import SEO from '../components/SEO';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F5F5F5',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <SEO title='Page Not Found' noIndex />
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 800,
          color: '#1565C0',
          lineHeight: 1,
          letterSpacing: '-4px',
        }}
      >
        404
      </div>

      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 700,
          color: '#1A237E',
          margin: '1rem 0 0.5rem',
        }}
      >
        Oops! Page not found
      </h1>

      <p
        style={{
          color: '#888',
          fontSize: '0.95rem',
          maxWidth: 400,
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '0.75rem 1.75rem',
            background: '#1565C0',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
        <button
          onClick={() => router.push('/productListing')}
          style={{
            padding: '0.75rem 1.75rem',
            background: 'transparent',
            color: '#1565C0',
            border: '2px solid #1565C0',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Browse Products
        </button>
      </div>
    </div>
  );
}
