// Converts a relative upload path like /uploads/photos/1/file.jpg
// to a full URL in production, or leaves it relative in dev.
export const assetUrl = (path: string): string => {
  if (!path || path.startsWith('http')) return path;
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}${path}`;
};
