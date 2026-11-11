import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { statsQuery } from "@/lib/data";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Counters() {
  const { data } = useQuery(statsQuery);
  const items = [
    { label: "Scheduled", value: data?.scheduled, cls: "text-primary" },
    { label: "Sent today", value: data?.sentToday, cls: "text-success" },
    { label: "Failed (7 days)", value: data?.failed7, cls: "text-destructive" },
  ];
  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border bg-card p-3 lg:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:text-xs">{i.label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${i.cls}`}>{i.value ?? "–"}</p>
        </div>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search name, phone or message" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-card pl-9" />
    </div>
  );
}

export function Confirm({ trigger, title, description, action = "Delete", onConfirm }: {
  trigger: ReactNode; title: string; description: ReactNode; action?: string; onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Expandable({ text }: { text: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-1 group-open:hidden">{text}</span>
      </summary>
      <p className="whitespace-pre-wrap text-sm">{text}</p>
    </details>
  );
}
