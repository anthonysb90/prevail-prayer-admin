"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Mail, Trash2, Check, X, Shield } from "lucide-react";
import { editUser, sendPasswordReset, setTempPassword, deleteUser, setUserRole } from "./actions";

type Role = "admin" | "editor" | "none";

interface Props {
  userId: string;
  hasEmail: boolean;
  role: Role;
  initial: { display_name: string; phone: string; birthday: string };
}

const input = "w-full bg-white border border-line rounded-xl px-3 py-2 text-tone text-sm outline-none focus:ring-2 focus:ring-brand";
const btn = "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50";

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const rnd = typeof crypto !== "undefined" && crypto.getRandomValues
    ? Array.from(crypto.getRandomValues(new Uint32Array(14)))
    : Array.from({ length: 14 }, () => Math.floor(Math.random() * 1e9));
  for (const n of rnd) out += chars[n % chars.length];
  return out;
}

export function UserAdminControls({ userId, hasEmail, role, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [roleVal, setRoleVal] = useState<Role>(role);

  const chooseRole = (r: Role) => {
    setMsg(null);
    startTransition(async () => {
      const res = await setUserRole(userId, r);
      if (res.error) setMsg({ kind: "err", text: res.error });
      else { setRoleVal(r); setMsg({ kind: "ok", text: `Panel access set to ${r === "none" ? "no access" : r}.` }); router.refresh(); }
    });
  };

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial.display_name);
  const [phone, setPhone] = useState(initial.phone);
  const [birthday, setBirthday] = useState(initial.birthday);

  const [tempPw, setTempPw] = useState("");

  const flash = (kind: "ok" | "err", text: string) => setMsg({ kind, text });

  const saveEdit = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await editUser(userId, { display_name: name, phone, birthday });
      if (res.error) flash("err", res.error);
      else { setEditing(false); flash("ok", "Profile updated."); router.refresh(); }
    });
  };

  const doResetEmail = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await sendPasswordReset(userId);
      if (res.error) flash("err", res.error);
      else flash("ok", "Password reset email sent.");
    });
  };

  const doTempPw = () => {
    setMsg(null);
    if (tempPw.length < 8) { flash("err", "Temp password needs at least 8 characters."); return; }
    startTransition(async () => {
      const res = await setTempPassword(userId, tempPw);
      if (res.error) flash("err", res.error);
      else flash("ok", `Temporary password set: ${tempPw} — share it with the user; ask them to change it.`);
    });
  };

  const doDelete = () => {
    if (!confirm("Permanently delete this user and all their data? This cannot be undone. (Their email is kept on record.)")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res.error) flash("err", res.error);
      else router.push("/users");
    });
  };

  return (
    <div className="bg-white rounded-card shadow-card p-5 space-y-5">
      <h3 className="font-serif text-lg text-tone">Manage</h3>

      {msg && (
        <div className={`text-sm rounded-xl px-3 py-2 ${msg.kind === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Edit profile */}
      <div>
        {editing ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-tone-faint uppercase tracking-wider">Name</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <label className="text-xs font-semibold text-tone-faint uppercase tracking-wider">Phone</label>
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <label className="text-xs font-semibold text-tone-faint uppercase tracking-wider">Birthday (YYYY-MM-DD)</label>
            <input className={input} value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="1990-04-01" />
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={pending} className={`${btn} bg-brand text-white hover:bg-brand-deep`}><Check size={15} /> Save</button>
              <button onClick={() => setEditing(false)} className={`${btn} text-tone-faint hover:text-tone-muted`}><X size={15} /> Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className={`${btn} border border-line text-tone hover:border-brand hover:text-brand w-full justify-center`}>
            <Pencil size={15} /> Edit profile
          </button>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-xs font-semibold text-tone-faint uppercase tracking-wider">Password</p>
        <button onClick={doResetEmail} disabled={pending || !hasEmail} className={`${btn} border border-line text-tone hover:border-brand hover:text-brand w-full justify-center`}>
          <Mail size={15} /> {hasEmail ? "Send reset email" : "No email on file"}
        </button>
        <div className="flex gap-2">
          <input className={input} value={tempPw} onChange={(e) => setTempPw(e.target.value)} placeholder="Temp password (min 8)" />
          <button type="button" onClick={() => setTempPw(randomPassword())} className={`${btn} border border-line text-tone-muted shrink-0`}>Generate</button>
        </div>
        <button onClick={doTempPw} disabled={pending || tempPw.length < 8} className={`${btn} border border-line text-tone hover:border-brand hover:text-brand w-full justify-center`}>
          <KeyRound size={15} /> Set temporary password
        </button>
      </div>

      {/* Panel access */}
      <div className="border-t border-line pt-4">
        <p className="text-xs font-semibold text-tone-faint uppercase tracking-wider mb-2 flex items-center gap-1.5"><Shield size={13} /> Admin panel access</p>
        <div className="grid grid-cols-3 gap-2">
          {(["admin", "editor", "none"] as Role[]).map((r) => (
            <button key={r} onClick={() => chooseRole(r)} disabled={pending}
              className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-colors disabled:opacity-50 ${roleVal === r ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-tone-muted hover:border-brand"}`}>
              {r === "none" ? "No access" : r === "admin" ? "Admin" : "Editor"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-tone-faint mt-1.5">Editor = devotions, scripture &amp; music only.</p>
      </div>

      {/* Danger */}
      <div className="border-t border-line pt-4">
        <button onClick={doDelete} disabled={pending} className={`${btn} bg-red-50 text-red-600 hover:bg-red-100 w-full justify-center`}>
          <Trash2 size={15} /> Delete user
        </button>
      </div>
    </div>
  );
}
