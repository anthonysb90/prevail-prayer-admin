import { CreditCard, ShieldCheck, BellRing } from "lucide-react";
import ContributorPasswordCard from "./ContributorPasswordCard";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-tone">Settings</h1>
        <p className="text-tone-faint text-sm mt-1">App configuration and access</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Membership */}
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <h2 className="font-serif text-lg text-tone">Membership & Paywall</h2>
          </div>
          <Row label="Premium price" value="$14.99 / year" />
          <Row label="Free trial" value="14 days" />
          <Row label="Free tier" value="Prayer requests, list & home" />
          <Row label="Premium unlocks" value="Journal, Timer, Scripture, Reminders, Devotions" last />
          <p className="text-xs text-tone-faint mt-4 leading-relaxed">
            Pricing and billing are managed in App Store Connect and RevenueCat. Changes there flow to the app automatically.
          </p>
        </div>

        {/* Access */}
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h2 className="font-serif text-lg text-tone">Access</h2>
          </div>
          <p className="text-sm text-tone-muted leading-relaxed">
            Admin access is granted per account with the <span className="font-semibold text-tone">is_admin</span> flag
            on the user&apos;s profile. Only flagged accounts can sign in here.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-brand-soft/60 p-4">
            <BellRing size={18} className="text-brand" />
            <p className="text-sm text-tone-muted">
              Push notifications are sent from the Notifications page to members who have opted in.
            </p>
          </div>
        </div>

        <ContributorPasswordCard />
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="text-sm text-tone-muted">{label}</span>
      <span className="text-sm text-tone font-medium text-right">{value}</span>
    </div>
  );
}
