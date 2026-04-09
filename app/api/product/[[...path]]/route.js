import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import { writeAuditLog } from "../../../../lib/server/repositories/audit.js";
import {
  bulkDeleteProducts,
  createProductRecord,
  deleteProductRecord,
  getAllProducts,
  getFeaturedProducts,
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
} from "../../../../lib/server/services/products.js";
import {
  deleteImageByQuery,
  uploadImagesFromRequest,
} from "../../../../lib/server/services/upload-images.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireAdminRequest(request) {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
  return userId;
}

function getIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : (request.headers.get("x-real-ip") || null);
}

async function dispatchNativeRoute(request, segments) {
  const [first, second] = segments;

  if (request.method === "GET" && segments.length === 0) {
    const { searchParams } = new URL(request.url);
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
      })
    );
  }

  if (request.method === "GET" && first === "getproductby-catid" && second) {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductByCategoryId(second, {
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
    return ok(await getSingleProduct(second));
  }

  if (request.method === "POST" && first === "create") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await createProductRecord(body);
    await writeAuditLog({ adminId, action: "CREATE", entity: "product", entityId: result?.data?.id, detail: `Product created: ${body?.name || ""}`, ip: getIp(request) });
    return ok(result, 201);
  }

  if (request.method === "POST" && first === "upload-images") {
    await requireAdminRequest(request);
    return ok(await uploadImagesFromRequest(request));
  }

  if (request.method === "PUT" && first === "updateproduct" && second) {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateProductRecord(second, body);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "product", entityId: second, detail: `Product updated: ${body?.name || ""}`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "DELETE" && first === "deleteimage") {
    await requireAdminRequest(request);
    return ok(await deleteImageByQuery(request));
  }

  if (request.method === "DELETE" && first === "deleteproduct" && second) {
    const adminId = await requireAdminRequest(request);
    const result = await deleteProductRecord(second);
    await writeAuditLog({ adminId, action: "DELETE", entity: "product", entityId: second, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "POST" && first === "delete-multiple") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await bulkDeleteProducts(body?.ids);
    await writeAuditLog({ adminId, action: "DELETE", entity: "product", detail: `Bulk delete: ${(body?.ids || []).join(", ")}`, ip: getIp(request) });
    return ok(result);
  }

  return null;
}

async function handle(request, context) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const nativeResponse = await dispatchNativeRoute(request, segments);
    if (nativeResponse) {
      return nativeResponse;
    }
    return fail(404, "Route not found");
  } catch (error) {
    return handleRouteError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
