import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedUser, RESTRICTED_MSG } from "@/lib/auth-domain";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ denied: s["denied"] === "1" || s["denied"] === 1 ? "1" : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in · SMS Dispatcher" },
      { name: "description", content: "Sign in to SMS Dispatcher with an approved Google account." },
      { property: "og:title", content: "Sign in · SMS Dispatcher" },
      { property: "og:description", content: "Sign in to SMS Dispatcher with an approved Google account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function Login() {
  const { denied } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(denied ? RESTRICTED_MSG : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        if (await isAllowedUser(supabase)) navigate({ to: "/new", replace: true });
        else { await supabase.auth.signOut(); setError(RESTRICTED_MSG); }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not verify access. Please try again.");
      }
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") setTimeout(() => { void check(); }, 0); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setBusy(true); setError(null);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/login",
      extraParams: { prompt: "select_account" },
    });
    if (r.error) { setError(r.error.message ?? "Sign-in failed"); setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">SMS Dispatcher</h1>
        <p className="mt-1 text-sm text-muted-foreground">Internal tool. Sign in with your approved Google account.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button
          onClick={signIn}
          disabled={busy}
          className="google-btn mt-6"
        >
          <GoogleG /> Continue with Google
        </button>
      </div>
    </div>
  );
}
