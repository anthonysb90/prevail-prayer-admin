import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_DEFAULTS } from "@/lib/siteDefaults";
import { SiteContentEditor } from "./SiteContentEditor";

export const dynamic = "force-dynamic";

const PAGES = [
  { slug: "privacy", label: "Privacy Policy", path: "/privacy" },
  { slug: "support", label: "Support", path: "/support" },
  { slug: "contact", label: "Contact", path: "/contact" },
  { slug: "terms", label: "Terms of Service", path: "/terms" },
];

export default async function SitePage() {
  const admin = createAdminClient() ?? createClient();
  const { data } = await admin.from("site_content").select("slug, body, updated_at");
  const map = new Map((data ?? []).map((r: { slug: string; body: string; updated_at: string }) => [r.slug, r]));

  const blocks = PAGES.map((p) => ({
    ...p,
    body: (map.get(p.slug)?.body as string) ?? "",
    defaultBody: SITE_DEFAULTS[p.slug] ?? "",
    updatedAt: (map.get(p.slug)?.updated_at as string) ?? null,
  }));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-tone">Site Content</h1>
        <p className="text-sm text-tone-muted mt-1">
          Edit the public marketing pages in Markdown. Privacy and Terms load with their current published
          text so you can edit in place. Changes go live on the site immediately — no redeploy.
        </p>
      </div>
      <SiteContentEditor blocks={blocks} />
    </div>
  );
}
