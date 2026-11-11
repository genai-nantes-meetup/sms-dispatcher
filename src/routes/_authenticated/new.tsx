import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recipientsQuery, type Recipient } from "@/lib/data";
import { formatPhone } from "@/lib/phone";
import { smsStats } from "@/lib/sms-encoding";
import { nowParisInput, parisToDate, fmtParis } from "@/lib/time";
import { sendSmsNow } from "@/lib/sms.functions";
import { PageHeader } from "@/components/app/common";
import { RecipientDialog, Field } from "@/components/app/RecipientDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "New SMS · SMS Dispatcher" }, { name: "description", content: "Send or schedule an SMS." }, { property: "og:title", content: "New SMS · SMS Dispatcher" }, { property: "og:description", content: "Send or schedule an SMS." }] }),
  component: NewSms,
});

function NewSms() {
  const qc = useQueryClient();
  const send = useServerFn(sendSmsNow);
  const { data: recipients = [] } = useQuery(recipientsQuery);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(nowParisInput(60));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const stats = smsStats(content);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!recipient) e.recipient = "Choose a recipient";
    if (!content.trim()) e.content = "Write a message";
    let at: Date | null = null;
    if (mode === "schedule") {
      at = when ? parisToDate(when) : null;
      if (!at || isNaN(at.getTime())) e.when = "Pick a date and time";
      else if (at.getTime() < Date.now() + 60000) e.when = "Must be at least 1 minute in the future";
    }
    setErrors(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      if (mode === "now") {
        const r = await send({ data: { recipientId: recipient!.id, name: recipient!.name, phone: recipient!.phone, content } });
        if (r.ok) { toast.success(`SMS sent to ${recipient!.name}`); setContent(""); }
        else toast.error(`Sending failed: ${r.error}`);
      } else {
        const { error } = await supabase.from("sms_messages").insert({
          recipient_id: recipient!.id, recipient_name: recipient!.name, phone: recipient!.phone,
          content: content.trim(), scheduled_at: at!.toISOString(), status: "scheduled", source: "form",
        });
        if (error) throw error;
        toast.success(`Scheduled for ${fmtParis(at!.toISOString())} (Paris)`); setContent("");
      }
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="New SMS" subtitle="Send right away or schedule for later (Paris time)." />
      <div className="space-y-5 rounded-2xl border bg-card p-5 lg:p-6">
        <Field label="Recipient" error={errors.recipient}>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 w-full justify-between font-normal">
                {recipient ? <span className="truncate">{recipient.name} <span className="text-muted-foreground">· {formatPhone(recipient.phone)}</span></span> : <span className="text-muted-foreground">Search recipients…</span>}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) || value.replace(/\D/g, "").includes(search.replace(/\D/g, "") || "§") ? 1 : 0)}>
                <CommandInput placeholder="Name or phone…" />
                <CommandList>
                  <CommandEmpty>No recipient found.</CommandEmpty>
                  <CommandGroup>
                    {recipients.map((r) => (
                      <CommandItem key={r.id} value={`${r.name} ${r.phone} ${r.id}`} onSelect={() => { setRecipient(r); setOpen(false); }}>
                        <Check className={recipient?.id === r.id ? "opacity-100" : "opacity-0"} />
                        <span className="truncate">{r.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{formatPhone(r.phone)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem value="__new__ + new recipient" onSelect={() => { setOpen(false); setDialog(true); }}>
                      <Plus /> New recipient
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Field>

        <Field label="Message" error={errors.content}>
          <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your message…" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>{stats.chars} chars</span><span>{stats.encoding}</span>
            <span>{stats.segments} segment{stats.segments === 1 ? "" : "s"}</span>
          </div>
          {stats.segments > 3 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Long message: {stats.segments} segments will be billed.</p>
          )}
        </Field>

        <Field label="When" error={errors.when}>
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as "now" | "schedule")} className="w-full rounded-lg bg-muted p-1">
            <ToggleGroupItem value="now" className="flex-1 data-[state=on]:bg-card data-[state=on]:shadow-sm">Send now</ToggleGroupItem>
            <ToggleGroupItem value="schedule" className="flex-1 data-[state=on]:bg-card data-[state=on]:shadow-sm">Schedule</ToggleGroupItem>
          </ToggleGroup>
          {mode === "schedule" && (
            <div className="pt-2">
              <Input type="datetime-local" value={when} min={nowParisInput(1)} onChange={(e) => setWhen(e.target.value)} className="h-11" />
              <p className="mt-1 text-xs text-muted-foreground">Europe/Paris time</p>
            </div>
          )}
        </Field>

        <Button onClick={submit} disabled={busy} size="lg" className="w-full">
          {busy ? (mode === "now" ? "Sending…" : "Scheduling…") : mode === "now" ? "Send now" : "Schedule SMS"}
        </Button>
      </div>
      <RecipientDialog open={dialog} onOpenChange={setDialog} onSaved={(r) => setRecipient(r)} />
    </div>
  );
}
