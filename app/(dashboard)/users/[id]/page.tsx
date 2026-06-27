import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Activity } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhone } from "@/lib/zip";
import { ageFromBirthday } from "@/lib/age";
import { getUserPostHog } from "@/lib/posthog";
import { GiftProMenu } from "../GiftProMenu";
import { UserAdminControls } from "../UserAdminControls";

export const dynamic = "force-dynamic";

function fmt(d?: string | null, withTime = false) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return format(date, withTime ? "MMM d, yyyy · h:mm a" : "MMM d, yyyy");
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const id = params.id;

  if (!admin) {
    return (
      <div className="max-w-xl">
        <Link href="/users" className="inline-flex items-center gap-1 text-sm text-tone-muted hover:text-tone mb-4"><ArrowLeft size={15} /> Users</Link>
        <div className="rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-tone">
          Add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel and redeploy to manage users.
        </div>
      </div>
    );
  }

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!profile) notFound();

  const [{ data: authData }, prayers, sessions, ph] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("prayer_requests").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("prayer_sessions").select("id", { count: "exact", head: true }).eq("user_id", id),
    getUserPostHog(id),
  ]);
  const authUser = authData?.user;
  const providers: string[] = (authUser?.app_metadata?.providers as string[]) ?? (authUser?.app_metadata?.provider ? [authUser.app_metadata.provider as string] : []);

  const age = ageFromBirthday(profile.birthday);
  const comped = !!profile.comp_until && new Date(profile.comp_until).getTime() > Date.now();
  const lastActive = profile.last_active_at ?? profile.last_prayer_date;

  const facts: { label: string; value: ReactNode }[] = [
    { label: "Email", value: authUser?.email ?? "—" },
    { label: "Phone", value: formatPhone(profile.phone) || "—" },
    { label: "Age", value: age != null ? `${age}` : "—" },
    { label: "Birthday", value: fmt(profile.birthday) },
    { label: "Subscription", value: profile.subscription_status ?? "free" },
    { label: "Pro gift", value: comped ? `Yes (until ${fmt(profile.comp_until)})` : "No" },
    { label: "Prayer streak", value: `${profile.prayer_streak ?? 0} days` },
    { label: "Prayers logged", value: `${prayers.count ?? 0}` },
    { label: "Timer sessions", value: `${sessions.count ?? 0}` },
    { label: "Sign-in methods", value: providers.length ? providers.join(", ") : "email" },
    { label: "Last active", value: fmt(lastActive) },
    { label: "Last sign-in", value: fmt(authUser?.last_sign_in_at, true) },
    { label: "Joined", value: fmt(profile.created_at) },
  ];

  return (
    <div>
      <Link href="/users" className="inline-flex items-center gap-1 text-sm text-tone-muted hover:text-tone mb-4"><ArrowLeft size={15} /> Users</Link>

      <div className="flex items-center gap-4 mb-6">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover bg-brand-soft" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center text-2xl font-serif">
            {(profile.display_name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-serif text-tone">{profile.display_name ?? "No name"}</h1>
          <p className="text-tone-faint text-sm mt-0.5">{authUser?.email ?? id}</p>
        </div>
        <GiftProMenu userId={id} comped={comped} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Facts */}
          <div className="bg-white rounded-card shadow-card p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              {facts.map((f) => (
                <div key={f.label}>
                  <p className="text-xs font-semibold text-tone-faint uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm text-tone mt-1 capitalize break-words">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PostHog */}
          <div className="bg-white rounded-card shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-brand" />
              <h2 className="font-serif text-lg text-tone">Product analytics</h2>
              {ph.personUrl && (
                <a href={ph.personUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs text-brand hover:underline">Open in PostHog</a>
              )}
            </div>

            {!ph.configured ? (
              <p className="text-sm text-tone-faint">
                Connect PostHog to see this user&apos;s activity: set <code className="font-mono">POSTHOG_PERSONAL_API_KEY</code>,{" "}
                <code className="font-mono">POSTHOG_PROJECT_ID</code>, and <code className="font-mono">POSTHOG_HOST</code> in Vercel.
              </p>
            ) : ph.error ? (
              <p className="text-sm text-red-600">{ph.error}</p>
            ) : (
              <>
                {ph.events && ph.events.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {ph.events.map((e, i) => (
                      <li key={i} className="py-2.5 flex items-center justify-between gap-4">
                        <span className="text-sm text-tone font-medium">{e.event}</span>
                        <span className="text-xs text-tone-faint shrink-0">{fmt(e.timestamp, true)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-tone-faint">No events recorded for this user yet.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <UserAdminControls
            userId={id}
            hasEmail={!!authUser?.email}
            role={(profile.admin_role as "admin" | "editor" | "none") ?? (profile.is_admin ? "admin" : "none")}
            initial={{
              display_name: profile.display_name ?? "",
              phone: profile.phone ?? "",
              birthday: profile.birthday ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
