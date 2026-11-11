import { toBrevoRecipient } from "./phone";
import { isGsm7 } from "./sms-encoding";

export async function sendViaBrevo(phoneE164: string, content: string) {
  const apiKey = process.env["BREVO_API_KEY"];
  const sender = process.env["BREVO_SMS_SENDER"];
  if (!apiKey || !sender) return { ok: false as const, error: "Brevo is not configured" };
  const clean = content.replace(/\[STOP CODE\]/gi, "").trim();
  try {
    const res = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender,
        recipient: toBrevoRecipient(phoneE164),
        content: clean,
        type: "transactional",
        unicodeEnabled: !isGsm7(clean),
        tag: "sms-dispatcher",
      }),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text); } catch { /* not json */ }
    if (!res.ok) {
      return { ok: false as const, error: `Brevo ${res.status}: ${(body["message"] as string) ?? text}` };
    }
    const id = body["messageId"] ?? body["reference"] ?? null;
    return { ok: true as const, messageId: id != null ? String(id) : null };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
