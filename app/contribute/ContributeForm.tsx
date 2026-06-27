"use client";

import { useState, useRef, useTransition } from "react";
import { Lock, Plus, Trash2, ImageIcon, UploadCloud, Search, Check } from "lucide-react";
import ImagePickerModal from "@/components/ui/ImagePickerModal";
import { verifyContributorPassword, submitDevotion, uploadDevotionImage } from "./actions";

const input = "w-full bg-white border border-line rounded-xl px-4 py-3 text-tone focus:outline-none focus:ring-2 focus:ring-brand text-sm";
const labelCls = "block text-xs font-semibold text-tone-faint uppercase tracking-wider mb-1.5";

export default function ContributeForm() {
  const [phase, setPhase] = useState<"gate" | "form" | "done">("gate");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // form fields
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [scriptureText, setScriptureText] = useState("");
  const [body, setBody] = useState("");
  const [prayer, setPrayer] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);

  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const unlock = () => {
    setError(null);
    startTransition(async () => {
      const res = await verifyContributorPassword(password);
      if (res.error) setError(res.error);
      else setPhase("form");
    });
  };

  const onPickFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    uploadDevotionImage(password, fd).then((res) => {
      if (res.error) setError(res.error);
      else if (res.url) setImageUrl(res.url);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitDevotion(password, {
        author, title, image_url: imageUrl,
        scripture_reference: scriptureRef, scripture_text: scriptureText,
        body, closing_prayer: prayer, questions,
      });
      if (res.error) setError(res.error);
      else setPhase("done");
    });
  };

  if (phase === "done") {
    return (
      <div className="bg-white rounded-card shadow-card p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <Check size={28} />
        </div>
        <h2 className="font-serif text-xl text-tone">Thank you!</h2>
        <p className="text-tone-muted text-sm mt-2">Your devotion was submitted for review. It will appear in the app once it&apos;s approved.</p>
        <button
          onClick={() => {
            setTitle(""); setImageUrl(""); setScriptureRef(""); setScriptureText(""); setBody(""); setPrayer(""); setQuestions([""]);
            setPhase("form");
          }}
          className="mt-6 text-sm font-semibold text-brand hover:underline"
        >
          Write another
        </button>
      </div>
    );
  }

  if (phase === "gate") {
    return (
      <div className="bg-white rounded-card shadow-card p-8 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center mx-auto mb-4">
          <Lock size={22} />
        </div>
        <p className="text-sm text-tone-muted text-center mb-4">Enter the password you were given to start writing.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && unlock()}
          placeholder="Password"
          className={input}
          autoFocus
        />
        {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}
        <button onClick={unlock} disabled={pending || !password} className="mt-4 w-full bg-brand hover:bg-brand-deep text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
          {pending ? "Checking…" : "Continue"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showPicker && <ImagePickerModal onSelect={(url) => setImageUrl(url)} onClose={() => setShowPicker(false)} />}

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

      <div className="bg-white rounded-card shadow-card p-6 space-y-5">
        <div>
          <label className={labelCls}>Your name</label>
          <input className={input} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Who is writing this?" />
        </div>
        <div>
          <label className={labelCls}>Title</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Devotion title" />
        </div>

        {/* Image */}
        <div>
          <label className={labelCls}>Image (optional)</label>
          {imageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="w-full h-44 object-cover" />
              <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1.5 hover:bg-black/80" title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setShowPicker(true)} className="inline-flex items-center gap-2 border border-line rounded-xl px-4 py-2.5 text-sm text-tone-muted hover:border-brand hover:text-brand">
                <Search size={16} /> Search photos
              </button>
              <input ref={fileRef} type="file" accept="image/*" id="contrib-img" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
              <label htmlFor="contrib-img" className="inline-flex items-center gap-2 border border-line rounded-xl px-4 py-2.5 text-sm text-tone-muted hover:border-brand hover:text-brand cursor-pointer">
                {uploading ? "Uploading…" : <><UploadCloud size={16} /> Upload your own</>}
              </label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Scripture reference</label>
            <input className={input} value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} placeholder="e.g. Psalm 23:1" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Scripture text (optional)</label>
          <textarea className={`${input} min-h-[80px]`} value={scriptureText} onChange={(e) => setScriptureText(e.target.value)} placeholder="The verse, written out" />
        </div>
        <div>
          <label className={labelCls}>Devotion</label>
          <textarea className={`${input} min-h-[200px]`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the devotion here…" />
        </div>
        <div>
          <label className={labelCls}>Closing prayer (optional)</label>
          <textarea className={`${input} min-h-[100px]`} value={prayer} onChange={(e) => setPrayer(e.target.value)} placeholder="A short prayer to close" />
        </div>

        {/* Reflection questions */}
        <div>
          <label className={labelCls}>Reflection questions (optional)</label>
          <div className="space-y-2">
            {questions.map((qn, i) => (
              <div key={i} className="flex gap-2">
                <input className={input} value={qn} onChange={(e) => setQuestions((qs) => qs.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`Question ${i + 1}`} />
                {questions.length > 1 && (
                  <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-tone-faint hover:text-red-500 px-2"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setQuestions((qs) => [...qs, ""])} className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
            <Plus size={15} /> Add question
          </button>
        </div>
      </div>

      <button onClick={submit} disabled={pending} className="w-full bg-brand hover:bg-brand-deep text-white font-semibold py-3.5 rounded-xl text-sm disabled:opacity-50">
        {pending ? "Submitting…" : "Submit for review"}
      </button>
      <p className="text-xs text-tone-faint text-center">Your devotion won&apos;t be published until an admin approves it.</p>
    </div>
  );
}
