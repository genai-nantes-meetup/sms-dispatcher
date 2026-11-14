import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History as HistoryIcon, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { messagesQuery, matches, type SmsMessage } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { fmtParis } from "@/lib/time";
import { Counters, PageHeader, SearchBox, Confirm, Empty, Expandable } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History · SMS Dispatcher" }, { name: "description", content: "Sent and failed SMS." }, { property: "og:title", content: "History · SMS Dispatcher" }, { property: "og:description", content: "Sent and failed SMS." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: History,
});

const sortKey = (m: SmsMessage) => (m.status === "sent" ? m.sent_at ?? m.scheduled_at : m.scheduled_at);

function StatusBadge({ m }: { m: SmsMessage }) {
  if (m.status === "sent") return <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Sent</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Failed</button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{m.error ?? "Unknown error"}</TooltipContent>
    </Tooltip>
  );
}

function History() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(messagesQuery(["sent", "failed"]));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "sent" | "failed">("all");
  const rows = data
    .filter((m) => (status === "all" || m.status === status) && matches(q, m.recipient_name, m.phone, m.content))
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  const refresh = () => qc.invalidateQueries({ queryKey: ["messages"] });

  const del = async (m: SmsMessage) => {
    const { error } = await supabase.from("sms_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message); else toast.success("Entry removed"); refresh();
  };
  const retry = async (m: SmsMessage) => {
    const { error } = await supabase.from("sms_messages").update({ status: "scheduled", scheduled_at: new Date().toISOString(), error: null }).eq("id", m.id).eq("status", "failed");
    if (error) toast.error(error.message); else toast.success("Queued for retry (within a minute)"); refresh();
  };

  const actions = (m: SmsMessage) => (
    <div className="flex flex-wrap gap-2">
      {m.status === "failed" && <Button size="sm" variant="outline" onClick={() => retry(m)}><RotateCcw /> Retry</Button>}
      <Confirm title="Delete this entry?" onConfirm={() => del(m)}
        description={m.status === "sent" ? "This removes the entry from the app only. The SMS has already been sent and cannot be recalled." : "This removes the failed entry from the app."}
        trigger={<Button size="sm" variant="ghost"><Trash2 /> Delete</Button>} />
    </div>
  );

  return (
    <TooltipProvider>
      <PageHeader title="History">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as typeof status)} className="rounded-lg bg-muted p-1">
            {(["all", "sent", "failed"] as const).map((s) => <ToggleGroupItem key={s} value={s} className="px-3 capitalize data-[state=on]:bg-card data-[state=on]:shadow-sm">{s}</ToggleGroupItem>)}
          </ToggleGroup>
          <SearchBox value={q} onChange={setQ} />
        </div>
      </PageHeader>
      <Counters />
      {isLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : rows.length === 0 ? (
        <Empty icon={<HistoryIcon className="h-8 w-8" />} title={q || status !== "all" ? "No match" : "No history yet"} text="Sent and failed SMS will show up here." />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {rows.map((m) => (
              <div key={m.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold">{m.recipient_name}</p><p className="text-xs text-muted-foreground">{formatPhone(m.phone)}</p></div>
                  <StatusBadge m={m} />
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">{fmtParis(sortKey(m))}</p>
                {m.status === "failed" && <p className="mt-2 text-xs text-destructive">{m.error}</p>}
                <div className="my-3"><Expandable text={m.content} /></div>
                {actions(m)}
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Recipient</th><th className="p-3">Message</th><th className="p-3">Created by</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t align-top">
                    <td className="whitespace-nowrap p-3 tabular-nums">{fmtParis(sortKey(m))}</td>
                    <td className="p-3"><StatusBadge m={m} /></td>
                    <td className="p-3"><p className="font-medium">{m.recipient_name}</p><p className="text-xs text-muted-foreground">{formatPhone(m.phone)}</p></td>
                    <td className="max-w-xs p-3"><Expandable text={m.content} /></td>
                    <td className="p-3 text-xs text-muted-foreground">{m.created_by}</td>
                    <td className="p-3">{actions(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </TooltipProvider>
  );
}
