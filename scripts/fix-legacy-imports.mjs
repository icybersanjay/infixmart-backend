/**
 * Fixes legacy Vite/React-Router imports in app/_legacy/ for Next.js compatibility.
 * Run: node scripts/fix-legacy-imports.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = new URL('..', import.meta.url).pathname
  .replace(/^\/([A-Z]:)/, '$1')
  .replace(/%20/g, ' ');
const LEGACY_DIR = join(ROOT, 'app', '_legacy');

function getAllFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...getAllFiles(full));
    else if (['.js', '.jsx', '.ts', '.tsx'].includes(extname(full))) results.push(full);
  }
  return results;
}

const files = getAllFiles(LEGACY_DIR);
let totalFixed = 0;

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const original = src;

  // ── 1. Remove react-router-dom Link import, add next/link ──────────────────
  // Pattern: import { Link } from 'react-router-dom' (may be combined with other hooks)
  // We'll handle each combination

  // Pure Link only
  src = src.replace(/import\s*\{\s*Link\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\n`);

  // Link + useNavigate
  src = src.replace(/import\s*\{\s*Link\s*,\s*useNavigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter } from 'next/navigation';\n`);
  src = src.replace(/import\s*\{\s*useNavigate\s*,\s*Link\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter } from 'next/navigation';\n`);

  // Link + useNavigate + useSearchParams
  src = src.replace(/import\s*\{\s*Link\s*,\s*useNavigate\s*,\s*useSearchParams\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, useSearchParams } from 'next/navigation';\n`);

  // Link + useSearchParams
  src = src.replace(/import\s*\{\s*Link\s*,\s*useSearchParams\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useSearchParams } from 'next/navigation';\n`);

  // Link + useParams + useNavigate
  src = src.replace(/import\s*\{\s*Link\s*,\s*useParams\s*,\s*useNavigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, useParams } from 'next/navigation';\n`);
  src = src.replace(/import\s*\{\s*Link\s*,\s*useNavigate\s*,\s*useParams\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, useParams } from 'next/navigation';\n`);

  // Link + useLocation + useNavigate
  src = src.replace(/import\s*\{\s*Link\s*,\s*useLocation\s*,\s*useNavigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, usePathname } from 'next/navigation';\n`);
  src = src.replace(/import\s*\{\s*Link\s*,\s*useNavigate\s*,\s*useLocation\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, usePathname } from 'next/navigation';\n`);

  // Link + useLocation
  src = src.replace(/import\s*\{\s*Link\s*,\s*useLocation\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { usePathname } from 'next/navigation';\n`);
  src = src.replace(/import\s*\{\s*useLocation\s*,\s*Link\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { usePathname } from 'next/navigation';\n`);

  // useNavigate only
  src = src.replace(/import\s*\{\s*useNavigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import { useRouter } from 'next/navigation';\n`);

  // useSearchParams + useNavigate, useNavigate + useSearchParams
  src = src.replace(/import\s*\{\s*useNavigate\s*,\s*useSearchParams\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import { useRouter, useSearchParams } from 'next/navigation';\n`);
  src = src.replace(/import\s*\{\s*useSearchParams\s*,\s*useNavigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import { useRouter, useSearchParams } from 'next/navigation';\n`);

  // useSearchParams + Link + useNavigate (ForgotPassword)
  src = src.replace(/import\s*\{\s*Link\s*,\s*useNavigate\s*,\s*useSearchParams\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, useSearchParams } from 'next/navigation';\n`);

  // Navigate (redirect component)
  src = src.replace(/import\s*\{\s*Navigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import { useRouter } from 'next/navigation';\n`);

  // NavLink → use Link + usePathname for active state
  src = src.replace(/import\s*\{\s*NavLink\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { usePathname } from 'next/navigation';\n`);
  src = src.replace(/import\s*\{\s*NavLink\s*,\s*useLocation\s*,\s*useNavigate\s*\}\s*from\s*['"]react-router-dom['"]\s*;?\n/g,
    `import Link from 'next/link';\nimport { useRouter, usePathname } from 'next/navigation';\n`);

  // ── 2. Catch-all: remaining react-router-dom imports ───────────────────────
  // Any remaining react-router-dom import - log them
  if (src.includes('react-router-dom')) {
    console.warn(`  ⚠️  Remaining react-router-dom in: ${file.replace(ROOT, '')}`);
  }

  // ── 3. Hook replacements ───────────────────────────────────────────────────
  // useNavigate → useRouter
  src = src.replace(/const\s+navigate\s*=\s*useNavigate\(\)\s*;/g, 'const router = useRouter();');
  // navigate('/path') → router.push('/path')
  src = src.replace(/\bnavigate\(([^,)]+)\)/g, 'router.push($1)');
  // navigate('/path', { replace: true }) → router.replace('/path')
  src = src.replace(/\bnavigate\(([^,)]+),\s*\{\s*replace\s*:\s*true\s*\}\)/g, 'router.replace($1)');

  // useLocation → usePathname
  src = src.replace(/const\s+\{\s*pathname\s*\}\s*=\s*useLocation\(\)\s*;/g, 'const pathname = usePathname();');
  src = src.replace(/const\s+location\s*=\s*useLocation\(\)\s*;/g, 'const pathname = usePathname();');

  // useSearchParams (React Router returns tuple, Next.js returns object)
  // React Router: const [searchParams, setSearchParams] = useSearchParams();
  // Next.js: const searchParams = useSearchParams();
  src = src.replace(/const\s+\[\s*searchParams\s*,\s*\w+\s*\]\s*=\s*useSearchParams\(\)\s*;/g,
    'const searchParams = useSearchParams();');

  // ── 4. JSX prop: to= → href= on Link components ────────────────────────────
  // Replace to={...} and to="..." on Link tags
  // This is a bit tricky - we need to only replace 'to' on Link/NavLink components
  // Simple approach: replace all ' to=' → ' href=' which works for Link components
  src = src.replace(/ to=\{([^}]+)\}/g, ' href={$1}');
  src = src.replace(/ to="([^"]+)"/g, ' href="$1"');
  src = src.replace(/ to='([^']+)'/g, " href='$1'");

  // NavLink → Link (component name replacement)
  src = src.replace(/<NavLink\b/g, '<Link');
  src = src.replace(/<\/NavLink>/g, '</Link>');
  // NavLink has activeClassName/style - these need manual fixes, warn about them
  if (src.includes('isActive')) {
    console.warn(`  ⚠️  isActive pattern in NavLink needs manual fix: ${file.replace(ROOT, '')}`);
  }

  // Navigate component → null with useEffect redirect (handled manually)
  // <Navigate to="/path" replace /> → already handled via useRouter in components

  // ── 5. import.meta.env replacements ────────────────────────────────────────
  src = src.replace(/import\.meta\.env\.VITE_GOOGLE_CLIENT_ID/g,
    'process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  src = src.replace(/import\.meta\.env\.VITE_RAZORPAY_KEY_ID/g,
    'process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID');
  src = src.replace(/import\.meta\.env\.VITE_SITE_NAME/g,
    'process.env.NEXT_PUBLIC_SITE_NAME');
  src = src.replace(/import\.meta\.env\.VITE_SITE_URL/g,
    'process.env.NEXT_PUBLIC_SITE_URL');
  src = src.replace(/import\.meta\.env\.VITE_API_URL/g, '""');

  // ── 6. Write back if changed ───────────────────────────────────────────────
  if (src !== original) {
    writeFileSync(file, src, 'utf8');
    totalFixed++;
    console.log(`  ✓ Fixed: ${file.replace(ROOT, '')}`);
  }
}

console.log(`\nDone. Fixed ${totalFixed} files.`);
