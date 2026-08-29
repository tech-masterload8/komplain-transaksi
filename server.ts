import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { ingestAuthorization } from "./src/lib/auth";
import { normalizeWebDevPrivateKey } from "./src/lib/decrypt";
import { loadEnvFiles } from "./src/lib/load-env";
import { appBasePath } from "./src/lib/paths";

loadEnvFiles();

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3001);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function headerOf(value: string | string[] | undefined, joinWith = ", ") {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(joinWith) : value;
}

function stripBasePath(pathname: string) {
  const base = appBasePath();
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    return pathname.slice(base.length) || "/";
  }
  return pathname;
}

function isSensitivePath(pathname: string) {
  const p = pathname.split("?")[0].toLowerCase();
  return (
    p === "/.env" ||
    p.startsWith("/.env.") ||
    p.endsWith("/.env") ||
    p.includes("/.env.") ||
    p === "/.git" ||
    p.startsWith("/.git/")
  );
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const path = (req.url || "/").split("?")[0];
      if (isSensitivePath(path)) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const logicalPath = stripBasePath(path);
      const isAdminPath = logicalPath.startsWith("/admin") || logicalPath.startsWith("/api/admin");
      const cookie = headerOf(req.headers.cookie, "; ");
      const authorization = isAdminPath
        ? undefined
        : headerOf(req.headers.authorization) || headerOf(req.headers["x-authorization"]);
      const proto =
        headerOf(req.headers["x-forwarded-proto"]) ||
        (headerOf(req.headers["x-forwarded-ssl"]) === "on" ? "https" : undefined);
      let ingested: Awaited<ReturnType<typeof ingestAuthorization>> = { user: null, reason: "no-header" };
      if (!isAdminPath) {
        try {
          ingested = await ingestAuthorization({
            headers: {
              cookie,
              authorization,
              "x-authorization": headerOf(req.headers["x-authorization"]),
              signature: headerOf(req.headers.signature) || headerOf(req.headers["x-signature"]),
              "x-forwarded-proto": proto,
            },
          });
        } catch (error) {
          console.error(error);
        }
        req.headers["x-kt-auth-reason"] = ingested.reason;
      }
      if (ingested.setCookie) {
        const current = res.getHeader("Set-Cookie");
        if (!current) res.setHeader("Set-Cookie", ingested.setCookie);
        else if (Array.isArray(current)) res.setHeader("Set-Cookie", [...current, ingested.setCookie]);
        else res.setHeader("Set-Cookie", [String(current), ingested.setCookie]);
        const cookiePair = ingested.setCookie.split(";")[0];
        req.headers.cookie = req.headers.cookie ? `${req.headers.cookie}; ${cookiePair}` : cookiePair;
      }

      // Tutorial: header Android hanya ada di request pertama. Simpan sesi lalu
      // redirect (setara $_SESSION di contoh PHP) sebelum Next.js merender halaman kosong.
      const method = (req.method || "GET").toUpperCase();
      const isDocument =
        method === "GET" &&
        !logicalPath.startsWith("/api") &&
        !logicalPath.startsWith("/_next");
      if (ingested.user && ingested.setCookie && isDocument && (logicalPath === "/" || logicalPath === "")) {
        const dest = `${appBasePath()}/transaksi`;
        res.statusCode = 302;
        res.setHeader("Location", dest);
        res.end();
        return;
      }

      const parsedUrl = parse(req.url || "/", true);
      await handle(req, res, parsedUrl);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  }).listen(port, hostname, () => {
    const keyLen = normalizeWebDevPrivateKey(process.env.WEB_DEV_PRIVATE_KEY).length;
    console.log(`Komplain app ready on http://${hostname}:${port}${appBasePath() || ""}`);
    console.log(
      keyLen > 80
        ? `WEB_DEV_PRIVATE_KEY loaded (${keyLen} chars)`
        : "WEB_DEV_PRIVATE_KEY missing or too short — header Android tidak bisa didekripsi",
    );
  });
});
