import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, History, LogOut, MessageSquarePlus, Upload, Users, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/new", label: "New SMS", icon: MessageSquarePlus },
  { to: "/scheduled", label: "Scheduled", icon: CalendarClock },
  { to: "/history", label: "History", icon: History },
  { to: "/recipients", label: "Recipients", icon: Users },
  { to: "/import", label: "Import", icon: Upload },
] as const;

export function AppShell() {
  const { email } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", search: { denied: undefined }, replace: true });
  };
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-6 font-bold text-sidebar-accent-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><MessageSquareText className="h-4 w-4" /></span>
          SMS Dispatcher
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <p className="truncate" title={email}>{email}</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 text-sidebar-primary hover:underline"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
      </aside>
      <div className="flex-1 lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <span className="flex items-center gap-2 font-bold"><MessageSquareText className="h-5 w-5 text-primary" /> SMS Dispatcher</span>
          <div className="flex items-center gap-2">
            <span className="max-w-[140px] truncate text-xs text-muted-foreground">{email}</span>
            <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sign out"><LogOut /> <span className="sr-only sm:not-sr-only">Sign out</span></Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-10 lg:pb-12 lg:pt-10"><Outlet /></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card lg:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}>
            <n.icon className="h-5 w-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
