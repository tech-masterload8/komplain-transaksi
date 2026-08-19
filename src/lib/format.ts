export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const withSeconds = date.getSeconds() !== 0;
  return `${dd} ${months[date.getMonth()]} ${yy} ${hh}:${mm}${withSeconds ? `:${ss}` : ""}`;
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
