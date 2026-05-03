import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import { writeAuditLog } from "../../../../lib/server/repositories/audit.js";
import {
  bulkDeleteProducts,
  bulkSetProductStatus,
  createProductRecord,
  deleteProductRecord,
  restoreProductRecord,
  getAllProducts,
  getCatalogFacets,
  getFeaturedProducts,
  getProductBrands,
  getProductByCategoryId,
  getProductByCategoryName,
  getProductByExactRating,
  getProductBySlugValue,
  getProductByPriceRange,
  getProductCount,
  getSingleProduct,
  getProductBySubCategoryId,
  getProductBySubCategoryName,
  getProductByThirdSubCategoryId,
  getProductByThirdSubCategoryName,
  updateProductRecord,
  updateProductQuickAction,
} from "../../../../lib/server/services/products.js";
import {
  deleteImageByQuery,
  uploadImagesFromRequest,
} from "../../../../lib/server/services/upload-images.js";
import {
  bulkCreateVariants,
  deleteVariantsByProductId,
  listVariantsByProductId,
} from "../../../../lib/server/repositories/product-variants.js";
import type { Id } from "../../../../lib/server/types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<{ path?: string[] }> };

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireAdminRequest(request: NextRequest): Promise<Id> {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
  return userId;
}

function getIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : (request.headers.get("x-real-ip") || null);
}

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [first, second] = segments;

  if (request.method === "GET" && segments.length === 0) {
    const { searchParams } = new URL(request.url);
    let includeAllStatuses = false;
    if (searchParams.get("includeAllStatuses") === "true") {
      try {
        const userId = requireAccessUserId(request);
        await requireAdmin(userId);
        includeAllStatuses = true;
      } catch {
        includeAllStatuses = false;
      }
    }
    return ok(
      await getAllProducts({
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10),
        category: searchParams.get("category") || "",
        subCategory: searchParams.get("subCategory") || "",
        thirdCategory: searchParams.get("thirdCategory") || "",
        search: searchParams.get("search") || "",
        onSale: searchParams.get("onSale") || "",
        minRating: searchParams.get("minRating") || "",
        inStockOnly: searchParams.get("inStockOnly") || "",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        sort: searchParams.get("sort") || "",
        brand: searchParams.get("brand") || "",
        includeAllStatuses,
      })
    );
  }

  if (request.method === "GET" && first === "brands") {
    return ok(await getProductBrands());
  }

  if (request.method === "GET" && first === "facets") {
    const { searchParams } = new URL(request.url);
    return ok(
      await getCatalogFacets({
        category: searchParams.get("category") || "",
        categoryName: searchParams.get("categoryName") || "",
        subCategory: searchParams.get("subCategory") || "",
        thirdCategory: searchParams.get("thirdCategory") || "",
        search: searchParams.get("search") || "",
        onSale: searchParams.get("onSale") || "",
        inStockOnly: searchParams.get("inStockOnly") || "",
        brand: searchParams.get("brand") || "",
        minRating: searchParams.get("minRating") || "",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
      })
    );
  }

  if (request.method === "GET" && first === "getproductby-catid" && second) {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductByCategoryId(Number(second), {
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10000),
      })
    );
  }

  if (request.method === "GET" && first === "getproductby-catname") {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductByCategoryName(searchParams.get("catName") || "", {
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10000),
      })
    );
  }

  if (request.method === "GET" && first === "getproductby-subcatid" && second) {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductBySubCategoryId(second, {
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10000),
      })
    );
  }

  if (request.method === "GET" && first === "getproductby-subcatname") {
    const { searchParams } = new URL(request.url);
    return ok(await getProductBySubCategoryName(searchParams.get("subCat") || ""));
  }

  if (request.method === "GET" && first === "getproductby-thirdsubcatid" && second) {
    return ok(await getProductByThirdSubCategoryId(second));
  }

  if (request.method === "GET" && first === "getproductby-thirdsubcatname") {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductByThirdSubCategoryName(searchParams.get("thirdSubCat") || "")
    );
  }

  if (request.method === "GET" && first === "getproductby-price") {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductByPriceRange({
        catId: searchParams.get("catId") || "",
        subCatId: searchParams.get("subCatId") || "",
        thirdSubCatId: searchParams.get("thirdSubCatId") || "",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
      })
    );
  }

  if (request.method === "GET" && first === "getproductby-rating") {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductByExactRating({
        catId: searchParams.get("catId") || "",
        subCatId: searchParams.get("subCatId") || "",
        thirdSubCatId: searchParams.get("thirdSubCatId") || "",
        rating: searchParams.get("rating") || "",
      })
    );
  }

  if (request.method === "GET" && first === "getproductcount") {
    return ok(await getProductCount());
  }

  if (request.method === "GET" && first === "getfeaturedproduct") {
    return ok(await getFeaturedProducts());
  }

  if (request.method === "GET" && first === "slug" && second) {
    return ok(await getProductBySlugValue(second));
  }

  if (request.method === "GET" && first === "getproduct" && second) {
    return ok(await getSingleProduct(Number(second)));
  }

  if (request.method === "GET" && first && second === "variants") {
    const productId = Number(first);
    if (!Number.isInteger(productId) || productId <= 0) return fail(400, "Invalid product id");
    const variants = await listVariantsByProductId(productId);
    return ok({ variants: variants.filter((v) => v.isActive) });
  }

  if (request.method === "PUT" && first && second === "variants") {
    const adminId = await requireAdminRequest(request);
    const productId = Number(first);
    if (!Number.isInteger(productId) || productId <= 0) return fail(400, "Invalid product id");
    const body = await parseJson(request);
    const incoming = (Array.isArray(body?.variants) ? body.variants : []) as Array<Record<string, unknown>>;

    const rows = incoming.map((v, i) => {
      const name = String(v?.name || "").trim();
      if (!name) throw new Error(`Variant ${i + 1}: name is required`);
      const price = Number(v?.price);
      const stock = Number(v?.stock);
      if (!Number.isFinite(price) || price < 0) throw new Error(`Variant ${i + 1}: invalid price`);
      if (!Number.isFinite(stock) || stock < 0) throw new Error(`Variant ${i + 1}: invalid stock`);
      return {
        productId,
        sku: v?.sku ? String(v.sku).trim() : null,
        name,
        attributes: v?.attributes && typeof v.attributes === "object" ? v.attributes as Record<string, string> : {},
        price,
        stock: Math.floor(stock),
        isActive: v?.isActive !== false,
        position: Number.isFinite(Number(v?.position)) ? Number(v.position) : i,
      };
    });

    await deleteVariantsByProductId(productId);
    const inserted = await bulkCreateVariants(rows);
    await writeAuditLog({
      adminId,
      action: "UPDATE",
      entity: "product",
      entityId: productId,
      detail: `Variants replaced: ${inserted} row(s)`,
      ip: getIp(request),
    });
    return ok({ success: true, variants: await listVariantsByProductId(productId) });
  }

  if (request.method === "POST" && first === "create") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await createProductRecord(body);
    await writeAuditLog({ adminId, action: "CREATE", entity: "product", entityId: result?.product?.id, detail: `Product created: ${body?.name || ""}`, ip: getIp(request) });
    return ok(result, 201);
  }

  if (request.method === "POST" && first === "upload-images") {
    await requireAdminRequest(request);
    return ok(await uploadImagesFromRequest(request));
  }

  if (request.method === "PUT" && first === "updateproduct" && second) {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateProductRecord(Number(second), body);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "product", entityId: second, detail: `Product updated: ${body?.name || ""}`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "PATCH" && first === "quick-action" && second) {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateProductQuickAction(Number(second), body);
    await writeAuditLog({
      adminId,
      action: "UPDATE",
      entity: "product",
      entityId: second,
      detail: `Quick action: ${body?.action || "unknown"} on ${result?.product?.name || ""}`,
      ip: getIp(request),
    });
    return ok(result);
  }

  if (request.method === "DELETE" && first === "deleteimage") {
    await requireAdminRequest(request);
    return ok(await deleteImageByQuery(request));
  }

  if (request.method === "DELETE" && first === "deleteproduct" && second) {
    const adminId = await requireAdminRequest(request);
    const result = await deleteProductRecord(Number(second));
    await writeAuditLog({ adminId, action: "DELETE", entity: "product", entityId: second, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "POST" && first === "delete-multiple") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await bulkDeleteProducts(body?.ids as Array<number | string>, { permanent: body?.permanent === true });
    await writeAuditLog({ adminId, action: result.archived ? "ARCHIVE" : "DELETE", entity: "product", detail: `Bulk: ${(body?.ids as Array<unknown> || []).join(", ")}`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "POST" && first === "bulk-status") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await bulkSetProductStatus(body?.ids as Array<number | string>, body?.status as string);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "product", detail: `Bulk status → ${result.status}: ${(body?.ids as Array<unknown> || []).join(", ")}`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "POST" && first && second === "restore") {
    const adminId = await requireAdminRequest(request);
    const result = await restoreProductRecord(Number(first));
    await writeAuditLog({ adminId, action: "RESTORE", entity: "product", entityId: first, ip: getIp(request) });
    return ok(result);
  }

  return null;
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const nativeResponse = await dispatchNativeRoute(request, segments);
    if (nativeResponse) {
      return nativeResponse;
    }
    return fail(404, "Route not found");
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
