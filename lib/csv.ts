// Minimal, dependency-free CSV parser. Handles quoted fields, embedded commas,
// escaped quotes (""), and newlines inside quoted fields.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  // strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // drop trailing empty rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface DevotionRow {
  publish_date: string;
  title: string;
  scripture_reference: string;
  scripture_text: string;
  body: string;
  closing_prayer: string;
  image_url: string;
  reflection_questions: string;
}

const FIELDS = [
  "publish_date", "title", "scripture_reference", "scripture_text",
  "body", "closing_prayer", "image_url", "reflection_questions",
];

export function rowsToDevotions(rows: string[][]): { items: DevotionRow[]; error?: string } {
  if (rows.length < 2) return { items: [], error: "CSV needs a header row and at least one devotion." };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const f of FIELDS) idx[f] = header.indexOf(f);
  if (idx["title"] === -1 || idx["body"] === -1) {
    return { items: [], error: "CSV must include at least 'title' and 'body' columns." };
  }
  const items: DevotionRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (f: string) => (idx[f] >= 0 ? (cells[idx[f]] ?? "").trim() : "");
    if (!get("title")) continue;
    items.push({
      publish_date: get("publish_date"),
      title: get("title"),
      scripture_reference: get("scripture_reference"),
      scripture_text: get("scripture_text"),
      body: get("body"),
      closing_prayer: get("closing_prayer"),
      image_url: get("image_url"),
      reflection_questions: get("reflection_questions"),
    });
  }
  return { items };
}

export interface ScriptureRow {
  reference: string;
  verse_text: string;
  topic: string;
  is_featured: boolean;
}

export function rowsToScriptures(rows: string[][]): { items: ScriptureRow[]; error?: string } {
  if (rows.length < 2) return { items: [], error: "CSV needs a header row and at least one verse." };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const ix = (n: string) => header.indexOf(n);
  const iRef = ix("reference"), iText = ix("verse_text"), iTopic = ix("topic"), iFeat = ix("is_featured");
  if (iRef === -1 || iText === -1 || iTopic === -1) {
    return { items: [], error: "CSV must include 'reference', 'verse_text', and 'topic' columns." };
  }
  const truthy = (v: string) => ["true", "yes", "1", "y"].includes((v || "").trim().toLowerCase());
  const items: ScriptureRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const c = rows[r];
    const ref = (c[iRef] ?? "").trim(), text = (c[iText] ?? "").trim(), topic = (c[iTopic] ?? "").trim();
    if (!ref || !text || !topic) continue;
    items.push({ reference: ref, verse_text: text, topic, is_featured: iFeat >= 0 ? truthy(c[iFeat]) : false });
  }
  return { items };
}
