import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Recipient = Database["public"]["Tables"]["recipients"]["Row"];
export type SmsMessage = Database["public"]["Tables"]["sms_messages"]["Row"];

export const recipientsQuery = queryOptions({
  queryKey: ["recipients"],
  queryFn: async () => {
    const { data, error } = await supabase.from("recipients").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const messagesQuery = (statuses: SmsMessage["status"][]) =>
  queryOptions({
    queryKey: ["messages", statuses.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_messages").select("*").in("status", statuses)
        .order("scheduled_at", { ascending: true }).limit(1000);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

export const statsQuery = queryOptions({
  queryKey: ["messages", "stats"],
  queryFn: async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week = new Date(Date.now() - 7 * 864e5);
    const c = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
    const [scheduled, sentToday, failed7] = await Promise.all([
      c(supabase.from("sms_messages").select("id", { count: "exact", head: true }).eq("status", "scheduled")),
      c(supabase.from("sms_messages").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", today.toISOString())),
      c(supabase.from("sms_messages").select("id", { count: "exact", head: true }).eq("status", "failed").gte("scheduled_at", week.toISOString())),
    ]);
    return { scheduled, sentToday, failed7 };
  },
  refetchInterval: 30000,
});

export const recipientStatsQuery = queryOptions({
  queryKey: ["messages", "recipient-stats"],
  queryFn: async () => {
    const { data, error } = await supabase.from("sms_messages").select("recipient_id, sent_at").eq("status", "sent").not("recipient_id", "is", null).limit(10000);
    if (error) throw error;
    const m = new Map<string, { count: number; last: string | null }>();
    for (const r of data) {
      const e = m.get(r.recipient_id!) ?? { count: 0, last: null };
      e.count++; if (r.sent_at && (!e.last || r.sent_at > e.last)) e.last = r.sent_at;
      m.set(r.recipient_id!, e);
    }
    return m;
  },
});

export function matches(q: string, ...fields: (string | null | undefined)[]) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const digits = s.replace(/\D/g, "");
  return fields.some((f) => {
    if (!f) return false;
    if (f.toLowerCase().includes(s)) return true;
    return digits.length >= 3 && f.replace(/\D/g, "").includes(digits);
  });
}
