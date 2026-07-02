import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Defense-in-depth for server-component pages. Middleware already gates every
 * dashboard route, but these pages read all-user data with the service-role
 * client, so we re-confirm the caller here too. If middleware is ever
 * misconfigured, this prevents the page from leaking data.
 *
 *  - assertAdminPage(): full admins only.
 *  - assertEditorPage(): content editors and full admins.
 */
async function guard(allowEditor: boolean): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin, admin_role")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) return redirect("/login?error=unauthorized");
  if (!allowEditor && me?.admin_role === "editor") return redirect("/devotions");
}

export function assertAdminPage(): Promise<void> {
  return guard(false);
}

export function assertEditorPage(): Promise<void> {
  return guard(true);
}
