import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isAllowedUser } from "./auth-domain";

function client(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { db: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("database access gate", () => {
  it("asks the database about the authenticated caller, without supplying an email", async () => {
    const { db, rpc } = client(true);
    expect(await isAllowedUser(db)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("is_allowed_user");
  });
  it.each([false, null, undefined, "true"])("denies access for %s", async (value) => {
    expect(await isAllowedUser(client(value).db)).toBe(false);
  });
  it("fails closed when the access check fails", async () => {
    await expect(isAllowedUser(client(true, { message: "unavailable" }).db)).rejects.toThrow();
  });
});