import { useState, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/phone";
import type { Recipient } from "@/lib/data";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function RecipientDialog({ open, onOpenChange, existing, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; existing?: Recipient | null; onSaved?: (r: Recipient) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [err, setErr] = useState<{ name?: string; phone?: string }>({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(existing?.name ?? ""); setPhone(existing?.phone ?? ""); setErr({}); } }, [open, existing]);

  const save = async () => {
    const e: typeof err = {};
    const p = normalizePhone(phone);
    if (!name.trim()) e.name = "Name is required";
    if (!p) e.phone = "Invalid phone number";
    if (p) {
      const { data: dup } = await supabase.from("recipients").select("id,name").eq("phone", p).maybeSingle();
      if (dup && dup.id !== existing?.id) e.phone = `This number is already saved as ${dup.name}`;
    }
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    const q = existing
      ? supabase.from("recipients").update({ name: name.trim(), phone: p! }).eq("id", existing.id).select().single()
      : supabase.from("recipients").insert({ name: name.trim(), phone: p! }).select().single();
    const { data, error } = await q;
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Recipient updated" : "Recipient saved");
    qc.invalidateQueries({ queryKey: ["recipients"] });
    onSaved?.(data); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit recipient" : "New recipient"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name" error={err.name}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice Martin" /></Field>
          <Field label="Phone" error={err.phone}><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" inputMode="tel" /></Field>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
