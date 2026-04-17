"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Employee } from "@/types";

export default function NewAppraisalForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      router.push(`/appraisals/${data.id}`);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-body flex flex-col gap-4 max-w-lg">
        <label className="field-label">Employee</label>
        <select
          className="border border-rule rounded px-3 py-2 text-[14px]"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} — {e.department} ({e.formType === "production_worker" ? "Production" : "Office"})
            </option>
          ))}
        </select>
        {msg && <div className="text-rose-700 text-[13px]">{msg}</div>}
        <div className="flex gap-3">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create Appraisal"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
