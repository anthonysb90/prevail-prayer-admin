"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// Slugs the admin is allowed to edit. Each maps to a [data-cms="<slug>"] block
// on the marketing site, which renders this Markdown at page load.
const ALLOWED_SLUGS = ["privacy", "support", "contact", "terms"];

async function requireAdmin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { error: "Not signed in." as string };
  const { data: me } = await supabase.from("profiles").select("is_admin, admin_role").eq("id", auth.user.id).single();
  if (!me?.is_admin || me.admin_role === "editor") return { error: "Admins only." as string };
  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured." as string };
  return { admin };
}

export async function saveSiteContent(slug: string, body: string): Promise<{ error?: string }> {
  if (!ALLOWED_SLUGS.includes(slug)) return { error: "Unknown page." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const { error } = await admin
    .from("site_content")
    .upsert({ slug, body: body ?? "", updated_at: new Date().toISOString() }, { onConflict: "slug" });
  if (error) return { error: error.message };
  await recordAudit("edit_site_content", { targetType: "site_content", targetId: slug });
  revalidatePath("/site");
  return {};
}
