"use server";

import { requireEditor } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";
import { ensurePublicBucket } from "@/lib/storage";
import { revalidatePath } from "next/cache";

const BUCKET = "music";
const MAX_BYTES = 30 * 1024 * 1024; // 30 MB
const ALLOWED = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/wav", "audio/x-wav"];

/** Read every track (incl. hidden) via service role for the admin list. */
export async function listTracks() {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error, tracks: [] as any[] };
  const { data, error } = await gate.admin!.from("music_tracks").select("*").order("sort_order");
  if (error) return { error: error.message, tracks: [] as any[] };
  return { tracks: data ?? [] };
}

/** Upload an audio file straight to storage and create the track row. */
export async function uploadTrack(formData: FormData): Promise<{ error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const file = formData.get("file");
  if (!title) return { error: "Title is required." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an audio file." };
  if (file.size > MAX_BYTES) return { error: "File is larger than 30 MB." };
  if (file.type && !ALLOWED.includes(file.type)) return { error: `Unsupported audio type: ${file.type}` };

  await ensurePublicBucket(admin, BUCKET);

  const safe = (file.name || "track.mp3").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `tracks/${Date.now()}-${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "audio/mpeg",
    upsert: false,
  });
  if (up.error) return { error: up.error.message };

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // Next sort_order = max + 1.
  const { data: last } = await admin.from("music_tracks").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort_order = (last?.sort_order ?? -1) + 1;

  const { error } = await admin.from("music_tracks").insert({
    title,
    artist: artist || null,
    file_url: publicUrl,
    is_bundled: false,
    is_available: true,
    sort_order,
    file_size_bytes: file.size,
  });
  if (error) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => {});
    return { error: error.message };
  }

  await recordAudit("upload_track", { targetType: "music_tracks", detail: { title } });
  revalidatePath("/music");
  return {};
}

/** Rename a track's title / artist. */
export async function renameTrack(id: string, title: string, artist: string): Promise<{ error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  if (!id || !title.trim()) return { error: "Title is required." };
  const { error } = await gate.admin!.from("music_tracks").update({ title: title.trim(), artist: artist.trim() || null }).eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("rename_track", { targetType: "music_tracks", targetId: id });
  revalidatePath("/music");
  return {};
}

/** Show / hide a track in the app. */
export async function setTrackAvailable(id: string, available: boolean): Promise<{ error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const { error } = await gate.admin!.from("music_tracks").update({ is_available: available }).eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("set_track_available", { targetType: "music_tracks", targetId: id, detail: { available } });
  revalidatePath("/music");
  return {};
}

/** Delete a track row and its uploaded storage object (if any). */
export async function deleteTrack(id: string): Promise<{ error?: string }> {
  const gate = await requireEditor();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const { data: row } = await admin.from("music_tracks").select("file_url, is_bundled").eq("id", id).single();

  const { error } = await admin.from("music_tracks").delete().eq("id", id);
  if (error) return { error: error.message };

  // Best-effort cleanup of the stored file for uploaded (non-bundled) tracks.
  if (row && !row.is_bundled && row.file_url) {
    const marker = `/object/public/${BUCKET}/`;
    const idx = row.file_url.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(row.file_url.slice(idx + marker.length));
      await admin.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  }

  await recordAudit("delete_track", { targetType: "music_tracks", targetId: id });
  revalidatePath("/music");
  return {};
}
