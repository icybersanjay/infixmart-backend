import { HttpError } from "../api/http.js";
import { deleteUploadByPublicPath } from "../files/uploads.js";
import {
  countRootCategories,
  countSubCategories,
  createCategory,
  deleteCategoryById,
  findCategoryById,
  listCategories,
  listChildCategories,
  updateCategory,
} from "../repositories/categories.js";
import type { Category, Id } from "../types.js";

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildCategoryTree(categories: Array<Category | null>): CategoryNode[] {
  const nonNull = categories.filter((c): c is Category => Boolean(c));
  const categoryMap: Record<number, CategoryNode> = Object.fromEntries(
    nonNull.map((cat) => [cat.id, { ...cat, children: [] }])
  );

  const rootCategories: CategoryNode[] = [];

  for (const category of nonNull) {
    if (category.parentCatId && categoryMap[category.parentCatId]) {
      categoryMap[category.parentCatId].children.push(categoryMap[category.id]);
    } else if (!category.parentCatId) {
      rootCategories.push(categoryMap[category.id]);
    }
  }

  return rootCategories;
}

export async function getAllCategories() {
  const categories = await listCategories();
  const tree = buildCategoryTree(categories);

  return {
    categories: tree,
    data: tree,
    message: "Categories fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getCategoryCount() {
  return {
    count: await countRootCategories(),
    message: "Category count fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getSubCategoryCount() {
  return {
    count: await countSubCategories(),
    message: "Subcategory count fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getCategoryById(id: Id) {
  const category = await findCategoryById(id);
  if (!category) {
    throw new HttpError(404, "Category not found");
  }

  return {
    categorybyId: category,
    message: "Category fetched successfully",
    success: true as const,
    error: false as const,
  };
}

interface CategoryBody {
  name: string;
  images?: string[] | string;
  parentCatName?: string | null;
  parentCatId?: Id | null;
}

export async function createCategoryRecord(body: CategoryBody) {
  const images = Array.isArray(body.images)
    ? body.images
    : JSON.parse((body.images as string) || "[]");

  const category = await createCategory({
    name: body.name,
    images,
    parentCatName: body.parentCatName || null,
    parentCatId: body.parentCatId || null,
  });

  return {
    category,
    message: "Category created successfully",
    success: true as const,
    error: false as const,
  };
}

export async function updateCategoryRecord(id: Id, body: CategoryBody) {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new HttpError(404, "Category not found");
  }

  const images = Array.isArray(body.images)
    ? body.images
    : JSON.parse((body.images as string) || "[]");

  const category = await updateCategory(id, {
    name: body.name,
    images: images.length > 0 ? images : existing.images,
    parentCatName: body.parentCatName || null,
    parentCatId: body.parentCatId || null,
  });

  return {
    category,
    message: "Category updated successfully",
    success: true as const,
    error: false as const,
  };
}

export async function deleteCategoryRecord(id: Id) {
  const category = await findCategoryById(id);
  if (!category) {
    throw new HttpError(404, "Category not found");
  }

  for (const img of category.images || []) {
    await deleteUploadByPublicPath(img);
  }

  const subCategories = await listChildCategories(id);
  for (const sub of subCategories) {
    if (!sub) continue;
    const thirdSubs = await listChildCategories(sub.id);
    for (const third of thirdSubs) {
      if (!third) continue;
      await deleteCategoryById(third.id);
    }
    await deleteCategoryById(sub.id);
  }

  await deleteCategoryById(id);

  return {
    message: "Category deleted successfully",
    success: true as const,
    error: false as const,
  };
}

export async function bulkDeleteCategories(ids: Array<Id | string>) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "No category IDs provided");
  }

  for (const id of ids) {
    const category = await findCategoryById(Number(id));
    if (!category) {
      continue;
    }

    await deleteCategoryRecord(Number(id));
  }

  return {
    message: "Categories deleted successfully",
    success: true as const,
    error: false as const,
  };
}
