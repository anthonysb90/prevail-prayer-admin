"use client";

import { useState, useTransition } from "react";
import { saveAiModels } from "./actions";
import { providerForModel, type AiModelSettings, type ModelPrice } from "@/lib/anthropicCost";

const PROVIDER_LABEL: Record<string, string> = { anthropic: "Claude", gemini: "Gemini" };

interface ModelSettingsProps {
  settings: AiModelSettings;
  prices: ModelPrice[];
}

export function ModelSettings({ settings, prices }: ModelSettingsProps) {
  const [vision, setVision] = useState(settings.vision_model);
  const [text, setText] = useState(settings.text_model);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = vision !== settings.vision_model || text !== settings.text_model;

  // Always include the currently-selected models, even if no price row exists yet.
  const options = Array.from(
    new Set([...prices.map((p) => p.model), settings.vision_model, settings.text_model, vision, text].filter(Boolean))
  );
  const labelFor = (model: string) => prices.find((p) => p.model === model)?.label || model;
  const optionText = (model: string) => `${PROVIDER_LABEL[providerForModel(model)]} · ${labelFor(model)} — ${model}`;

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveAiModels(vision, text);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  };

  return (
    <div className="rounded-card border border-line bg-white p-5 mb-6">
      <h2 className="text-sm font-semibold text-tone mb-1">Models in use</h2>
      <p className="text-xs text-tone-muted mb-4">
        Choose which model the import uses for photo scans and for pasted text — Claude or Gemini. The provider is set
        automatically from the model you pick. As cheaper or better models ship, add them under Model prices below, then
        point each mode here. New imports use the selected model right away.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-tone-muted">
          Photo scan (vision)
          <select
            value={vision}
            onChange={(e) => { setVision(e.target.value); setSaved(false); }}
            className="block w-64 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand bg-white"
          >
            {options.map((m) => (
              <option key={m} value={m}>{optionText(m)}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-tone-muted">
          Pasted text
          <select
            value={text}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
            className="block w-64 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand bg-white"
          >
            {options.map((m) => (
              <option key={m} value={m}>{optionText(m)}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="text-xs px-3 py-2 rounded-full bg-brand text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : saved && !dirty ? "Saved" : "Save"}
        </button>
      </div>

      <p className="text-[11px] text-tone-muted mt-3">
        Photo scans need a vision-capable model (Claude Sonnet/Opus, or Gemini Flash). Text imports can use the cheapest
        model that reads a list well. Make sure the matching provider key is set in Supabase secrets (ANTHROPIC_API_KEY
        or GEMINI_API_KEY).
      </p>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </div>
  );
}
