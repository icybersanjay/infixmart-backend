"use client";

import { forwardRef, useEffect, useMemo } from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

const isExternal = (to) => typeof to === "string" && /^(https?:)?\/\//i.test(to);

const normalizeTo = (to) => {
  if (typeof to === "string") return to;
  if (to && typeof to === "object") {
    const pathname = to.pathname || "";
    const search = to.search || "";
    const hash = to.hash || "";
    return `${pathname}${search}${hash}`;
  }
  return "/";
};

const buildSearchString = (value) => {
  if (value instanceof URLSearchParams) return value.toString();
  if (typeof value === "string") return value.replace(/^\?/, "");
  if (Array.isArray(value)) return new URLSearchParams(value).toString();
  if (value && typeof value === "object") {
    const params = new URLSearchParams();
    Object.entries(value).forEach(([key, entry]) => {
      if (entry == null || entry === "") return;
      if (Array.isArray(entry)) {
        entry.forEach((item) => params.append(key, String(item)));
      } else {
        params.set(key, String(entry));
      }
    });
    return params.toString();
  }
  return "";
};

const computeActive = (pathname, href, end = false) => {
  const targetPath = normalizeTo(href).split("?")[0].split("#")[0] || "/";
  if (end) return pathname === targetPath;
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

const Link = forwardRef(function Link({ to, href, replace, children, ...props }, ref) {
  const target = href ?? to;
  const finalHref = normalizeTo(target);

  if (isExternal(target)) {
    return (
      <a ref={ref} href={finalHref} {...props}>
        {children}
      </a>
    );
  }

  return (
    <NextLink ref={ref} href={finalHref} replace={replace} {...props}>
      {children}
    </NextLink>
  );
});

function NavLink({ to, end, className, style, children, ...props }) {
  const pathname = usePathname();
  const isActive = computeActive(pathname, to, end);
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
  const resolvedStyle = typeof style === "function" ? style({ isActive }) : style;

  return (
    <Link href={to} className={resolvedClassName} style={resolvedStyle} {...props}>
      {typeof children === "function" ? children({ isActive }) : children}
    </Link>
  );
}

function useNavigate() {
  const router = useRouter();

  return (to, options = {}) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }

    const finalHref = normalizeTo(to);
    if (options.replace) {
      router.replace(finalHref);
    } else {
      router.push(finalHref);
    }
  };
}

function useLocation() {
  const pathname = usePathname();
  const search = typeof window !== "undefined" ? window.location.search : "";
  const hash = typeof window !== "undefined" ? window.location.hash : "";

  return useMemo(
    () => ({
      pathname,
      search,
      hash,
      state: null,
      key: `${pathname}${search}${hash}`,
    }),
    [hash, pathname, search]
  );
}

function useSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const setSearchParams = (nextValue, options = {}) => {
    const resolvedValue = typeof nextValue === "function" ? nextValue(params) : nextValue;
    const nextSearch = buildSearchString(resolvedValue);
    const nextHref = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    if (options.replace) {
      router.replace(nextHref);
    } else {
      router.push(nextHref);
    }
  };

  return [params, setSearchParams];
}

function useParams() {
  return useNextParams();
}

function Navigate({ to, replace }) {
  const router = useRouter();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
}

function BrowserRouter({ children }) {
  return children;
}

function Outlet() {
  return null;
}

function Route() {
  return null;
}

function Routes({ children }) {
  return children;
}

export {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
};
