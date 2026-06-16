"use client";

import { useEffect, useState, useContext } from "react";
import { MyContext } from "../../LegacyProviders.jsx";
import { setGranularConsent } from "../../utils/analytics";

// Native SHA-256 hashing helper using browser Web Crypto API
async function sha256(message) {
  if (!message) return "";
  try {
    const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    console.error("[DPDPAShield] Hashing error:", error);
    return "";
  }
}

export default function CookieConsent() {
  const context = useContext(MyContext) || {};
  const { userData, isLogin } = context;
  const [purposes, setPurposes] = useState([]);
  const [emailHash, setEmailHash] = useState("");

  const apiKey = process.env.NEXT_PUBLIC_DPDPA_API_KEY;
  const isDemo = !apiKey || apiKey === "dpdpa_live_your_public_key_here";

  // Compute if the logged in user is a child/minor under 18
  const isChild = (() => {
    if (!userData) return false;
    if (userData.childAccountId) return true;
    if (userData.dob) {
      const birthDate = new Date(userData.dob);
      if (isNaN(birthDate.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age < 18;
    }
    return false;
  })();

  // Set child user flag in local storage and force opt-out of optional tracking
  useEffect(() => {
    if (isChild) {
      try {
        window.localStorage.setItem("infix_is_child_user", "true");
      } catch {}
      setGranularConsent({ analytics: false, marketing: false });
    } else {
      try {
        window.localStorage.removeItem("infix_is_child_user");
      } catch {}
    }
  }, [isChild]);

  // 1. Fetch active notice purposes for dynamic GA4 mapping (skip for minors)
  useEffect(() => {
    if (isDemo || isChild) return;

    fetch(`https://api.dpdpashield.in/api/v1/consent/public-notice?apiKey=${apiKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.purposes) {
          setPurposes(json.data.purposes);
        }
      })
      .catch((err) => {
        console.error("[DPDPAShield] Failed to fetch notice purposes:", err);
      });
  }, [apiKey, isDemo, isChild]);

  // 2. Hash email client-side when user logs in (skip for minors)
  useEffect(() => {
    if (isChild) {
      setEmailHash("");
      return;
    }
    if (isLogin && userData?.email) {
      sha256(userData.email).then((hash) => {
        if (hash) setEmailHash(hash);
      });
    } else {
      setEmailHash("");
    }
  }, [isLogin, userData, isChild]);

  // 3. Initialize/update DPDPA Shield Consent Widget (skip for minors)
  useEffect(() => {
    if (isChild) return;
    let attempts = 0;

    function initWidget() {
      if (typeof window === "undefined") return;

      if (window.DPDPAShield) {
        window.DPDPAShield.init({
          apiKey: isDemo ? "demo" : apiKey,
          position: "bottom-left",
          demo: isDemo,
          identifierHash: emailHash || undefined,
          onConsent: function (result) {
            if (!result) return;
            console.log(
              "[DPDPAShield] Consent recorded:",
              result.consentRecordId,
              "lang:",
              result.language,
              "status:",
              result.status
            );

            // Handle Dynamic Mapping to GA4 Consent Mode v2 and Meta Pixel
            let analytics = false;
            let marketing = false;

            if (result.status === "ACCEPTED") {
              analytics = true;
              marketing = true;
            } else if (result.status === "REJECTED") {
              analytics = false;
              marketing = false;
            } else if (result.consents) {
              // PARTIAL consent status: map based on notice purposes
              Object.entries(result.consents).forEach(([purposeId, consented]) => {
                if (!consented) return;

                // Find purpose details from our fetched notice purposes
                const detail = purposes.find((p) => p.id === purposeId);
                if (detail) {
                  const name = (detail.name || "").toLowerCase();
                  const desc = (detail.description || "").toLowerCase();
                  const categories = (detail.dataCategories || []).map((c) =>
                    String(c).toLowerCase()
                  );

                  const isAnalyticsField =
                    name.includes("analytics") ||
                    name.includes("tracking") ||
                    desc.includes("analytics") ||
                    desc.includes("tracking") ||
                    categories.some(
                      (c) =>
                        c.includes("analytics") ||
                        c.includes("usage") ||
                        c.includes("device")
                    );

                  const isMarketingField =
                    name.includes("marketing") ||
                    name.includes("ads") ||
                    name.includes("advertise") ||
                    name.includes("promotion") ||
                    desc.includes("marketing") ||
                    desc.includes("ads") ||
                    desc.includes("advertise") ||
                    desc.includes("promotion") ||
                    categories.some(
                      (c) =>
                        c.includes("marketing") ||
                        c.includes("ads") ||
                        c.includes("ad_data")
                    );

                  if (isAnalyticsField) analytics = true;
                  if (isMarketingField) marketing = true;
                } else {
                  // Fallback if notice details haven't finished loading yet:
                  // treat any toggle as analytics/marketing
                  analytics = true;
                  marketing = true;
                }
              });
            }

            // Sync states to local storage and trigger GA4/Meta Pixel consent update
            setGranularConsent({ analytics, marketing });
          },
        });
      } else if (attempts < 50) {
        attempts++;
        setTimeout(initWidget, 100);
      }
    }

    initWidget();
  }, [apiKey, isDemo, emailHash, purposes]);

  return null;
}
