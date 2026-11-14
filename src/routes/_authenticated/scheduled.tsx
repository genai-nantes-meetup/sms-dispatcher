import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Trash2, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { messagesQuery, matches, type SmsMessage } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { fmtParis } from "@/lib/time";
import { Counters, PageHeader, SearchBox, Confirm, Empty, Expandable } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/scheduled")({
  head: () => ({ meta: [{ title: "Scheduled · SMS Dispatcher" }, { name: "description", content: "Upcoming scheduled SMS." }, { property: "og:title", content: "Scheduled · SMS Dispatcher" }, { property: "og:description", content: "Upcoming scheduled SMS." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Scheduled,
});

function Scheduled() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(messagesQuery(["scheduled"]));
  const [q, setQ] = useState("");
  const rows = data.filter((m) => matches(q, m.recipient_name, m.phone, m.content));
  const batchCount = (id: string) => data.filter((m) => m.import_batch_id === id).length;
  const refresh = () => qc.invalidateQueries({ queryKey: ["messages"] });

  const del = async (m: SmsMessage) => {
    const { error } = await supabase.from("sms_messages").delete().eq("id", m.id).eq("status", "scheduled");
    if (error) toast.error(error.message); else toast.success("Scheduled SMS deleted");
    refresh();
  };
  const delBatch = async (id: string) => {
    const { error } = await supabase.from("sms_messages").delete().eq("import_batch_id", id).eq("status", "scheduled");
    if (error) toast.error(error.message); else toast.success("Import deleted");
    refresh();
  };

  const actions = (m: SmsMessage) => (
    <div className="flex flex-wrap gap-2">
      <Confirm title="Delete this scheduled SMS?" description="It will not be sent." onConfirm={() => del(m)}
        trigger={<Button size="sm" variant="outline"><Trash2 /> Delete</Button>} />
      {m.import_batch_id && (
        <Confirm title="Delete entire import?" action="Delete import"
          description={`This deletes all ${batchCount(m.import_batch_id)} scheduled SMS from this CSV import.`}
          onConfirm={() => delBatch(m.import_batch_id!)}
          trigger={<Button size="sm" variant="ghost" className="text-destructive"><Layers /> Delete entire import</Button>} />
      )}
    </div>
  );

  return (
    <div>
      <PageHeader title="Scheduled"><SearchBox value={q} onChange={setQ} /></PageHeader>
      <Counters />
      {isLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : rows.length === 0 ? (
        <Empty icon={<CalendarClock className="h-8 w-8" />} title={q ? "No match" : "Nothing scheduled"} text={q ? "Try another search." : "Scheduled SMS will appear here until they are sent."} />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {rows.map((m) => (
              <div key={m.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold">{m.recipient_name}</p><p className="text-xs text-muted-foreground">{formatPhone(m.phone)}</p></div>
                  <p className="text-sm font-medium tabular-nums text-primary">{fmtParis(m.scheduled_at)}</p>
                </div>
                <div className="my-3"><Expandable text={m.content} /></div>
                <p className="mb-3 text-xs text-muted-foreground"><Badge variant="secondary">{m.source}</Badge> · {m.created_by}</p>
                {actions(m)}
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">When</th><th className="p-3">Recipient</th><th className="p-3">Message</th><th className="p-3">Source</th><th className="p-3">Created by</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t align-top">
                    <td className="whitespace-nowrap p-3 font-medium tabular-nums">{fmtParis(m.scheduled_at)}</td>
                    <td className="p-3"><p className="font-medium">{m.recipient_name}</p><p className="text-xs text-muted-foreground">{formatPhone(m.phone)}</p></td>
                    <td className="max-w-xs p-3"><Expandable text={m.content} /></td>
                    <td className="p-3"><Badge variant="secondary">{m.source}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{m.created_by}</td>
                    <td className="p-3">{actions(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
