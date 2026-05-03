import { HttpError } from "../api/http.js";
import { saveUploadedFiles, deleteUploadByPublicPath } from "../files/uploads.js";

export interface UploadImagesResult {
  images: unknown;
  message: string;
}

export async function uploadImagesFromRequest(
  request: Request
): Promise<UploadImagesResult> {
  const formData = await request.formData();
  const images = await saveUploadedFiles(formData, "images");
  return {
    images,
    message: "Image uploaded successfully",
  };
}

export async function deleteImageByQuery(request: Request): Promise<{ result: "ok" }> {
  const { searchParams } = new URL(request.url);
  const img = searchParams.get("img");
  if (!img || !(await deleteUploadByPublicPath(img))) {
    throw new HttpError(400, "Invalid path");
  }

  return { result: "ok" };
}
