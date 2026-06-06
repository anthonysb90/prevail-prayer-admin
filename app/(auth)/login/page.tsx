"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) { setError(authError.message); setLoading(false); return; }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).single();

      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        setError("You do not have admin access.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🙏</span>
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">Prevail Prayer</h1>
          <p className="text-charcoal-400 text-sm mt-1">Admin Panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-semibold py-3 rounded-full transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
