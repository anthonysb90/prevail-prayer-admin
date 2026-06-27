import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

export const dynamic = "force-dynamic";

interface Entry { id: string; title: string; published: boolean }

export default async function DevotionsCalendarPage({ searchParams }: { searchParams: { m?: string } }) {
  const supabase = createAdminClient() ?? createClient();

  // Which month to show.
  const parsed = searchParams?.m ? new Date(`${searchParams.m}-01T00:00:00`) : new Date();
  const monthDate = isNaN(parsed.getTime()) ? new Date() : parsed;

  const gridStart = startOfWeek(startOfMonth(monthDate));
  const gridEnd = endOfWeek(endOfMonth(monthDate));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const { data } = await supabase
    .from("devotions")
    .select("id, title, is_published, published_at, scheduled_for");

  // Map day (yyyy-MM-dd) -> entries. A devotion's day is its publish date, or its
  // scheduled date if not yet published.
  const byDay: Record<string, Entry[]> = {};
  for (const d of data ?? []) {
    const when = d.is_published ? d.published_at : d.scheduled_for;
    if (!when) continue;
    const key = format(new Date(when), "yyyy-MM-dd");
    (byDay[key] ??= []).push({ id: d.id, title: d.title, published: !!d.is_published });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = format(monthDate, "MMMM yyyy");
  const prev = format(subMonths(monthDate, 1), "yyyy-MM");
  const next = format(addMonths(monthDate, 1), "yyyy-MM");

  // Count upcoming gaps in this month (today onward, in-month days with nothing).
  const gaps = days.filter((d) => isSameMonth(d, monthDate) && d >= today && !(byDay[format(d, "yyyy-MM-dd")]?.length)).length;

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif text-tone">Devotion Calendar</h1>
          <p className="text-tone-faint text-sm mt-1">
            {monthLabel}{gaps > 0 && <span className="text-amber-600"> · {gaps} upcoming gap{gaps === 1 ? "" : "s"}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/devotions" className="inline-flex items-center gap-1.5 text-sm text-tone-muted hover:text-tone px-3 py-2 rounded-lg border border-line"><List size={15} /> List</Link>
          <Link href={`/devotions/calendar?m=${prev}`} className="p-2 rounded-lg border border-line text-tone-muted hover:text-brand"><ChevronLeft size={16} /></Link>
          <Link href={`/devotions/calendar?m=${next}`} className="p-2 rounded-lg border border-line text-tone-muted hover:text-brand"><ChevronRight size={16} /></Link>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-3 py-2.5 text-xs font-semibold text-tone-faint uppercase tracking-wider text-center">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const entries = byDay[key] ?? [];
            const inMonth = isSameMonth(day, monthDate);
            const isFutureEmpty = inMonth && entries.length === 0 && day >= today;
            return (
              <div key={key} className={`min-h-[104px] border-b border-r border-line p-2 ${inMonth ? "" : "bg-page/60"} ${isToday(day) ? "ring-1 ring-inset ring-brand/40" : ""}`}>
                <div className={`text-xs font-medium mb-1 ${inMonth ? "text-tone" : "text-tone-faint"} ${isToday(day) ? "text-brand font-bold" : ""}`}>{format(day, "d")}</div>
                <div className="space-y-1">
                  {entries.slice(0, 3).map((e) => (
                    <Link key={e.id} href={`/devotions/${e.id}`}
                      className={`block text-[11px] leading-tight truncate px-1.5 py-1 rounded ${e.published ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"} hover:opacity-80`}>
                      {e.title}
                    </Link>
                  ))}
                  {entries.length > 3 && <p className="text-[10px] text-tone-faint px-1.5">+{entries.length - 3} more</p>}
                  {isFutureEmpty && <p className="text-[10px] text-amber-500 px-1.5">— gap —</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-tone-faint">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-200" /> Published</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-200" /> Scheduled</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-amber-500">— gap —</span> No devotion that day</span>
      </div>
    </div>
  );
}
