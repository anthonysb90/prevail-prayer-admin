"use server";

import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { sendExpoPush } from "@/lib/notify";
import { fetchAllRows } from "@/lib/paginate";

/** Push an update nudge to every device whose app_version isn't `latest`. */
export async function notifyOutdated(latest: string, title: string, body: string): Promise<{ sent?: number; error?: string }> {
  if (!latest.trim()) return { error: "Enter the latest version." };
  if (!title.trim() || !body.trim()) return { error: "Enter a title and message." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const data = await fetchAllRows<{ expo_push_token: string | null; app_version: string | null }>(
    gate.admin!,
    "user_push_tokens",
    "expo_push_token, app_version",
  );
  const tokens = data
    .filter((t) => t.expo_push_token && (t.app_version ?? "") !== latest.trim())
    .map((t) => t.expo_push_token as string);
  const unique = Array.from(new Set(tokens));

  const sent = await sendExpoPush(unique, title.trim(), body.trim(), "app_update");
  await recordAudit("notify_outdated", { detail: { latest: latest.trim(), sent } });
  return { sent };
}
