import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/dispatch-due-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendViaBrevo } = await import("@/lib/brevo.server");
        const timedOut = await supabaseAdmin.rpc("timeout_stuck_sms");
        const { data: rows, error } = await supabaseAdmin.rpc("claim_due_sms", { _limit: 50 });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        let sent = 0, failed = 0;
        for (const row of rows ?? []) {
          const r = await sendViaBrevo(row.phone, row.content);
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
