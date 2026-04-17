import type { Appraisal, AppraisalState, Role } from "@/types";

export const STATE_LABEL: Record<AppraisalState, string> = {
  draft: "Draft",
  pending_hod: "Pending HOD",
  hod_overdue: "HOD Overdue",
  pending_countersign: "Pending Countersign",
  pending_hr: "Pending HR",
  pending_employee_ack: "Pending Employee Ack",
  completed: "Completed",
  rejected_to_hod: "Rejected — Return to HOD",
  rejected_to_admin: "Rejected — Return to Admin",
  gate_fail: "Gate Fail",
};

export const STATE_BADGE: Record<AppraisalState, string> = {
  draft: "bg-slate-200 text-slate-700",
  pending_hod: "bg-amber-100 text-amber-800",
  hod_overdue: "bg-amber-200 text-amber-900",
  pending_countersign: "bg-indigo-100 text-indigo-800",
  pending_hr: "bg-sky-100 text-sky-800",
  pending_employee_ack: "bg-purple-100 text-purple-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected_to_hod: "bg-rose-100 text-rose-800",
  rejected_to_admin: "bg-rose-100 text-rose-800",
  gate_fail: "bg-red-200 text-red-900",
};

export const WORKFLOW_STEPS: { key: AppraisalState[]; label: string }[] = [
  { key: ["draft"], label: "Admin Creates" },
  { key: ["pending_hod", "hod_overdue", "rejected_to_hod"], label: "HOD Scores" },
  { key: ["pending_countersign"], label: "Countersign" },
  { key: ["pending_hr", "rejected_to_admin"], label: "HR Accepts" },
  { key: ["pending_employee_ack"], label: "Employee Ack" },
  { key: ["completed"], label: "Archived" },
];

export function currentStepIndex(state: AppraisalState): number {
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    if (WORKFLOW_STEPS[i].key.includes(state)) return i;
  }
  return state === "gate_fail" ? 1 : 0;
}

export function canActAs(role: Role, state: AppraisalState): boolean {
  if (role === "admin") return state === "draft" || state === "rejected_to_admin";
  if (role === "hod")
    return state === "pending_hod" || state === "hod_overdue" || state === "rejected_to_hod";
  if (role === "countersigner") return state === "pending_countersign" || state === "gate_fail";
  if (role === "hr") return state === "pending_hr";
  if (role === "employee") return state === "pending_employee_ack";
  return false;
}

export function canView(role: Role, a: Appraisal, userId?: string): boolean {
  if (role === "admin" || role === "hr") return true;
  if (role === "hod") return a.hodId === userId;
  if (role === "countersigner") return a.countersignerId === userId;
  if (role === "employee") return a.employeeId === userId;
  return false;
}

export function daysInState(a: Appraisal): number {
  const last = a.updatedAt ?? a.createdAt;
  return Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(a: Appraisal): boolean {
  return a.state === "pending_hod" && daysInState(a) >= 3;
}
