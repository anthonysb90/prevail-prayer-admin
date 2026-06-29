"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { saveSiteContent } from "./actions";

interface Block {
  slug: string;
  label: string;
  path: string;
  body: string;
  defaultBody: string;
  updatedAt: string | null;
}

const SITE_ORIGIN = "https://prevailprayer.com";

/** Minimal, safe Markdown -> HTML for the live preview (mirrors the site renderer). */
function mdToHtml(src: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const inline = (s: string) =>
    esc(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];
  const flushP = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
  const flushL = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushP(); flushL(); continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)$/))) { flushP(); if (list !== "ul") { flushL(); list = "ul"; out.push("<ul>"); } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { flushP(); if (list !== "ol") { flushL(); list = "ol"; out.push("<ol>"); } out.push(`<li>${inline(m[1])}</li>`); continue; }
    para.push(line);
  }
  flushP(); flushL();
  return out.join("\n");
}

export function SiteContentEditor({ blocks }: { blocks: Block[] }) {
  const [active, setActive] = useState(blocks[0]?.slug ?? "");
  // When a page has no saved override yet, preload its current published text so
  // the admin edits real copy instead of a blank box.
  const initial = Object.fromEntries(blocks.map((b) => [b.slug, b.body || b.defaultBody]));
  const [drafts, setDrafts] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState<Record<string, string>>(initial);
  const usingDefault = (b: Block) => !b.body && !!b.defaultBody;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const block = blocks.find((b) => b.slug === active);
  if (!block) return null;
  const value = drafts[active] ?? "";
  const dirty = value !== (saved[active] ?? "");

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteContent(active, value);
      if (res.error) setError(res.error);
      else setSaved((s) => ({ ...s, [active]: value }));
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {blocks.map((b) => (
          <button
            key={b.slug}
            type="button"
            onClick={() => setActive(b.slug)}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              active === b.slug ? "border-brand bg-brand/10 text-brand" : "border-line bg-white text-tone-muted hover:border-brand"
            }`}
          >
            {b.label}
            {drafts[b.slug] !== (saved[b.slug] ?? "") ? " ●" : ""}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <a
          href={`${SITE_ORIGIN}${block.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-tone-muted hover:text-brand"
        >
          View live page <ExternalLink size={12} />
        </a>
        {block.updatedAt ? (
          <span className="text-xs text-tone-muted">Last saved {new Date(block.updatedAt).toLocaleDateString()}</span>
        ) : usingDefault(block) ? (
          <span className="text-xs text-tone-muted">Showing current published text — edit and save to manage it here</span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-tone-muted mb-1">Markdown</label>
          <textarea
            value={value}
            onChange={(e) => setDrafts((d) => ({ ...d, [active]: e.target.value }))}
            spellCheck
            placeholder={"# Heading\n\nWrite the page content here in Markdown.\n\n- bullet point\n- another\n\n**Bold** and [a link](https://example.com)."}
            className="w-full h-[28rem] rounded-card border border-line bg-white p-3 text-sm font-mono text-tone focus:outline-none focus:border-brand resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-tone-muted mb-1">Preview</label>
          <div
            className="prose prose-sm max-w-none h-[28rem] overflow-auto rounded-card border border-line bg-page p-4 text-tone"
            dangerouslySetInnerHTML={{ __html: value.trim() ? mdToHtml(value) : '<p class="text-tone-muted">The page will keep its built-in default text until you add content here.</p>' }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="text-sm px-4 py-2 rounded-full bg-brand text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : dirty ? "Save & publish" : "Saved"}
        </button>
        {dirty && <span className="text-xs text-tone-muted">Unsaved changes</span>}
      </div>
    </div>
  );
}
