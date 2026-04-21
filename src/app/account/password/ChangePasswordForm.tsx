"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) return setMsg({ ok: false, text: "Min 6 characters" });
    if (next !== confirm) return setMsg({ ok: false, text: "Passwords do not match" });
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ ok: true, text: "Password updated." });
      setTimeout(() => router.replace("/"), 600);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-body flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="field-label">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            className="border border-rule rounded px-3 py-2 text-[15px]"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            className="border border-rule rounded px-3 py-2 text-[15px]"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            className="border border-rule rounded px-3 py-2 text-[15px]"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {msg && (
          <div
            className={`text-[13px] rounded px-3 py-2 ${
              msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
          >
            {msg.text}
          </div>
        )}
        <button className="btn btn-primary justify-center" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
