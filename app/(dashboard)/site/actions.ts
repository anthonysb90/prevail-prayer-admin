"use server";

import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";

// Slugs the admin is allowed to edit. Each maps to a [data-cms="<slug>"] block
// on the marketing site, which renders this Markdown at page load.
const ALLOWED_SLUGS = ["privacy", "support", "contact", "terms"];

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
