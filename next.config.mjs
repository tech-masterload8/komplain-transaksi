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
    // Proxy aaPanel pernah menyimpan /transaksi selama setahun dan menyajikan
    // HTML build lama, sehingga halaman pelanggan tampil kosong.
    const noStore = [
      { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" },
      { key: "Vary", value: "Cookie" },
    ];
    return [
      { source: "/", headers: noStore },
      { source: "/transaksi", headers: noStore },
      { source: "/transaksi/:path*", headers: noStore },
      { source: "/chat", headers: noStore },
      { source: "/chat/:path*", headers: noStore },
      { source: "/admin", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
