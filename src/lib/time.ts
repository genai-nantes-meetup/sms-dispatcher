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
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  let iso: string | null = null;
  if (m) iso = `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, "0")}:${m[5]}`;
  m = v.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2})$/);
  if (m) iso = `${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2, "0")}:${m[5]}`;
  if (!iso) return null;
  const d = parisToDate(iso);
  return isNaN(d.getTime()) ? null : d;
}
