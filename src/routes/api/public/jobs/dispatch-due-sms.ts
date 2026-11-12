import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/dispatch-due-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendSms, sentLastMinute, MAX_SMS_PER_MINUTE } = await import("@/lib/httpsms.server");
        const timedOut = await supabaseAdmin.rpc("timeout_stuck_sms");
        const budget = MAX_SMS_PER_MINUTE - (await sentLastMinute(supabaseAdmin));
        if (budget <= 0) return Response.json({ claimed: 0, sent: 0, failed: 0, deferred: true, timedOut: timedOut.data ?? 0 });
        const { data: rows, error } = await supabaseAdmin.rpc("claim_due_sms", { _limit: budget });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        let sent = 0, failed = 0;
        for (const row of rows ?? []) {
          const r = await sendSms(row.phone, row.content);
          if (r.ok) {
            sent++;
            await supabaseAdmin.from("sms_messages").update({
              status: "sent", sent_at: new Date().toISOString(), brevo_message_id: r.messageId, error: null,
            }).eq("id", row.id);
          } else {
            failed++;
            await supabaseAdmin.from("sms_messages").update({ status: "failed", error: r.error }).eq("id", row.id);
          }
        }
        return Response.json({ claimed: rows?.length ?? 0, sent, failed, timedOut: timedOut.data ?? 0 });
      },
    },
  },
});
