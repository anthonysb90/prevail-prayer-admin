"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { providerForModel } from "@/lib/anthropicCost";
import { revalidatePath } from "next/cache";

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

export async function saveModelPrice(model: string, inputPerMtok: number, outputPerMtok: number): Promise<{ error?: string }> {
  if (!model) return { error: "Missing model." };
  if (!(inputPerMtok >= 0) || !(outputPerMtok >= 0)) return { error: "Prices must be 0 or more." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { error } = await gate.admin!
    .from("ai_model_prices")
    .update({ input_per_mtok: inputPerMtok, output_per_mtok: outputPerMtok, updated_at: new Date().toISOString() })
    .eq("model", model);
  if (error) return { error: error.message };
  await recordAudit("edit_model_price", { targetType: "ai_model_prices", targetId: model, detail: { inputPerMtok, outputPerMtok } });
  revalidatePath("/ai-costs");
  return {};
}

export async function addModelPrice(
  model: string,
  label: string,
  inputPerMtok: number,
  outputPerMtok: number,
): Promise<{ error?: string }> {
  const cleanModel = model.trim();
  if (!cleanModel) return { error: "Enter a model id." };
  if (!(inputPerMtok >= 0) || !(outputPerMtok >= 0)) return { error: "Prices must be 0 or more." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { error } = await gate.admin!
    .from("ai_model_prices")
    .upsert(
      {
        model: cleanModel,
        label: label.trim() || cleanModel,
        input_per_mtok: inputPerMtok,
        output_per_mtok: outputPerMtok,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "model" },
    );
  if (error) return { error: error.message };
  await recordAudit("add_model_price", { targetType: "ai_model_prices", targetId: cleanModel, detail: { inputPerMtok, outputPerMtok } });
  revalidatePath("/ai-costs");
  return {};
}

// Which model each import mode uses. Stored as a single ai_settings row.
export async function saveAiModels(visionModel: string, textModel: string): Promise<{ error?: string }> {
  const vision = visionModel.trim();
  const text = textModel.trim();
  if (!vision || !text) return { error: "Pick a model for both photo and text." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  // Provider is inferred from each model id (gemini-* → Gemini, else Anthropic).
  const visionProvider = providerForModel(vision);
  const textProvider = providerForModel(text);

  // Singleton row keyed on a fixed id so repeated saves update in place.
  const { error } = await gate.admin!
    .from("ai_settings")
    .upsert(
      {
        id: 1,
        vision_provider: visionProvider,
        vision_model: vision,
        text_provider: textProvider,
        text_model: text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (error) return { error: error.message };
  await recordAudit("edit_ai_models", { targetType: "ai_settings", targetId: "models", detail: { visionProvider, vision, textProvider, text } });
  revalidatePath("/ai-costs");
  return {};
}
