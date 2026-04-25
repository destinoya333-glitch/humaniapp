/**
 * Auth helpers — bridge Supabase Auth user to mse_users record.
 */
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type AuthedUser = {
  id: string; // mse_users.id (same as auth.user.id)
  email: string;
  needsOnboarding: boolean;
};

/**
 * Get the currently logged in user from cookies.
 * Returns null if not authenticated.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if mse_users row exists with name (means onboarding done)
  const { data: mseUser } = await supabase
    .from("mse_users")
    .select("id, name, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    needsOnboarding: !mseUser || !mseUser.name,
  };
}

/**
 * Service-role client (server-side only) for privileged operations.
 */
export function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
