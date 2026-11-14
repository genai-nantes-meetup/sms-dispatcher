import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recipientsQuery, recipientStatsQuery, matches, type Recipient } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { fmtParis } from "@/lib/time";
import { PageHeader, SearchBox, Confirm, Empty } from "@/components/app/common";
import { RecipientDialog } from "@/components/app/RecipientDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/recipients")({
  head: () => ({ meta: [{ title: "Recipients · SMS Dispatcher" }, { name: "description", content: "Saved SMS recipients." }, { property: "og:title", content: "Recipients · SMS Dispatcher" }, { property: "og:description", content: "Saved SMS recipients." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Recipients,
});

function Recipients() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(recipientsQuery);
  const { data: stats } = useQuery(recipientStatsQuery);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [open, setOpen] = useState(false);
  const rows = data.filter((r) => matches(q, r.name, r.phone));

  const del = async (r: Recipient) => {
    const { error } = await supabase.from("recipients").delete().eq("id", r.id);
    if (error) toast.error(error.message); else toast.success("Recipient deleted");
    qc.invalidateQueries({ queryKey: ["recipients"] });
  };
  const edit = (r: Recipient | null) => { setEditing(r); setOpen(true); };
  const actions = (r: Recipient) => (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" onClick={() => edit(r)}><Pencil /> Edit</Button>
      <Confirm title={`Delete ${r.name}?`} description="Past messages keep their name and number." onConfirm={() => del(r)}
        trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 /> Delete</Button>} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Recipients">
        <div className="flex w-full gap-2 sm:w-auto">
          <SearchBox value={q} onChange={setQ} placeholder="Search name or phone" />
          <Button onClick={() => edit(null)}><Plus /> <span className="hidden sm:inline">Add recipient</span></Button>
        </div>
      </PageHeader>
      {isLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : rows.length === 0 ? (
        <Empty icon={<Users className="h-8 w-8" />} title={q ? "No match" : "No recipients yet"} text={q ? "Try another search." : "Add a recipient or import a CSV to get started."} />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {rows.map((r) => { const s = stats?.get(r.id); return (
              <div key={r.id} className="rounded-xl border bg-card p-4">
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">{formatPhone(r.phone)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s?.count ?? 0} sent · last {fmtParis(s?.last)}</p>
                <div className="mt-2">{actions(r)}</div>
              </div>); })}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">SMS sent</th><th className="p-3">Last SMS</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => { const s = stats?.get(r.id); return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 tabular-nums">{formatPhone(r.phone)}</td>
                    <td className="p-3 tabular-nums">{s?.count ?? 0}</td>
                    <td className="p-3 tabular-nums text-muted-foreground">{fmtParis(s?.last)}</td>
                    <td className="p-3">{actions(r)}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <RecipientDialog open={open} onOpenChange={setOpen} existing={editing} />
    </div>
  );
}
