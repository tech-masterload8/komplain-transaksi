import { loadEnvFiles } from "../src/lib/load-env";
import { closeDb } from "../src/lib/db";
import { inspectOtomaxSchema } from "../src/lib/otomax";

loadEnvFiles();

async function main() {
  try {
    const info = await inspectOtomaxSchema();
    if (!info.ok) {
      console.error(`[otomax] gagal membaca skema: ${info.error}`);
      process.exitCode = 1;
      return;
    }
    console.log("[otomax] struktur terbaca (hanya SELECT)");
    console.log(JSON.stringify(info, null, 2));
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
