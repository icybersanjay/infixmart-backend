"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_KEY, readConsent, setConsent } from "../../utils/analytics";

/**
 * Bottom-of-screen cookie consent banner. First visit shows it; the user's
 * choice (granted/denied) is persisted to localStorage and re-applied on
 * subsequent visits without showing the banner again.
 *
 * GA4 Consent Mode v2 picks up the choice via setConsent() in the helper.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = readConsent();
    // Show banner only when no decision has been recorded yet.
    if (!current) {
      setVisible(true);
      return;
    }
    // If user previously chose, ensure GA4 reflects it on each load.
    setConsent(current === "granted" ? "granted" : "denied");

    // Detect a fresh "no value" via storage probe — readConsent treats
    // missing as "denied" but we want the banner to show on a fresh browser.
    try {
      if (window.localStorage.getItem(CONSENT_KEY) == null) {
        setVisible(true);
      }
    } catch {}
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsent("granted");
    setVisible(false);
  };

  const handleReject = () => {
    setConsent("denied");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[60] px-3 sm:px-6 pb-3 sm:pb-5 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl bg-white border border-gray-100 rounded-2xl shadow-2xl px-4 sm:px-5 py-4 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="text-[20px] flex-shrink-0">🍪</div>
        <div className="text-[12.5px] sm:text-[13px] text-gray-700 leading-relaxed flex-1 min-w-0">
          We use cookies to keep the site working and, with your permission, to understand how visitors use it (Google Analytics + Meta Pixel).{" "}
          <Link href="/privacy-policy" className="text-[#1565C0] font-[600] hover:underline">
            Privacy policy
          </Link>
          .
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 sm:flex-none h-9 px-4 text-[12px] font-[600] text-gray-600 hover:text-gray-800 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 sm:flex-none h-9 px-4 text-[12px] font-[700] text-white bg-[#1565C0] hover:bg-[#0D47A1] rounded-lg transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
