import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
export const TZ = "Europe/Paris";

export function fmtParis(iso: string | null | undefined, pattern = "dd/MM/yyyy HH:mm") {
  return iso ? formatInTimeZone(new Date(iso), TZ, pattern) : "—";
}
/** "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm" in Paris → Date (UTC instant) */
export function parisToDate(local: string): Date {
  return fromZonedTime(local.replace(" ", "T"), TZ);
}
export function nowParisInput(offsetMin = 0) {
  return formatInTimeZone(new Date(Date.now() + offsetMin * 60000), TZ, "yyyy-MM-dd'T'HH:mm");
}
/** Parse "YYYY-MM-DD HH:mm" or "DD/MM/YYYY HH:mm" (Paris). */
export function parseCsvDate(s: string): Date | null {
  const v = (s ?? "").trim();
  let iso: string | null = null;
  const a = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (a) iso = `${a[1]}-${a[2]}-${a[3]}T${(a[4] ?? "").padStart(2, "0")}:${a[5]}`;
  const b = v.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2})$/);
  if (b) iso = `${b[3]}-${b[2]}-${b[1]}T${(b[4] ?? "").padStart(2, "0")}:${b[5]}`;
  if (!iso) return null;
  const d = parisToDate(iso);
  return isNaN(d.getTime()) ? null : d;
}
