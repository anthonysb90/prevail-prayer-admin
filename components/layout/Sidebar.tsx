"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Library, Music2,
  Bell, Users, LogOut, BookMarked,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/",              label: "Dashboard",    icon: LayoutDashboard },
  { href: "/devotions",     label: "Devotions",    icon: BookOpen },
  { href: "/scripture",     label: "Scripture",    icon: Library },
  { href: "/music",         label: "Music",        icon: Music2 },
  { href: "/notifications", label: "Notifications",icon: Bell },
  { href: "/users",         label: "Users",        icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-charcoal-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center text-lg">🙏</div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Prevail Prayer</p>
            <p className="text-white/40 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-amber-400 text-white font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
