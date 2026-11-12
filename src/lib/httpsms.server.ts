export const MAX_SMS_PER_MINUTE = 20;

export async function sendSms(phoneE164: string, content: string) {
  const apiKey = process.env["HTTPSMS_API_KEY"];
  const from = process.env["HTTPSMS_FROM"];
  if (!apiKey || !from) return { ok: false as const, error: "httpSMS is not configured" };
  const clean = content.replace(/\[STOP CODE\]/gi, "").trim();
  try {
    const res = await fetch("https://api.httpsms.com/v1/messages/send", {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ from, to: phoneE164, content: clean }),
    });
    const text = await res.text();
    let body: Record<string, any> = {};
    try { body = JSON.parse(text); } catch { /* not json */ }
    if (!res.ok) return { ok: false as const, error: `httpSMS ${res.status}: ${body["message"] ?? text}` };
    const id = body["data"]?.["id"] ?? null;
    return { ok: true as const, messageId: id != null ? String(id) : null };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

/** SMS sent (or being sent) during the last 60 seconds. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sentLastMinute(db: any): Promise<number> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await db.from("sms_messages").select("id", { count: "exact", head: true })
    .or(`status.eq.sending,sent_at.gte.${since}`);
  return count ?? 0;
}
