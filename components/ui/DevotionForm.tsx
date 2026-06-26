"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, ImageIcon } from "lucide-react";
import ImagePickerModal from "@/components/ui/ImagePickerModal";
import { createClient } from "@/lib/supabase/client";

interface Question { id?: string; question_text: string; sort_order: number }

interface DevotionFormProps {
  initial?: {
    id?: string;
    title?: string;
    image_url?: string;
    scripture_reference?: string;
    scripture_text?: string;
    body?: string;
    closing_prayer?: string;
    is_published?: boolean;
    questions?: Question[];
  };
}

export default function DevotionForm({ initial = {} }: DevotionFormProps) {
  const router = useRouter();
  const isEdit = !!initial.id;
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initial.title ?? "");
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? "");
  const [scriptureRef, setScriptureRef] = useState(initial.scripture_reference ?? "");
  const [scriptureText, setScriptureText] = useState(initial.scripture_text ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [prayer, setPrayer] = useState(initial.closing_prayer ?? "");
  const [isPublished, setIsPublished] = useState(initial.is_published ?? false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(
    initial.questions ?? [{ question_text: "", sort_order: 0 }]
  );

  const addQuestion = () => setQuestions((q) => [...q, { question_text: "", sort_order: q.length }]);
  const removeQuestion = (i: number) => setQuestions((q) => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, text: string) =>
    setQuestions((q) => q.map((item, idx) => idx === i ? { ...item, question_text: text } : item));

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Title and body are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const devotionData = {
      title: title.trim(),
      image_url: imageUrl.trim() || null,
      scripture_reference: scriptureRef.trim() || null,
      scripture_text: scriptureText.trim() || null,
      body: body.trim(),
      closing_prayer: prayer.trim() || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    };

    let devotionId = initial.id;

    if (isEdit) {
      const { error } = await supabase.from("devotions").update(devotionData).eq("id", devotionId!);
      if (error) { alert(error.message); setSaving(false); return; }
      await supabase.from("devotion_questions").delete().eq("devotion_id", devotionId!);
    } else {
      const { data, error } = await supabase.from("devotions").insert(devotionData).select().single();
      if (error) { alert(error.message); setSaving(false); return; }
      devotionId = data.id;
    }

    const validQuestions = questions.filter((q) => q.question_text.trim());
    if (validQuestions.length > 0) {
      await supabase.from("devotion_questions").insert(
        validQuestions.map((q, i) => ({ devotion_id: devotionId!, question_text: q.question_text.trim(), sort_order: i }))
      );
    }

    router.push("/devotions");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this devotion? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("devotions").delete().eq("id", initial.id!);
    router.push("/devotions");
    router.refresh();
  };

  const inputClass = "w-full bg-white border border-line rounded-xl px-4 py-3 text-tone focus:outline-none focus:ring-2 focus:ring-brand text-sm";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-tone">{isEdit ? "Edit Devotion" : "New Devotion"}</h1>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              Delete
            </button>
          )}
          <button
            onClick={handleSave} disabled={saving}
            className="bg-brand hover:bg-brand-deep text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Publish toggle */}
        <div className="bg-white rounded-card p-5 shadow-card flex items-center justify-between">
          <div>
            <p className="font-semibold text-tone text-sm">Published</p>
            <p className="text-tone-faint text-xs mt-0.5">Visible to subscribers in the app</p>
          </div>
          <button
            onClick={() => setIsPublished(!isPublished)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isPublished ? "bg-brand" : "bg-gray-200"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublished ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-card p-5 shadow-card space-y-4">
          <h2 className="font-semibold text-tone text-sm uppercase tracking-wide">Basic Info</h2>
          <div>
            <label className="block text-xs font-medium text-tone-faint mb-1">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Devotion title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-tone-faint mb-1">Image</label>
            <div className="flex items-center gap-2">
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={`${inputClass} flex-1`} placeholder="Paste a URL or browse photos" />
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="shrink-0 flex items-center gap-2 bg-page hover:bg-line text-tone border border-line rounded-xl px-4 py-3 text-sm font-medium transition-colors"
              >
                <ImageIcon size={16} /> Browse
              </button>
            </div>
            {imageUrl ? (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Selected" className="w-full max-h-48 object-cover rounded-xl border border-line" />
              </div>
            ) : null}
          </div>
        </div>

        {/* Scripture */}
        <div className="bg-white rounded-card p-5 shadow-card space-y-4">
          <h2 className="font-semibold text-tone text-sm uppercase tracking-wide">Scripture</h2>
          <div>
            <label className="block text-xs font-medium text-tone-faint mb-1">Reference</label>
            <input type="text" value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} className={inputClass} placeholder="John 3:16" />
          </div>
          <div>
            <label className="block text-xs font-medium text-tone-faint mb-1">Verse Text (KJV)</label>
            <textarea value={scriptureText} onChange={(e) => setScriptureText(e.target.value)} rows={3} className={inputClass} placeholder="For God so loved the world..." />
          </div>
        </div>

        {/* Body */}
        <div className="bg-white rounded-card p-5 shadow-card">
          <label className="block text-xs font-medium text-tone-faint mb-2 uppercase tracking-wide">Devotion Body *</label>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)} rows={12}
            className={inputClass} placeholder="Write the devotional reading here..."
          />
        </div>

        {/* Reflection questions */}
        <div className="bg-white rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-tone text-sm uppercase tracking-wide">Reflection Questions</h2>
            <button onClick={addQuestion} className="flex items-center gap-1 text-sm text-brand hover:text-brand font-medium">
              <Plus size={15} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <GripVertical size={18} className="text-tone-faint mt-3 shrink-0" />
                <input
                  type="text" value={q.question_text}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder={`Question ${i + 1}`}
                />
                <button onClick={() => removeQuestion(i)} className="text-tone-faint hover:text-red-500 mt-3 transition-colors shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Closing prayer */}
        <div className="bg-white rounded-card p-5 shadow-card">
          <label className="block text-xs font-medium text-tone-faint mb-2 uppercase tracking-wide">Closing Prayer</label>
          <textarea
            value={prayer} onChange={(e) => setPrayer(e.target.value)} rows={4}
            className={inputClass} placeholder="Lord, we come before you today..."
          />
        </div>
      </div>

      {showImagePicker && (
        <ImagePickerModal
          onSelect={(url) => setImageUrl(url)}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}
