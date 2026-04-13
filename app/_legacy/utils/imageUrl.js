const apiUrl =
  "" ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export const imgUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return apiUrl ? `${apiUrl}${path}` : path;
};
