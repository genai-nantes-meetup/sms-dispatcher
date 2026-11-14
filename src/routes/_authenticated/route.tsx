import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedUser } from "@/lib/auth-domain";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { denied: undefined } });
    if (!data.user.email || !(await isAllowedUser(supabase))) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login", search: { denied: "1" } });
    }
    return { email: data.user.email };
  },
  component: AppShell,
});
