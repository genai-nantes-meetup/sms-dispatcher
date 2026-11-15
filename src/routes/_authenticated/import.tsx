import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, FileUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_CSV, parseSmsCsv, type CsvRow } from "@/lib/csv";
import { fillTemplate } from "@/lib/template";
import { formatPhone } from "@/lib/phone";
import { fmtParis } from "@/lib/time";
import { PageHeader } from "@/components/app/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Import CSV · SMS Dispatcher" }, { name: "description", content: "Schedule SMS in bulk from a CSV file." }, { property: "og:title", content: "Import CSV · SMS Dispatcher" }, { property: "og:description", content: "Schedule SMS in bulk from a CSV file." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ImportPage,
});

function ImportPage() {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const valid = rows.filter((r) => r.errors.length === 0);

  const load = async (f: File) => {
    const text = await f.text();
    const r = parseSmsCsv(text);
    setFile(f.name); setRows(r.rows); setHeaderError(r.headerError); setWarnings([]);
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const phones = [...new Set(valid.map((r) => r.phone!))];
      const { data: existing, error: e1 } = await supabase.from("recipients").select("id,name,first_name,last_name,phone").in("phone", phones);
      if (e1) throw e1;
      const byPhone = new Map(existing.map((r) => [r.phone, r]));
      const toCreate = phones.filter((p) => !byPhone.has(p)).map((p) => { const v = valid.find((r) => r.phone === p)!; return { phone: p, first_name: v.firstName, last_name: v.lastName }; });
      if (toCreate.length) {
        const { data: created, error: e2 } = await supabase.from("recipients").insert(toCreate).select("id,name,first_name,last_name,phone");
        if (e2) throw e2;
        created.forEach((r) => byPhone.set(r.phone, r));
      }
      const w: string[] = [];
      for (const r of valid) {
        const rec = byPhone.get(r.phone!)!;
        if (existing.some((e) => e.phone === r.phone) && rec.name !== r.name) w.push(`Line ${r.line}: ${formatPhone(r.phone!)} is saved as "${rec.name}" (CSV says "${r.name}"), stored name kept.`);
      }
      const batch = crypto.randomUUID();
      const { error: e3 } = await supabase.from("sms_messages").insert(valid.map((r) => {
        const rec = byPhone.get(r.phone!)!;
        return { recipient_id: rec.id, recipient_name: rec.name, phone: r.phone!, content: fillTemplate(r.message, rec), scheduled_at: r.sendAt!.toISOString(), status: "scheduled" as const, source: "csv" as const, import_batch_id: batch };
      }));
      if (e3) throw e3;
      toast.success(`${valid.length} imported, ${rows.length - valid.length} skipped`);
      setWarnings(w); setRows([]); setFile(null);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally { setBusy(false); }
  };

  const copyDemo = async () => { await navigator.clipboard.writeText(DEMO_CSV); toast.success("Demo CSV copied"); };
  const downloadDemo = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([DEMO_CSV], { type: "text/csv;charset=utf-8" }));
    a.download = "demo.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader title="Import CSV" subtitle="Schedule many SMS at once. Times use your browser timezone." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) load(f); }}
            onClick={() => input.current?.click()}
            className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${drag ? "border-primary bg-accent" : "bg-card hover:border-primary/50"}`}
          >
            <FileUp className="mb-3 h-8 w-8 text-primary" />
            <p className="font-semibold">{file ?? "Drop a CSV file here"}</p>
            <p className="text-sm text-muted-foreground">or click to choose a file (comma or semicolon)</p>
            <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
          </div>
          {headerError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{headerError}</p>}
          {warnings.length > 0 && (
            <div className="space-y-1 rounded-lg bg-warning/15 p-3 text-sm">
              {warnings.map((w) => <p key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{w}</p>)}
            </div>
          )}
          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm"><b>{valid.length}</b> valid · <b className="text-destructive">{rows.length - valid.length}</b> invalid</p>
                <Button onClick={doImport} disabled={busy || valid.length === 0}>{busy ? "Importing…" : `Import ${valid.length} valid rows`}</Button>
              </div>
              <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="p-3">#</th><th className="p-3">Phone</th><th className="p-3">First name</th><th className="p-3">Last name</th><th className="p-3">Message</th><th className="p-3">Send at</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className={`border-t align-top ${r.errors.length ? "bg-destructive/10" : ""}`}>
                        <td className="p-3 text-muted-foreground">{r.line}</td>
                        <td className="whitespace-nowrap p-3">{r.phone ? formatPhone(r.phone) : r.raw["phone"]}</td>
                        <td className="p-3">{r.firstName}</td><td className="p-3">{r.lastName}</td>
                        <td className="max-w-xs p-3"><span className="line-clamp-2">{r.message}</span></td>
                        <td className="whitespace-nowrap p-3">{r.sendAt ? fmtParis(r.sendAt.toISOString()) : r.raw["send_at"]}</td>
                        <td className="p-3">{r.errors.length ? <span className="text-xs font-medium text-destructive">{r.errors.join(", ")}</span> : <span className="text-xs font-medium text-success">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside className="h-fit min-w-0 space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">CSV format</h2>
          <table className="w-full text-sm">
            <tbody className="[&_td]:py-1.5 [&_td]:align-top">
              <tr><td className="pr-3 font-mono text-xs font-medium">phone</td><td className="text-muted-foreground">French or international number (+33…, 06…, +44…)</td></tr>
              <tr><td className="pr-3 font-mono text-xs font-medium">firstname</td><td className="text-muted-foreground">Recipient first name</td></tr>
              <tr><td className="pr-3 font-mono text-xs font-medium">lastname</td><td className="text-muted-foreground">Recipient last name</td></tr>
              <tr><td className="pr-3 font-mono text-xs font-medium">message</td><td className="text-muted-foreground">SMS text; quote it if it contains commas. Variables: $firstname, $lastname, $fullname</td></tr>
              <tr><td className="pr-3 font-mono text-xs font-medium">send_at</td><td className="text-muted-foreground">YYYY-MM-DD HH:mm or DD/MM/YYYY HH:mm, your local time, in the future</td></tr>
            </tbody>
          </table>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed">{DEMO_CSV}</pre>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyDemo}><Copy /> Copy</Button>
            <Button variant="outline" size="sm" onClick={downloadDemo}><Download /> Download demo.csv</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
