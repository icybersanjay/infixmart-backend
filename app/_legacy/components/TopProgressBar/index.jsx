"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin top-of-page progress bar shown during route transitions.
 *
 * Trigger model:
 *   • Click on an internal <a href> → start.
 *   • `popstate` (back/forward) → start.
 *   • Pathname change → finish.
 *   • 8-second safety net → finish if pathname never changes.
 *
 * Visual lives in `app/globals.css` under `.infix-progress`.
 */
const SAFETY_TIMEOUT_MS = 8000;

export default function TopProgressBar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [state, setState] = useState("idle"); // 'idle' | 'loading' | 'done'

  const tickRef = useRef(null);
  const safetyRef = useRef(null);
  const stateRef = useRef("idle");
  const lastPathRef = useRef(typeof window !== "undefined" ? window.location.pathname : "");

  const stop = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  };

  const start = () => {
    if (stateRef.current === "loading") return;
    stateRef.current = "loading";
    setState("loading");
    setWidth(8);

    stop();
    tickRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 88) return w; // cap until completion
        const remain = 88 - w;
        return Math.min(88, w + Math.max(1, remain * 0.12));
      });
    }, 240);

    safetyRef.current = setTimeout(() => {
      finish();
    }, SAFETY_TIMEOUT_MS);
  };

  const finish = () => {
    if (stateRef.current === "idle") return;
    stop();
    stateRef.current = "done";
    setState("done");
    setWidth(100);
    setTimeout(() => {
      stateRef.current = "idle";
      setState("idle");
      setWidth(0);
    }, 320);
  };

  // Listen to internal-link clicks + back/forward.
  useEffect(() => {
    const onClick = (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      if (a.target === "_blank") return;
      if (a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("whatsapp:") ||
        href.startsWith("javascript:")
      ) return;
      let url;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same path + same search = no navigation.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    };

    const onPopState = () => start();

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      stop();
    };
  }, []);

  // Finish when the pathname changes (route render committed).
  useEffect(() => {
    if (pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      finish();
    }
  }, [pathname]);

  return (
    <div className="infix-progress" data-state={state} aria-hidden="true">
      <div className="infix-progress__bar" style={{ width: `${width}%` }} />
    </div>
  );
}
