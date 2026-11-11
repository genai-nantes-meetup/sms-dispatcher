import Papa from "papaparse";
import { normalizePhone } from "./phone";
import { parseCsvDate } from "./time";

export const DEMO_CSV = `phone,name,message,send_at
+33600000001,Alice Martin,"Hi Alice, reminder: our meeting is tomorrow at 10:00.",2026-12-01 09:00
0600000002,Bruno Leroy,"Bruno, your access is ready. Check your inbox for details.",2026-12-01 09:30
+33 6 00 00 00 03,Chloé Dubois,"Hello Chloé, the event starts at 18:30. See you there!",2026-12-02 17:00
+447700900004,David Smith,"Hi David, quick reminder for Friday's call at 15:00 CET.",2026-12-05 14:00
`;

export type CsvRow = {
  line: number; raw: Record<string, string>;
  phone: string | null; name: string; message: string; sendAt: Date | null; errors: string[];
};

export function parseSmsCsv(text: string, now = new Date()): { rows: CsvRow[]; headerError: string | null } {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const res = Papa.parse<Record<string, string>>(clean, {
    header: true, delimiter, skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const fields = res.meta.fields ?? [];
  const missing = ["phone", "name", "message", "send_at"].filter((f) => !fields.includes(f));
  if (missing.length) return { rows: [], headerError: `Missing column(s): ${missing.join(", ")}` };
  const rows = res.data.map((raw, i) => {
    const errors: string[] = [];
    const phone = normalizePhone(raw.phone ?? "");
    if (!phone) errors.push("Invalid phone");
    const name = (raw.name ?? "").trim(); if (!name) errors.push("Name is empty");
    const message = (raw.message ?? "").trim(); if (!message) errors.push("Message is empty");
    const sendAt = parseCsvDate(raw.send_at ?? "");
    if (!sendAt) errors.push("Invalid send_at");
    else if (sendAt.getTime() <= now.getTime()) errors.push("send_at is in the past");
    return { line: i + 2, raw, phone, name, message, sendAt, errors };
  });
  return { rows, headerError: null };
}
