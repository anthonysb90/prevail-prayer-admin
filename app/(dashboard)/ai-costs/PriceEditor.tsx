"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveModelPrice, addModelPrice } from "./actions";
import type { ModelPrice } from "@/lib/anthropicCost";

interface Row extends ModelPrice {
  draftIn: string;
  draftOut: string;
}

export function PriceEditor({ prices }: { prices: ModelPrice[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    prices.map((p) => ({ ...p, draftIn: String(p.input_per_mtok), draftOut: String(p.output_per_mtok) }))
  );
  const [error, setError] = useState<string | null>(null);
  const [savedModel, setSavedModel] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newModel, setNewModel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIn, setNewIn] = useState("");
  const [newOut, setNewOut] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const addRow = () => {
    setAddError(null);
    const inP = parseFloat(newIn);
    const outP = parseFloat(newOut);
    if (!newModel.trim()) { setAddError("Enter a model id."); return; }
    if (isNaN(inP) || isNaN(outP)) { setAddError("Enter valid prices."); return; }
    startTransition(async () => {
      const res = await addModelPrice(newModel, newLabel, inP, outP);
      if (res.error) { setAddError(res.error); return; }
      setRows((rs) => [
        ...rs.filter((r) => r.model !== newModel.trim()),
        { model: newModel.trim(), label: newLabel.trim() || newModel.trim(), input_per_mtok: inP, output_per_mtok: outP, draftIn: String(inP), draftOut: String(outP) },
      ]);
      setNewModel(""); setNewLabel(""); setNewIn(""); setNewOut("");
      router.refresh();
    });
  };

  const update = (model: string, field: "draftIn" | "draftOut", value: string) =>
    setRows((rs) => rs.map((r) => (r.model === model ? { ...r, [field]: value } : r)));

  const save = (row: Row) => {
    setError(null);
    setSavedModel(null);
    const inP = parseFloat(row.draftIn);
    const outP = parseFloat(row.draftOut);
    if (isNaN(inP) || isNaN(outP)) { setError("Enter valid numbers."); return; }
    startTransition(async () => {
      const res = await saveModelPrice(row.model, inP, outP);
      if (res.error) setError(res.error);
      else {
        setSavedModel(row.model);
        setRows((rs) => rs.map((r) => (r.model === row.model ? { ...r, input_per_mtok: inP, output_per_mtok: outP } : r)));
      }
    });
  };

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <h2 className="text-sm font-semibold text-tone mb-1">Model prices</h2>
      <p className="text-xs text-tone-muted mb-4">
        USD per 1M tokens. Update these when Anthropic changes pricing — new calls use the latest values; past costs stay as billed.
      </p>
      <div className="space-y-3">
        {rows.map((r) => {
          const dirty = r.draftIn !== String(r.input_per_mtok) || r.draftOut !== String(r.output_per_mtok);
          return (
            <div key={r.model} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px]">
                <div className="text-sm text-tone">{r.label || r.model}</div>
                <div className="text-[11px] text-tone-muted font-mono">{r.model}</div>
              </div>
              <label className="text-xs text-tone-muted">
                Input
                <input
                  value={r.draftIn}
                  onChange={(e) => update(r.model, "draftIn", e.target.value)}
                  inputMode="decimal"
                  className="block w-24 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand"
                />
              </label>
              <label className="text-xs text-tone-muted">
                Output
                <input
                  value={r.draftOut}
                  onChange={(e) => update(r.model, "draftOut", e.target.value)}
                  inputMode="decimal"
                  className="block w-24 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand"
                />
              </label>
              <button
                type="button"
                onClick={() => save(r)}
                disabled={pending || !dirty}
                className="text-xs px-3 py-2 rounded-full bg-brand text-white disabled:opacity-40"
              >
                {pending ? "Saving…" : savedModel === r.model && !dirty ? "Saved" : "Save"}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      <div className="mt-5 pt-5 border-t border-line">
        <h3 className="text-xs font-semibold text-tone mb-2">Add a model</h3>
        <p className="text-[11px] text-tone-muted mb-3">
          Add a new model with its price, then select it under &quot;Models in use&quot; above. Saving an existing model id updates its price.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-tone-muted">
            Model id
            <input
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="claude-haiku-5"
              className="block w-52 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone font-mono focus:outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs text-tone-muted">
            Label
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Haiku 5"
              className="block w-36 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs text-tone-muted">
            Input
            <input
              value={newIn}
              onChange={(e) => setNewIn(e.target.value)}
              inputMode="decimal"
              placeholder="1"
              className="block w-20 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs text-tone-muted">
            Output
            <input
              value={newOut}
              onChange={(e) => setNewOut(e.target.value)}
              inputMode="decimal"
              placeholder="5"
              className="block w-20 mt-1 rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand"
            />
          </label>
          <button
            type="button"
            onClick={addRow}
            disabled={pending}
            className="text-xs px-3 py-2 rounded-full border border-brand text-brand disabled:opacity-40"
          >
            {pending ? "Saving…" : "Add model"}
          </button>
        </div>
        {addError && <p className="text-xs text-red-600 mt-3">{addError}</p>}
      </div>
    </div>
  );
}
