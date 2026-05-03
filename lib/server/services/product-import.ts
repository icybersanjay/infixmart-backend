import { HttpError } from "../api/http.js";
import { sanitizeRichText } from "../content/html.js";
import {
  createProduct,
  findProductBySku,
  updateProduct,
  type ProductPayload,
} from "../repositories/products.js";

/**
 * Minimal CSV parser tailored to admin import. Supports double-quoted fields
 * (with escaped "" for embedded quotes), commas in quoted fields, CRLF/LF
 * line endings.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'; i += 2; continue;
      }
      if (ch === '"') { inQuotes = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  while (rows.length > 0 && rows[rows.length - 1].every((c) => String(c).trim() === "")) rows.pop();
  return rows;
}

const REQUIRED_COLUMNS = ["name", "price"] as const;
export const ALL_COLUMNS = [
  "name", "slug", "sku", "status", "description", "brand",
  "price", "oldprice", "discount", "category", "subCategory", "thirdSubCategory",
  "countInStock", "rating", "isFeatured", "reorderThreshold",
  "image1", "image2", "image3", "image4", "image5",
  "videoUrl", "saleEndsAt",
] as const;

function normalizeHeader(h: unknown): string {
  return String(h || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name", productname: "name", title: "name",
  slug: "slug",
  sku: "sku", code: "sku",
  status: "status",
  description: "description", desc: "description",
  brand: "brand",
  price: "price", sellprice: "price", sellingprice: "price", finalprice: "price",
  oldprice: "oldprice", mrp: "oldprice", mrpprice: "oldprice", listprice: "oldprice",
  discount: "discount", discountpercent: "discount", off: "discount",
  category: "category", catname: "category",
  subcategory: "subCategory", subcat: "subCategory",
  thirdsubcategory: "thirdSubCategory",
  countinstock: "countInStock", stock: "countInStock", quantity: "countInStock", qty: "countInStock",
  rating: "rating",
  isfeatured: "isFeatured", featured: "isFeatured",
  reorderthreshold: "reorderThreshold", reorderlevel: "reorderThreshold", lowstockthreshold: "reorderThreshold",
  image: "image1", image1: "image1", imageurl: "image1", imageurl1: "image1",
  image2: "image2", image3: "image3", image4: "image4", image5: "image5",
  videourl: "videoUrl", video: "videoUrl",
  saleendsat: "saleEndsAt",
};

function parseTruthy(value: unknown): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
}

function buildPayload(row: string[], header: string[]): ProductPayload {
  const get = (name: string): string | undefined => {
    const idx = header.indexOf(name);
    if (idx < 0) return undefined;
    const v = row[idx];
    if (v === undefined) return undefined;
    return String(v).trim();
  };

  const images = [
    get("image1"), get("image2"), get("image3"), get("image4"), get("image5"),
  ].filter((u): u is string => Boolean(u && u.length > 0));

  const status = (get("status") || "active").toLowerCase();
  const validStatus = (["draft", "active", "archived"].includes(status) ? status : "active") as "draft" | "active" | "archived";

  return {
    name:              get("name"),
    slug:              get("slug") || undefined,
    sku:               get("sku") || undefined,
    status:            validStatus,
    description:       sanitizeRichText(get("description") || ""),
    brand:             get("brand") || null,
    price:             Number(get("price") || 0),
    oldprice:          Number(get("oldprice") || 0),
    discount:          Number(get("discount") || 0),
    catName:           get("category") || null,
    subCat:            get("subCategory") || null,
    thirdSubCat:       get("thirdSubCategory") || null,
    countInStock:      Number(get("countInStock") || 0),
    rating:            Number(get("rating") || 0),
    isFeatured:        parseTruthy(get("isFeatured")),
    reorderThreshold:  Number(get("reorderThreshold") || 5),
    images,
    videoUrl:          get("videoUrl") || null,
    saleEndsAt:        get("saleEndsAt") || null,
    productRam:        [],
    size:              [],
    productWeight:     [],
  };
}

export interface ImportProductsCsvResult {
  success: true;
  error: false;
  dryRun: boolean;
  rowCount: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ line: number; error: string }>;
  previews: Array<{
    line: number;
    action: "create" | "update";
    name: string;
    sku: string;
    price: number;
    status: string;
    countInStock: number;
  }>;
  expectedColumns: ReadonlyArray<string>;
}

export async function importProductsCsv(
  csvText: string,
  { dryRun = true }: { dryRun?: boolean } = {}
): Promise<ImportProductsCsvResult> {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new HttpError(400, "Empty CSV.");
  }
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new HttpError(400, "CSV had no rows.");
  }

  const headerRaw = rows[0].map(normalizeHeader);
  const header = headerRaw.map((h) => HEADER_ALIASES[h] || h);
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    throw new HttpError(400, `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
  }

  const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));

  let created = 0;
  let updated = 0;
  const errors: Array<{ line: number; error: string }> = [];
  const previews: ImportProductsCsvResult["previews"] = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const lineNum = idx + 2;
    const row = dataRows[idx];
    try {
      const payload = buildPayload(row, header);
      if (!payload.name) {
        errors.push({ line: lineNum, error: "Missing name" });
        continue;
      }
      if (!Number.isFinite(payload.price) || (payload.price as number) < 0) {
        errors.push({ line: lineNum, error: "Invalid price" });
        continue;
      }

      let existing = null;
      if (payload.sku) {
        const sku = String(payload.sku).trim().toUpperCase().replace(/\s+/g, "-");
        existing = await findProductBySku(sku);
        payload.sku = sku;
      }

      if (dryRun) {
        previews.push({
          line: lineNum,
          action: existing ? "update" : "create",
          name: payload.name as string,
          sku: payload.sku || "(auto)",
          price: payload.price as number,
          status: payload.status as string,
          countInStock: payload.countInStock as number,
        });
        continue;
      }

      if (existing) {
        await updateProduct(existing.id, payload);
        updated++;
      } else {
        if (!payload.sku) {
          payload.sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
        }
        await createProduct(payload);
        created++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ line: lineNum, error: message });
    }
  }

  return {
    success: true as const,
    error: false as const,
    dryRun,
    rowCount: dataRows.length,
    created: dryRun ? 0 : created,
    updated: dryRun ? 0 : updated,
    skipped: errors.length,
    errors,
    previews: dryRun ? previews : [],
    expectedColumns: ALL_COLUMNS,
  };
}

export function buildSampleCsv(): string {
  const sample = [
    ALL_COLUMNS.join(","),
    [
      `"InfixMart Cotton T-Shirt"`, "", "TSHIRT-COT-001", "active",
      `"Soft 100% cotton, ideal for daily wear."`, "InfixMart",
      "299", "499", "40", "Apparel", "T-Shirts", "",
      "120", "4.5", "true", "10",
      "https://example.com/img1.jpg", "", "", "", "",
      "", "",
    ].join(","),
  ];
  return sample.join("\n") + "\n";
}
