import Papa from "papaparse";
import { normalizePhone } from "./phone";
import { parseCsvDate } from "./time";

export const DEMO_CSV = `phone,firstname,lastname,message,send_at
+33600000001,Alice,Martin,"Hi $firstname, reminder: our meeting is tomorrow at 10:00.",2026-12-01 09:00
0600000002,Bruno,Leroy,"$firstname, your access is ready. Check your inbox for details.",2026-12-01 09:30
+33 6 00 00 00 03,Chloé,Dubois,"Hello $fullname, the event starts at 18:30. See you there!",2026-12-02 17:00
+447700900004,David,Smith,"Hi $firstname, quick reminder for Friday's call at 15:00 CET.",2026-12-05 14:00
+33600000005,Eve,Moreau,"Hi $firstname,
your pass is ready:
- gate B12
- time 09:30
See you there!",2026-12-03 08:00
+33600000006,Franck,Petit,"Hi $firstname, your seat is confirmed.\nGate: B12\nTime: 09:30",2026-12-04 11:00
`;

export type CsvRow = {
  line: number; raw: Record<string, string>;
  phone: string | null; firstName: string; lastName: string; name: string; message: string; sendAt: Date | null; errors: string[];
};

/**
 * A message cell can carry line breaks two ways: real ones inside a quoted cell
 * (what Excel/Sheets write when you press Alt+Enter), or the \n escape sequence.
 * Both become real line breaks before sending.
 */
export function normalizeMessageBreaks(text: string): string {
  return text.replace(/\\r\\n|\\r|\\n/g, "\n");
}

/**
 * 1-based file line where each CSV record starts.
 * Quote-aware: a quoted cell may contain line breaks, so a record can span several lines.
 */
export function recordStartLines(text: string): number[] {
  const out: number[] = [];
  let line = 1, inQuotes = false, atRecordStart = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") { line++; if (!inQuotes) atRecordStart = true; continue; }
    if (ch === "\r") continue;
    if (atRecordStart) { out.push(line); atRecordStart = false; }
    if (ch === '"') inQuotes = !inQuotes;
  }
  return out;
}

export function parseSmsCsv(text: string, now = new Date()): { rows: CsvRow[]; headerError: string | null } {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const res = Papa.parse<Record<string, string>>(clean, {
    header: true, delimiter, skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const fields = res.meta.fields ?? [];
  const missing = ["phone", "firstname", "lastname", "message", "send_at"].filter((f) => !fields.includes(f));
  if (missing.length) return { rows: [], headerError: `Missing column(s): ${missing.join(", ")}` };
  // Only trust the scanned line numbers when every parsed record was accounted for.
  const starts = recordStartLines(clean);
  const useStarts = starts.length - 1 === res.data.length;
  const rows = res.data.map((raw, i) => {
    const errors: string[] = [];
    const phone = normalizePhone(raw["phone"] ?? "");
    if (!phone) errors.push("Invalid phone");
    const firstName = (raw["firstname"] ?? "").trim(); if (!firstName) errors.push("First name is empty");
    const lastName = (raw["lastname"] ?? "").trim();
    const name = `${firstName} ${lastName}`.trim();
    const message = normalizeMessageBreaks((raw["message"] ?? "").trim()); if (!message) errors.push("Message is empty");
    const sendAt = parseCsvDate(raw["send_at"] ?? "");
    if (!sendAt) errors.push("Invalid send_at");
    else if (sendAt.getTime() <= now.getTime()) errors.push("send_at is in the past");
    return { line: useStarts ? (starts[i + 1] ?? i + 2) : i + 2, raw, phone, firstName, lastName, name, message, sendAt, errors };
  });
  return { rows, headerError: null };
}
