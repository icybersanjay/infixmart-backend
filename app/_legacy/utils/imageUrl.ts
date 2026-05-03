const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";
const apiUrl = typeof window !== "undefined" ? window.location.origin : "";

export const imgUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // Route /uploads/* through CDN if configured
  if (CDN_URL && path.startsWith("/uploads/")) {
    return `${CDN_URL}${path}`;
  }
  return apiUrl ? `${apiUrl}${path}` : path;
};
