"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppraisalType, Employee } from "@/types";
import { APPRAISAL_TYPE_LABELS } from "@/lib/criteria";

export default function NewAppraisalForm({
  employees,
  cycleYear,
}: {
  employees: Employee[];
  cycleYear: number;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState<AppraisalType>("annual");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          appraisal_type: type,
          cycle_year: cycleYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      router.push(`/appraisals/${data.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-body flex flex-col gap-4 max-w-xl">
        <label className="flex flex-col gap-1">
          <span className="field-label">Employee</span>
          <select
            className="border border-rule rounded px-3 py-2 text-[14px]"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.department} · {e.form_type === "workers" ? "Non-Office" : "Office"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Appraisal Type</span>
          <select
            className="border border-rule rounded px-3 py-2 text-[14px]"
            value={type}
            onChange={(e) => setType(e.target.value as AppraisalType)}
          >
            {(["annual", "confirmation", "promotion"] as AppraisalType[]).map((t) => (
              <option key={t} value={t}>
                {APPRAISAL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="text-[12px] text-slate-500">Cycle: {cycleYear}</div>
        {err && <div className="text-rose-700 text-[13px]">{err}</div>}
        <div className="flex gap-3">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create & Send to Appraiser"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
