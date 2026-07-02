"use server";

import { recordAudit } from "@/lib/audit";
import { requireEditor } from "@/lib/authz";
import type { DevotionRow } from "@/lib/csv";
import { revalidatePath } from "next/cache";

/** Permanently delete one or more devotions (and their reflection questions). */
export async function deleteDevotions(ids: string[]): Promise<{ error?: string; deleted?: number }> {
  const clean = (ids ?? []).filter(Boolean);
  if (clean.length === 0) return { error: "Nothing selected." };
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };

  await gate.admin!.from("devotion_questions").delete().in("devotion_id", clean);
  const { error } = await gate.admin!.from("devotions").delete().in("id", clean);
  if (error) return { error: error.message };

  await recordAudit("delete_devotions", { targetType: "devotions", targetId: `${clean.length} items`, detail: { count: clean.length } });
  revalidatePath("/devotions");
  return { deleted: clean.length };
}

export interface DevotionInput {
  id?: string;
  title: string;
  image_url: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  body: string;
  closing_prayer: string | null;
  is_published: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  questions: string[];
}

/** Create or update a devotion (and its reflection questions) via the service key. */
export async function saveDevotion(input: DevotionInput): Promise<{ error?: string; id?: string }> {
  if (!input.title?.trim() || !input.body?.trim()) return { error: "Title and body are required." };
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const row = {
    title: input.title.trim(),
    image_url: input.image_url,
    scripture_reference: input.scripture_reference,
    scripture_text: input.scripture_text,
    body: input.body.trim(),
    closing_prayer: input.closing_prayer,
    is_published: input.is_published,
    published_at: input.published_at,
    scheduled_for: input.scheduled_for,
  };

  let id = input.id;
  if (id) {
    const { error } = await admin.from("devotions").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin.from("devotions").insert(row).select("id").single();
    if (error || !data) return { error: error?.message ?? "Insert failed." };
    id = data.id as string;
  }

  await admin.from("devotion_questions").delete().eq("devotion_id", id);
  const qs = (input.questions ?? []).map((q) => q.trim()).filter(Boolean);
  if (qs.length) {
    await admin.from("devotion_questions").insert(qs.map((q, i) => ({ devotion_id: id, question_text: q, sort_order: i })));
  }

  await recordAudit(input.id ? "edit_devotion" : "create_devotion", { targetType: "devotions", targetId: id });
  revalidatePath("/devotions");
  return { id };
}

/** Delete a single devotion. */
export async function deleteDevotion(id: string): Promise<{ error?: string }> {
  return deleteDevotions([id]);
}

// publish_date: "" or invalid -> draft; <= today (UTC) -> publish now; future -> scheduled.
function classifyPublishDate(dateStr: string): { kind: "now" | "scheduled" | "draft"; iso: string | null } {
  if (!dateStr) return { kind: "draft", iso: null };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { kind: "draft", iso: null };
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime() ? { kind: "now", iso: d.toISOString() } : { kind: "scheduled", iso: d.toISOString() };
}

/** Bulk-import devotions (and reflection questions) from a parsed CSV. */
export async function importDevotions(items: DevotionRow[]): Promise<{ imported?: number; error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const clean = (items ?? []).filter((it) => it.title?.trim() && it.body?.trim());
  if (clean.length === 0) return { error: "No valid rows to import (title and body are required)." };

  const payload = clean.map((it) => {
    const c = classifyPublishDate(it.publish_date);
    return {
      title: it.title.trim(),
      image_url: it.image_url?.trim() || null,
      scripture_reference: it.scripture_reference?.trim() || null,
      scripture_text: it.scripture_text?.trim() || null,
      body: it.body.trim(),
      closing_prayer: it.closing_prayer?.trim() || null,
      is_published: c.kind === "now",
      published_at: c.kind === "now" ? c.iso : null,
      scheduled_for: c.kind === "scheduled" ? c.iso : null,
    };
  });

  const { data, error } = await admin.from("devotions").insert(payload).select("id");
  if (error || !data) return { error: error?.message ?? "Import failed." };

  // Reflection questions (pipe-separated), matched to inserted rows by index.
  const questions: { devotion_id: string; question_text: string; sort_order: number }[] = [];
  data.forEach((row: { id: string }, i: number) => {
    const raw = clean[i].reflection_questions;
    if (!raw) return;
    raw.split("|").map((q) => q.trim()).filter(Boolean).forEach((q, qi) => {
      questions.push({ devotion_id: row.id, question_text: q, sort_order: qi });
    });
  });
  if (questions.length) {
    const { error: qErr } = await admin.from("devotion_questions").insert(questions);
    if (qErr) return { imported: data.length, error: `Devotions imported, but questions failed: ${qErr.message}` };
  }

  await recordAudit("import_devotions", { targetType: "devotions", detail: { count: data.length } });
  revalidatePath("/devotions");
  return { imported: data.length };
}

export interface GeneratedDevotion {
  title: string;
  scripture_reference: string;
  scripture_text: string;
  body: string;
  closing_prayer: string;
  questions: string[];
}

/** Ask the generate-devotion edge function to draft a devotion from a prompt,
 *  using already-published devotions as style examples. */
export async function generateDevotion(prompt: string): Promise<{ error?: string; devotion?: GeneratedDevotion }> {
  if (!prompt?.trim()) return { error: "Enter a topic, verse, or idea." };
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: "Supabase isn't configured for AI generation." };

  try {
    const res = await fetch(`${url}/functions/v1/generate-devotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ prompt: prompt.trim() }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (j && j.error) || `Generator returned ${res.status}.` };
    const d = j.devotion;
    if (!d || !d.title || !d.body) return { error: "The AI didn't return a usable devotion. Try again." };
    return {
      devotion: {
        title: String(d.title ?? ""),
        scripture_reference: String(d.scripture_reference ?? ""),
        scripture_text: String(d.scripture_text ?? ""),
        body: String(d.body ?? ""),
        closing_prayer: String(d.closing_prayer ?? ""),
        questions: Array.isArray(d.questions) ? d.questions.map((q: unknown) => String(q)).filter(Boolean) : [],
      },
    };
  } catch {
    return { error: "Couldn't reach the AI generator." };
  }
}

/** Find the earliest date (from today, UTC) with no published or scheduled devotion. */
export async function getNextAvailableDate(): Promise<{ error?: string; date?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };

  const { data } = await gate.admin!.from("devotions").select("published_at, scheduled_for");
  const taken = new Set<string>();
  for (const d of (data ?? []) as { published_at: string | null; scheduled_for: string | null }[]) {
    const iso = d.scheduled_for ?? d.published_at;
    if (iso) taken.add(iso.slice(0, 10));
  }
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < 800; i++) {
    const key = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    if (!taken.has(key)) return { date: key };
  }
  return { error: "No open date found in the next two years." };
}

/** Delete every draft (unpublished, unscheduled) devotion. */
export async function deleteAllDrafts(): Promise<{ error?: string; deleted?: number }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };

  const { data: rows } = await gate.admin!
    .from("devotions").select("id").eq("is_published", false).is("scheduled_for", null);
  const ids = (rows ?? []).map((r: { id: string }) => r.id);
  if (ids.length === 0) return { deleted: 0 };

  await gate.admin!.from("devotion_questions").delete().in("devotion_id", ids);
  const { error } = await gate.admin!.from("devotions").delete().in("id", ids);
  if (error) return { error: error.message };

  await recordAudit("delete_all_drafts", { targetType: "devotions", targetId: "drafts", detail: { count: ids.length } });
  revalidatePath("/devotions");
  return { deleted: ids.length };
}
