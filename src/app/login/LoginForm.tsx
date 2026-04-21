"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [employeeNo, setEmployeeNo] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_no: employeeNo, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.replace(data.must_change_password ? "/account/password" : "/");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <label className="flex flex-col gap-1">
        <span className="field-label">Employee Number</span>
        <input
          autoFocus
          autoComplete="username"
          className="border border-rule rounded px-3 py-2 text-[15px]"
          value={employeeNo}
          onChange={(e) => setEmployeeNo(e.target.value)}
          placeholder="e.g. F0042"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="field-label">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          className="border border-rule rounded px-3 py-2 text-[15px]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {err && <div className="text-rose-700 text-[13px] bg-rose-50 rounded px-3 py-2">{err}</div>}
      <button type="submit" className="btn btn-primary justify-center" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-[11px] text-slate-500 text-center italic mt-1">
        Forgot your password? Ask HR to reset it.
      </p>
    </form>
  );
}
