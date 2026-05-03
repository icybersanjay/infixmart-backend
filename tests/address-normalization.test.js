import { describe, it, expect } from "vitest";
import {
  buildCanonicalAddress,
  normalizeShippingAddressInput,
} from "../lib/server/services/orders.js";

// Guards the canonical-address shape that the admin order panel, the customer
// /track page, the printable invoice, and the email/SMS templates all read.
// If any of these fields disappear from the canonical output, callers downstream
// will silently render blank lines.
const CANONICAL_KEYS = [
  "name", "mobile", "flatHouse", "areaStreet", "landmark", "townCity",
  "state", "pincode", "country",
];
const LEGACY_KEYS = ["phone", "address", "city", "postalCode"];

describe("buildCanonicalAddress", () => {
  it("emits every canonical field plus legacy aliases", () => {
    const out = buildCanonicalAddress({
      name: "Asha Iyer",
      mobile: "9876543210",
      flatHouse: "Flat 12B",
      areaStreet: "MG Road",
      landmark: "Near Ganesh Temple",
      townCity: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      country: "India",
    });
    for (const k of CANONICAL_KEYS) expect(out).toHaveProperty(k);
    for (const k of LEGACY_KEYS) expect(out).toHaveProperty(k);
  });

  it("composes the legacy `address` line from flatHouse + areaStreet + landmark", () => {
    const out = buildCanonicalAddress({
      name: "X",
      mobile: "9999999999",
      flatHouse: "Flat 12B",
      areaStreet: "MG Road",
      landmark: "Near Temple",
      townCity: "Mumbai",
      state: "MH",
      pincode: "400001",
    });
    expect(out.address).toBe("Flat 12B, MG Road, Near Temple");
  });

  it("omits landmark from the composed line when not provided", () => {
    const out = buildCanonicalAddress({
      name: "X",
      mobile: "9999999999",
      flatHouse: "Flat 12B",
      areaStreet: "MG Road",
      townCity: "Mumbai",
      state: "MH",
      pincode: "400001",
    });
    expect(out.address).toBe("Flat 12B, MG Road");
  });

  it("mirrors mobile→phone, townCity→city, pincode→postalCode for legacy readers", () => {
    const out = buildCanonicalAddress({
      name: "X",
      mobile: "9876543210",
      flatHouse: "F",
      areaStreet: "S",
      townCity: "Pune",
      state: "MH",
      pincode: "411001",
    });
    expect(out.phone).toBe("9876543210");
    expect(out.city).toBe("Pune");
    expect(out.postalCode).toBe("411001");
  });

  it("trims surrounding whitespace from every field", () => {
    const out = buildCanonicalAddress({
      name: "  Asha  ",
      mobile: " 9876543210 ",
      flatHouse: " Flat 12B  ",
      areaStreet: "  MG Road",
      landmark: "  Near Temple  ",
      townCity: " Mumbai ",
      state: "  Maharashtra ",
      pincode: " 400001 ",
      country: "  India",
    });
    expect(out.name).toBe("Asha");
    expect(out.mobile).toBe("9876543210");
    expect(out.flatHouse).toBe("Flat 12B");
    expect(out.areaStreet).toBe("MG Road");
    expect(out.landmark).toBe("Near Temple");
    expect(out.townCity).toBe("Mumbai");
    expect(out.state).toBe("Maharashtra");
    expect(out.pincode).toBe("400001");
    expect(out.country).toBe("India");
  });

  it("defaults country to 'India' when missing or blank", () => {
    expect(buildCanonicalAddress({}).country).toBe("India");
    expect(buildCanonicalAddress({ country: "" }).country).toBe("India");
    expect(buildCanonicalAddress({ country: "  " }).country).toBe("India");
  });
});

describe("normalizeShippingAddressInput", () => {
  const VALID_CANONICAL = {
    name: "Asha",
    mobile: "9876543210",
    flatHouse: "Flat 12B",
    areaStreet: "MG Road",
    townCity: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
  };

  it("accepts the canonical input shape", () => {
    const out = normalizeShippingAddressInput(VALID_CANONICAL);
    expect(out.name).toBe("Asha");
    expect(out.flatHouse).toBe("Flat 12B");
    expect(out.address).toBe("Flat 12B, MG Road");
  });

  it("accepts the legacy inline-checkout shape (fullName/phone/addressLine/city/postalCode)", () => {
    const out = normalizeShippingAddressInput({
      fullName: "Ravi",
      phone: "9000000000",
      addressLine: "B-204",
      city: "Pune",
      state: "MH",
      postalCode: "411001",
    });
    expect(out.name).toBe("Ravi");
    expect(out.mobile).toBe("9000000000");
    expect(out.flatHouse).toBe("B-204");
    expect(out.townCity).toBe("Pune");
    expect(out.pincode).toBe("411001");
  });

  it("throws when any required field is missing", () => {
    const required = ["name", "mobile", "flatHouse", "townCity", "state", "pincode"];
    for (const key of required) {
      const incomplete = { ...VALID_CANONICAL, [key]: "" };
      expect(() => normalizeShippingAddressInput(incomplete)).toThrow(/incomplete|required/i);
    }
  });

  it("throws when payload is not an object", () => {
    expect(() => normalizeShippingAddressInput(null)).toThrow(/required/i);
    expect(() => normalizeShippingAddressInput("not an object")).toThrow(/required/i);
    expect(() => normalizeShippingAddressInput(undefined)).toThrow(/required/i);
  });
});
