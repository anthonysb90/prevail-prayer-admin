"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid, BookOpen, Quote, Music2, Bell, Users, LogOut, Settings, BarChart3, ScrollText, Globe, Coins, Smartphone, MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai-costs", label: "AI Costs", icon: Coins },
  { href: "/devotions", label: "Devotions", icon: BookOpen },
  { href: "/scripture", label: "Scripture", icon: Quote },
  { href: "/music", label: "Music", icon: Music2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/versions", label: "App Versions", icon: Smartphone },
  { href: "/users", label: "Users", icon: Users },
  { href: "/site", label: "Site", icon: Globe },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
];

function CrossMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 3h4v5h5v4h-5v9h-4v-9H5V8h5V3Z" />
    </svg>
  );
}

const EDITOR_PATHS = ["/devotions", "/scripture", "/music"];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("profiles").select("admin_role").eq("id", data.user.id).single()
        .then(({ data: p }) => setRole((p?.admin_role as string) ?? "admin"));
    });
  }, []);

  const isEditor = role === "editor";
  const nav = isEditor ? NAV.filter((n) => EDITOR_PATHS.includes(n.href)) : NAV;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-ink flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center text-white">
            <CrossMark />
          </div>
          <div>
            <p className="text-white font-serif text-base leading-none">Prevail</p>
            <p className="text-white/40 text-xs mt-1">Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active ? "bg-brand text-white font-semibold" : "text-white/55 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {!isEditor && (
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              pathname.startsWith("/settings") ? "bg-brand text-white font-semibold" : "text-white/55 hover:text-white hover:bg-white/10"
            }`}
          >
            <Settings size={18} />
            Settings
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
