"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "../utils/analytics";

export default function AnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";

  useEffect(() => {
    const path = `${pathname || window.location.pathname}${search ? `?${search}` : ""}`;
    trackPageView(path);
  }, [pathname, search]);

  useEffect(() => {
    const handleConsent = (event) => {
      if (event?.detail?.value === "granted") {
        trackPageView();
      }
    };

    window.addEventListener("infix:consent", handleConsent);
    return () => window.removeEventListener("infix:consent", handleConsent);
  }, []);

  return null;
}
