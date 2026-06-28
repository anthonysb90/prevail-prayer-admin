import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { VersionPanel } from "./VersionPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export default async function VersionsPage() {
  const admin = createAdminClient() ?? createClient();
  const { data } = await admin.from("user_push_tokens").select("app_version");
  const rows = (data ?? []) as { app_version: string | null }[];

  const counts = new Map<string, number>();
  let unknown = 0;
  for (const r of rows) {
    const v = r.app_version;
    if (!v) { unknown++; continue; }
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const versions = Array.from(counts.entries())
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => cmpVersion(b.version, a.version));
  const latest = versions.length ? versions[0].version : "";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-tone">App Versions</h1>
        <p className="text-sm text-tone-muted mt-1">
          Which app version each device is running, and a push to nudge anyone who hasn&apos;t updated.
          Versions appear after users open a build that reports them.
        </p>
      </div>
      <VersionPanel versions={versions} unknown={unknown} totalDevices={rows.length} latest={latest} />
    </div>
  );
}
