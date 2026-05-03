// Shared courier-name → tracking URL templates. Used by:
//   - Admin order panel (auto-fill button)
//   - Customer /track page (clickable link fallback)
//   - My Orders page
//   - Email / SMS / WhatsApp shipping notifications
//
// Adding a courier: append a {match, url} entry. {AWB} is replaced with the
// (URL-encoded) tracking number.

export const COURIER_URL_TEMPLATES = [
  { match: /delhivery/i,    url: "https://www.delhivery.com/track/package/{AWB}" },
  { match: /blue\s*dart/i,  url: "https://www.bluedart.com/tracking?awb={AWB}" },
  { match: /shiprocket/i,   url: "https://shiprocket.co/tracking/{AWB}" },
  { match: /shadowfax/i,    url: "https://tracker.shadowfax.in/#/track/awb/{AWB}" },
  { match: /xpressbees/i,   url: "https://www.xpressbees.com/track?awbNo={AWB}" },
  { match: /ecom/i,         url: "https://ecomexpress.in/tracking/?awb_field={AWB}" },
  { match: /dtdc/i,         url: "https://www.dtdc.in/tracking.asp?strCnno={AWB}" },
  { match: /india\s*post/i, url: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?id={AWB}" },
  { match: /ekart/i,        url: "https://ekartlogistics.com/shipmenttrack/{AWB}" },
];

/**
 * Resolve a usable tracking URL from any combination of inputs.
 * Preference order: explicit `trackingUrl` → courier+AWB template → null.
 */
export function resolveTrackingUrl({ trackingUrl, courierName, trackingNumber } = {}) {
  if (trackingUrl) return String(trackingUrl).trim();
  if (!courierName || !trackingNumber) return null;
  const tpl = COURIER_URL_TEMPLATES.find((c) => c.match.test(courierName));
  if (!tpl) return null;
  return tpl.url.replace("{AWB}", encodeURIComponent(String(trackingNumber).trim()));
}
