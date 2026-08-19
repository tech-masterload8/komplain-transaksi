/** Public URL prefix. Production aaPanel: `/komplain`. Empty for local `npm run dev`. */
export function appBasePath() {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

export function apiUrl(path: string) {
  const base = appBasePath();
  if (!path.startsWith("/")) return path;
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

export function cookiePath() {
  return appBasePath() || "/";
}
