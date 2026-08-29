function appBasePath() {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

const basePath = appBasePath();

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "bcryptjs"],
  async headers() {
    return [
      {
        source: "/transaksi",
        headers: [{ key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" }],
      },
      {
        source: "/transaksi/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
