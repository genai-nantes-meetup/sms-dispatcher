import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const RESTRICTED_MSG =
  "This app is restricted to approved Google accounts.";

// The database checks the verified caller's email, never a browser-supplied email.
export async function isAllowedUser(db: SupabaseClient<Database>): Promise<boolean> {
  const { data, error } = await db.rpc("is_allowed_user");
  if (error) throw new Error("Could not verify access. Please try again.");
  return data === true;
}
