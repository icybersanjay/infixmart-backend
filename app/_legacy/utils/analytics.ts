"use client";

/**
 * Consent-aware analytics helper. All GA4 / Meta Pixel events flow through
 * here so consent is checked in one place and the call sites stay clean.
 */

const CONSENT_KEY = "infix_cookie_consent";

type ConsentState = "granted" | "denied";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __infixLastPageViewKey?: string;
    __infixPendingPageViewKey?: string;
  }
}

function readConsent(): ConsentState {
  if (typeof window === "undefined") return "denied";
  try {
    if (window.localStorage.getItem("infix_is_child_user") === "true") {
      return "denied";
    }
    const granular = window.localStorage.getItem("infix_cookie_consent_analytics");
    if (granular) return granular as ConsentState;
    return (window.localStorage.getItem(CONSENT_KEY) as ConsentState) || "denied";
  } catch {
    return "denied";
  }
}

function isConsentGranted(): boolean {
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem("infix_is_child_user") === "true") {
        return false;
      }
    } catch {}
  }
  return readConsent() === "granted";
}

function setGranularConsent(consents: { analytics: boolean; marketing: boolean }): void {
  if (typeof window === "undefined") return;

  let isChild = false;
  try {
    isChild = window.localStorage.getItem("infix_is_child_user") === "true";
  } catch {}

  const analyticsValue: ConsentState = (consents.analytics && !isChild) ? "granted" : "denied";
  const marketingValue: ConsentState = (consents.marketing && !isChild) ? "granted" : "denied";
  try {
    window.localStorage.setItem("infix_cookie_consent_analytics", analyticsValue);
    window.localStorage.setItem("infix_cookie_consent_marketing", marketingValue);
    window.localStorage.setItem(CONSENT_KEY, analyticsValue);
  } catch {}

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: analyticsValue,
      ad_storage: marketingValue,
      ad_user_data: marketingValue,
      ad_personalization: marketingValue,
    });
  }
  window.dispatchEvent(new CustomEvent("infix:consent", { detail: { value: analyticsValue } }));
}

function setConsent(state: ConsentState | string): void {
  if (typeof window === "undefined") return;
  const value: ConsentState = state === "granted" ? "granted" : "denied";
  setGranularConsent({ analytics: value === "granted", marketing: value === "granted" });
}

function getPageViewKey(path?: string): string {
  if (typeof window === "undefined") return "/";
  return path || `${window.location.pathname}${window.location.search}`;
}

function trackPageView(path?: string): void {
  if (typeof window === "undefined") return;
  if (!isConsentGranted()) return;

  const key = getPageViewKey(path);
  if (window.__infixLastPageViewKey === key) return;

  const send = (): boolean => {
    if (window.__infixLastPageViewKey === key) return true;

    const url = new URL(key, window.location.origin);
    let sent = false;

    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: `${url.pathname}${url.search}`,
        page_location: url.href,
        page_title: document.title,
      });
      sent = true;
    }

    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
      sent = true;
    }

    if (sent) {
      window.__infixLastPageViewKey = key;
      window.__infixPendingPageViewKey = undefined;
    }

    return sent;
  };

  if (send() || window.__infixPendingPageViewKey === key) return;

  window.__infixPendingPageViewKey = key;
  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (send()) return;
    if (attempts < 10 && window.__infixPendingPageViewKey === key) {
      window.setTimeout(retry, 300);
    }
  };
  window.setTimeout(retry, 300);
}

function gtagEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  if (!isConsentGranted()) return;
  try {
    window.gtag("event", name, params);
  } catch {}
}

function fbqEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  if (!isConsentGranted()) return;
  try {
    window.fbq("track", name, params);
  } catch {}
}

interface ProductLike {
  id: number | string;
  name?: string;
  brand?: string | null;
  catName?: string | null;
  price?: number | string;
}

function trackViewItem(product: ProductLike | null | undefined): void {
  if (!product) return;
  const item = {
    item_id: String(product.id),
    item_name: product.name || "Product",
    item_brand: product.brand || undefined,
    item_category: product.catName || undefined,
    price: Number(product.price || 0),
    currency: "INR",
  };
  gtagEvent("view_item", { currency: "INR", value: item.price, items: [item] });
  fbqEvent("ViewContent", {
    content_ids: [String(product.id)],
    content_type: "product",
    content_name: product.name,
    value: Number(product.price || 0),
    currency: "INR",
  });
}

function trackAddToCart(product: ProductLike | null | undefined, qty: number = 1): void {
  if (!product) return;
  const price = Number(product.price || 0);
  gtagEvent("add_to_cart", {
    currency: "INR",
    value: price * qty,
    items: [{
      item_id: String(product.id),
      item_name: product.name || "Product",
      item_brand: product.brand || undefined,
      item_category: product.catName || undefined,
      price,
      quantity: qty,
      currency: "INR",
    }],
  });
  fbqEvent("AddToCart", {
    content_ids: [String(product.id)],
    content_type: "product",
    content_name: product.name,
    value: price * qty,
    currency: "INR",
  });
}

interface CheckoutItem {
  productId?: number | string;
  id?: number | string;
  name?: string;
  price?: number | string;
  qty?: number;
  quantity?: number;
}

function trackBeginCheckout({
  items = [],
  totalValue = 0,
}: { items?: CheckoutItem[]; totalValue?: number } = {}): void {
  const ga4Items = items.map((i) => ({
    item_id: String(i.productId || i.id),
    item_name: i.name || "Product",
    price: Number(i.price || 0),
    quantity: Number(i.qty || i.quantity || 1),
    currency: "INR",
  }));
  gtagEvent("begin_checkout", { currency: "INR", value: totalValue, items: ga4Items });
  fbqEvent("InitiateCheckout", {
    content_ids: items.map((i) => String(i.productId || i.id)),
    content_type: "product",
    num_items: items.reduce((s, i) => s + Number(i.qty || i.quantity || 1), 0),
    value: totalValue,
    currency: "INR",
  });
}

function trackPurchase({
  orderId,
  totalValue = 0,
  items = [],
}: { orderId?: number | string; totalValue?: number; items?: CheckoutItem[] } = {}): void {
  const ga4Items = items.map((i) => ({
    item_id: String(i.productId || i.id),
    item_name: i.name || "Product",
    price: Number(i.price || 0),
    quantity: Number(i.qty || i.quantity || 1),
    currency: "INR",
  }));
  gtagEvent("purchase", {
    transaction_id: String(orderId || ""),
    currency: "INR",
    value: totalValue,
    items: ga4Items,
  });
  fbqEvent("Purchase", {
    content_ids: items.map((i) => String(i.productId || i.id)),
    content_type: "product",
    value: totalValue,
    currency: "INR",
  });
}

function trackSearch(searchTerm: string, resultCount?: number): void {
  if (!searchTerm) return;
  gtagEvent("search", { search_term: searchTerm });
  fbqEvent("Search", {
    search_string: searchTerm,
    content_ids: resultCount != null ? [String(resultCount)] : undefined,
  });
}

export {
  CONSENT_KEY,
  isConsentGranted,
  readConsent,
  setConsent,
  setGranularConsent,
  trackAddToCart,
  trackBeginCheckout,
  trackPageView,
  trackPurchase,
  trackSearch,
  trackViewItem,
};
