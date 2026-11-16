import { describe, it, expect } from "vitest";
import { parseSmsCsv, DEMO_CSV } from "./csv";
import { normalizePhone } from "./phone";
import { smsStats } from "./sms-encoding";

const NOW = new Date("2026-11-11T12:00:00Z");

describe("csv import", () => {
  it("demo CSV gives 5 valid rows", () => {
    const { rows } = parseSmsCsv(DEMO_CSV, NOW);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.errors.length === 0)).toBe(true);
    expect(rows[3]!.phone).toBe("+447700900004");
  });
  it("demo CSV keeps the multi-line SMS on one row", () => {
    const { rows } = parseSmsCsv(DEMO_CSV, NOW);
    const multi = rows[4]!;
    expect(multi.errors).toEqual([]);
    expect(multi.phone).toBe("+33600000005");
    expect(multi.message).toBe("Hi $firstname,\nyour pass is ready:\n- gate B12\n- time 09:30\nSee you there!");
    expect(multi.line).toBe(6);
  });
  it("numbers rows after a multi-line message by their real file line", () => {
    const csv = 'phone,firstname,lastname,message,send_at\n0600000002,Bruno,Leroy,"line one\nline two",01/12/2026 09:30\n0600000003,Carla,Dumas,"single",01/12/2026 10:00\n';
    const { rows } = parseSmsCsv(csv, NOW);
    expect(rows.map((r) => r.line)).toEqual([2, 4]);
    expect(rows[0]!.message).toBe("line one\nline two");
  });
  it("works with ; delimiter and BOM", () => {
    const semi = "\uFEFFphone;firstname;lastname;message;send_at\n0600000002;Bruno;Leroy;Hello, there;01/12/2026 09:30\n";
    const { rows } = parseSmsCsv(semi, NOW);
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.message).toBe("Hello, there");
  });
  it("flags invalid phone and past date", () => {
    const { rows } = parseSmsCsv("phone,firstname,lastname,message,send_at\n123,X,Y,Hi,2020-01-01 10:00\n", NOW);
    expect(rows[0]!.errors).toContain("Invalid phone");
    expect(rows[0]!.errors).toContain("send_at is in the past");
  });
});

describe("phones", () => {
  it.each(["06 12 34 56 78", "0612345678", "33612345678", "+33612345678"])("%s → +33612345678", (p) => {
    expect(normalizePhone(p)).toBe("+33612345678");
  });
});

describe("segments", () => {
  it("GSM-7 160/153", () => {
    expect(smsStats("a".repeat(160)).segments).toBe(1);
    expect(smsStats("a".repeat(161)).segments).toBe(2);
  });
  it("Unicode 70/67", () => {
    expect(smsStats("😀" + "a".repeat(68)).encoding).toBe("Unicode");
    expect(smsStats("ç".repeat(71)).segments).toBe(2);
  });
});

