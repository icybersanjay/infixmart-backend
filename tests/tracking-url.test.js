import { describe, it, expect } from "vitest";
import { resolveTrackingUrl, COURIER_URL_TEMPLATES } from "../lib/shared/tracking-url.js";

describe("resolveTrackingUrl", () => {
  it("returns null when no inputs are usable", () => {
    expect(resolveTrackingUrl()).toBeNull();
    expect(resolveTrackingUrl({})).toBeNull();
    expect(resolveTrackingUrl({ courierName: "Delhivery" })).toBeNull();
    expect(resolveTrackingUrl({ trackingNumber: "12345" })).toBeNull();
  });

  it("prefers an explicit tracking URL over the courier+AWB template", () => {
    const out = resolveTrackingUrl({
      trackingUrl: "https://track.example.com/foo",
      courierName: "Delhivery",
      trackingNumber: "12345",
    });
    expect(out).toBe("https://track.example.com/foo");
  });

  it("trims whitespace around an explicit URL", () => {
    expect(
      resolveTrackingUrl({ trackingUrl: "  https://x.com/y  " })
    ).toBe("https://x.com/y");
  });

  it("builds a Delhivery URL from courier + AWB", () => {
    const out = resolveTrackingUrl({ courierName: "Delhivery", trackingNumber: "ABC123" });
    expect(out).toBe("https://www.delhivery.com/track/package/ABC123");
  });

  it("URL-encodes the AWB so special characters are safe", () => {
    const out = resolveTrackingUrl({ courierName: "Delhivery", trackingNumber: "AB C/123" });
    // %2F = '/', %20 = ' '
    expect(out).toBe("https://www.delhivery.com/track/package/AB%20C%2F123");
  });

  it("matches courier names case-insensitively and ignores extra whitespace", () => {
    expect(resolveTrackingUrl({ courierName: "BLUE DART", trackingNumber: "X" })).toContain("bluedart");
    expect(resolveTrackingUrl({ courierName: "blue dart", trackingNumber: "X" })).toContain("bluedart");
    expect(resolveTrackingUrl({ courierName: "BlueDart", trackingNumber: "X" })).toContain("bluedart");
    expect(resolveTrackingUrl({ courierName: "INDIA POST", trackingNumber: "X" })).toContain("indiapost");
  });

  it("returns null for an unknown courier", () => {
    expect(
      resolveTrackingUrl({ courierName: "MysteryCourier", trackingNumber: "12345" })
    ).toBeNull();
  });

  it("every template entry has a working {AWB} placeholder", () => {
    // Catches a typo where someone adds a courier but forgets the {AWB} token.
    for (const tpl of COURIER_URL_TEMPLATES) {
      expect(tpl.url).toMatch(/\{AWB\}/);
      expect(tpl.match).toBeInstanceOf(RegExp);
    }
  });
});
