import type { NextConfig } from "next";
import { appBasePath } from "./src/lib/paths";

const basePath = appBasePath();

const nextConfig: NextConfig = {
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
