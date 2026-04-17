"use client";
import { useRouter } from "next/navigation";
import type { Role } from "@/types";

const ROLE_OPTIONS: { value: Role; label: string; note: string }[] = [
  { value: "admin", label: "Admin / HR", note: "Create appraisals, manage employees and criteria." },
  { value: "hod", label: "HOD (1st Appraiser)", note: "Score each factor, add remarks, submit for countersign." },
  {
    value: "countersigner",
    label: "Senior Management",
    note: "Review, override scores if needed, countersign or reject.",
  },
  { value: "hr", label: "HR Receiver", note: "Accept completed appraisal; triggers OneDrive archive." },
  { value: "employee", label: "Employee", note: "Read-only view; weights and confidential sections hidden." },
];

export default function RoleBar({ role }: { role: Role }) {
  const router = useRouter();
  const current = ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[0];

  async function change(next: Role) {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    router.refresh();
  }

  return (
    <div className="bg-ghost border-b border-rule">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-2 flex flex-wrap items-center gap-3 text-[13px]">
        <label className="font-semibold text-slate-600">Viewing as:</label>
        <select
          value={role}
          onChange={(e) => change(e.target.value as Role)}
          className="border border-rule rounded px-2 py-1 bg-white text-[13px]"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-slate-500 italic text-[12px] ml-auto">{current.note}</span>
      </div>
    </div>
  );
}
