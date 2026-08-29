export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = jakartaParts(date);
  const withSeconds = parts.second !== "00";
  return `${parts.day} ${parts.monthName} ${parts.year} ${parts.hour}:${parts.minute}${withSeconds ? `:${parts.second}` : ""}`;
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = jakartaParts(date);
  return `${parts.hour}:${parts.minute}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function jakartaParts(date: Date) {
  const map = new Map(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "numeric",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const month = Number(map.get("month") || 0);
  return {
    day: map.get("day") || "",
    monthName: MONTHS[Math.max(0, month - 1)] || "",
    year: map.get("year") || "",
    hour: (map.get("hour") || "00").padStart(2, "0"),
    minute: map.get("minute") || "00",
    second: map.get("second") || "00",
  };
}

export function formatNominal(value: number | string | null | undefined) {
  const num = typeof value === "string" ? Number(value) : value;
  if (num == null || Number.isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
}

export function phoneVariants(phone: string) {
  const normalized = normalizePhone(phone);
  const noZero = normalized.startsWith("0") ? normalized.slice(1) : normalized;
  return Array.from(new Set([phone, normalized, `62${noZero}`, `+62${noZero}`, noZero]));
}

export function truncate(text: string, length = 22) {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

export function isSuccessStatus(status: string | number | null | undefined) {
  if (status == null) return false;
  const value = String(status).toLowerCase();
  return value === "1" || value === "sukses" || value === "success" || value === "true";
}

export function labelStatusTiket(status: string) {
  if (status === "proses") return "Diproses";
  if (status === "selesai") return "Selesai";
  return "Baru";
}

export function labelPrioritas(priority: string) {
  if (priority === "tinggi") return "Tinggi";
  if (priority === "rendah") return "Rendah";
  return "Normal";
}
