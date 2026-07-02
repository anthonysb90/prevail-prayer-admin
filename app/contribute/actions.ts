"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkContributorPassword, storedPasswordHash } from "@/lib/contributorAuth";
import { ensurePublicBucket } from "@/lib/storage";

function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim()) || h.get("x-real-ip") || "unknown";
}

// Local alias so existing call sites read the same.
const checkPassword = checkContributorPassword;

/** Count recent contribute attempts (password checks + submissions) from an IP,
 *  used to throttle both brute-force guessing and submission floods. */
async function recentAttempts(ip: string, windowMs: number): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await admin
    .from("contribute_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  return count ?? 0;
}

async function logAttempt(ip: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("contribute_attempts").insert({ ip }).then(() => {}, () => {});
}

/** Phase 1: check the shared password before revealing the form.
 *  Rate-limited per IP so the shared password can't be brute-forced. */
export async function verifyContributorPassword(password: string): Promise<{ ok?: boolean; error?: string }> {
  if (!(await storedPasswordHash())) return { error: "Submissions are not enabled yet." };

  const ip = clientIp();
  // Max 10 password attempts per 10 minutes per IP.
  if ((await recentAttempts(ip, 600_000)) >= 10) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  await logAttempt(ip);

  if (!(await checkPassword(password))) return { error: "Incorrect password." };
  return { ok: true };
}

interface DevotionSubmission {
  author: string;
  title: string;
  image_url: string;
  scripture_reference: string;
  scripture_text: string;
  body: string;
  closing_prayer: string;
  questions: string[];
}

const IMAGE_BUCKET = "devotion-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/** Upload a contributor's own image to a public bucket; returns its URL. */
export async function uploadDevotionImage(
  password: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  if (!(await checkPassword(password))) return { error: "Incorrect password." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image is larger than 8 MB." };
  if (file.type && !file.type.startsWith("image/")) return { error: "That file isn't an image." };

  const admin = createAdminClient();
  if (!admin) return { error: "Uploads are temporarily unavailable." };

  await ensurePublicBucket(admin, IMAGE_BUCKET);
  const safe = (file.name || "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `submissions/${Date.now()}-${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const up = await admin.storage.from(IMAGE_BUCKET).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (up.error) return { error: up.error.message };
  return { url: admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}

/**
 * Submit a devotion as an UNPUBLISHED draft for admin approval.
 * The contributor can never publish — is_published is hard-coded false here.
 */
export async function submitDevotion(
  password: string,
  s: DevotionSubmission
): Promise<{ ok?: boolean; error?: string }> {
  if (!(await checkPassword(password))) return { error: "Incorrect password." };

  const title = s.title.trim();
  const body = s.body.trim();
  const author = s.author.trim();
  if (!author) return { error: "Please add your name." };
  if (!title) return { error: "Title is required." };
  if (body.length < 40) return { error: "Please write a fuller devotion body." };

  const admin = createAdminClient();
  if (!admin) return { error: "Submissions are temporarily unavailable." };

  // Rate-limit by IP in case the link leaks (max 15 submissions / hour).
  const ip = clientIp();
  if ((await recentAttempts(ip, 3600_000)) >= 15) {
    return { error: "Too many submissions from your network. Please try again later." };
  }
  await logAttempt(ip);

  const { data, error } = await admin
    .from("devotions")
    .insert({
      title,
      body,
      image_url: s.image_url.trim() || null,
      scripture_reference: s.scripture_reference.trim() || null,
      scripture_text: s.scripture_text.trim() || null,
      closing_prayer: s.closing_prayer.trim() || null,
      is_published: false, // contributor cannot publish — admin approves
      published_at: null,
      scheduled_for: null,
      submitted_by: author,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const questions = s.questions.map((q) => q.trim()).filter(Boolean);
  if (data?.id && questions.length > 0) {
    await admin
      .from("devotion_questions")
      .insert(questions.map((q, i) => ({ devotion_id: data.id, question_text: q, sort_order: i })))
      .then(() => {}, () => {});
  }

  return { ok: true };
}
