import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import DevotionForm from "@/components/ui/DevotionForm";

export default async function EditDevotionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: devotion }, { data: questions }] = await Promise.all([
    supabase.from("devotions").select("*").eq("id", params.id).single(),
    supabase.from("devotion_questions").select("*").eq("devotion_id", params.id).order("sort_order"),
  ]);

  if (!devotion) notFound();

  return <DevotionForm initial={{ ...devotion, questions: questions ?? [] }} />;
}
