"use server";

import { requireEditor } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";
import type { ScriptureRow } from "@/lib/csv";

export interface Verse {
  id: string;
  reference: string;
  verse_text: string;
  topic: string;
  is_featured: boolean;
  sort_order?: number;
}

/** All verses for a topic (server-side, service-role). */
export async function listVerses(topic: string): Promise<{ verses: Verse[]; error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { verses: [], error: gate.error };
  const { data, error } = await gate.admin!
    .from("scripture_verses")
    .select("id, reference, verse_text, topic, is_featured, sort_order")
    .eq("topic", topic)
    .order("sort_order");
  if (error) return { verses: [], error: error.message };
  return { verses: (data ?? []) as Verse[] };
}

/** Add a single verse to a topic. */
export async function addVerse(
  topic: string,
  reference: string,
  verseText: string,
): Promise<{ verse?: Verse; error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const ref = reference.trim();
  const text = verseText.trim();
  if (!ref || !text) return { error: "Reference and verse text are required." };

  const { data: last } = await gate.admin!
    .from("scripture_verses")
    .select("sort_order")
    .eq("topic", topic)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (last?.sort_order ?? -1) + 1;

  const { data, error } = await gate.admin!
    .from("scripture_verses")
    .insert({ reference: ref, verse_text: text, topic, sort_order })
    .select("id, reference, verse_text, topic, is_featured, sort_order")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not add verse." };

  await recordAudit("add_scripture_verse", { targetType: "scripture_verses", targetId: data.id, detail: { topic } });
  return { verse: data as Verse };
}

/** Delete a verse. */
export async function deleteVerse(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "Missing id." };
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const { error } = await gate.admin!.from("scripture_verses").delete().eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("delete_scripture_verse", { targetType: "scripture_verses", targetId: id });
  return {};
}

/** Toggle a verse's featured flag. */
export async function setVerseFeatured(id: string, featured: boolean): Promise<{ error?: string }> {
  if (!id) return { error: "Missing id." };
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const { error } = await gate.admin!.from("scripture_verses").update({ is_featured: featured }).eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("feature_scripture_verse", { targetType: "scripture_verses", targetId: id, detail: { featured } });
  return {};
}

/** Bulk-import verses from a parsed CSV. */
export async function importVerses(items: ScriptureRow[]): Promise<{ imported?: number; error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const clean = (items ?? []).filter((it) => it.reference?.trim() && it.verse_text?.trim() && it.topic?.trim());
  if (clean.length === 0) return { error: "No valid rows to import." };

  // sort_order: sequential within each topic (appended after existing).
  const byTopic: Record<string, number> = {};
  const payload = clean.map((it) => {
    const n = byTopic[it.topic] ?? 0;
    byTopic[it.topic] = n + 1;
    return {
      reference: it.reference.trim(),
      verse_text: it.verse_text.trim(),
      topic: it.topic.trim(),
      is_featured: it.is_featured,
      sort_order: n,
    };
  });

  const { data, error } = await gate.admin!.from("scripture_verses").insert(payload).select("id");
  if (error) return { error: error.message };
  await recordAudit("import_scripture", { targetType: "scripture_verses", detail: { count: data?.length ?? clean.length } });
  return { imported: data?.length ?? clean.length };
}
