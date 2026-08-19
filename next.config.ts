import type { NextConfig } from "next";
import { appBasePath } from "./src/lib/paths";

const basePath = appBasePath();

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  poweredByHeader: false,
  serverExternalPackages: ["pg", "bcryptjs"],
};

export default nextConfig;
