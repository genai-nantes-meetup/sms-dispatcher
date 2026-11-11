import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Normalize to E.164 (default country FR). Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  let candidate = raw.replace(/[\s.\-()]/g, "");
  // "33612345678" (country code without +) → "+33612345678"
  if (/^\d{11,15}$/.test(candidate) && !candidate.startsWith("0")) candidate = "+" + candidate;
  if (candidate.startsWith("00")) candidate = "+" + candidate.slice(2);
  const p = parsePhoneNumberFromString(candidate, "FR");
  // isPossible() fallback accepts reserved test ranges (e.g. UK 07700 900xxx)
  if (!p || !(p.isValid() || p.isPossible())) return null;
  return p.number;
}

export function formatPhone(e164: string): string {
  const p = parsePhoneNumberFromString(e164);
  return p ? p.formatInternational() : e164;
}

/** Brevo wants digits with country code, no "+". */
export function toBrevoRecipient(e164: string): string {
  return e164.replace(/\D/g, "");
}
