import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAllowedUser, RESTRICTED_MSG } from "./auth-domain";
import { normalizePhone } from "./phone";

export const sendSmsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { recipientId: string | null; name: string; phone: string; content: string }) => {
    if (!i.content?.trim()) throw new Error("Message is empty");
    if (!i.name?.trim()) throw new Error("Recipient name is required");
    const phone = normalizePhone(i.phone);
    if (!phone) throw new Error("Invalid phone number");
    return { ...i, phone, content: i.content.trim(), name: i.name.trim() };
  })
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email || !(await isAllowedUser(context.supabase))) throw new Error(RESTRICTED_MSG);
    const { supabase } = context;
    const { sendSms, sentLastMinute, MAX_SMS_PER_MINUTE } = await import("./httpsms.server");
    if ((await sentLastMinute(supabase)) >= MAX_SMS_PER_MINUTE) {
      const { error } = await supabase.from("sms_messages").insert({
        recipient_id: data.recipientId, recipient_name: data.name, phone: data.phone,
        content: data.content, scheduled_at: new Date().toISOString(), status: "scheduled",
        source: "form", created_by: email,
      });
      if (error) throw new Error(error.message);
      return { ok: true, queued: true, error: null };
    }
    const { data: row, error } = await supabase
      .from("sms_messages")
      .insert({
        recipient_id: data.recipientId, recipient_name: data.name, phone: data.phone,
        content: data.content, scheduled_at: new Date().toISOString(), status: "sending",
        source: "form", attempts: 1, claimed_at: new Date().toISOString(), created_by: email,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create message");
    const r = await sendSms(data.phone, data.content);
    const patch = r.ok
      ? { status: "sent" as const, sent_at: new Date().toISOString(), brevo_message_id: r.messageId, error: null }
      : { status: "failed" as const, error: r.error };
    await supabase.from("sms_messages").update(patch).eq("id", row.id);
    return { ok: r.ok, queued: false, error: r.ok ? null : r.error };
  });
