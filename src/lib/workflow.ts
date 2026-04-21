import type { AppRole, Appraisal, AppraisalState } from "@/types";

export const STATE_LABEL: Record<AppraisalState, string> = {
  draft:              "Draft",
  pending_appraiser:  "Pending Appraiser",
  pending_appraisee:  "Pending Appraisee",
  pending_hod:        "Pending HOD",
  pending_sm:         "Pending Senior Management",
  pending_hr:         "Pending HR",
  completed:          "Completed",
  rejected:           "Rejected",
  overdue:            "Overdue",
};

export const STATE_BADGE: Record<AppraisalState, string> = {
  draft:              "bg-slate-200 text-slate-700",
  pending_appraiser:  "bg-amber-100 text-amber-800",
  pending_appraisee:  "bg-sky-100 text-sky-800",
  pending_hod:        "bg-indigo-100 text-indigo-800",
  pending_sm:         "bg-violet-100 text-violet-800",
  pending_hr:         "bg-teal-100 text-teal-800",
  completed:          "bg-emerald-100 text-emerald-800",
  rejected:           "bg-rose-100 text-rose-800",
  overdue:            "bg-orange-200 text-orange-900",
};

export const WORKFLOW_STEPS: { key: AppraisalState[]; label: string }[] = [
  { key: ["draft"],                                 label: "Draft" },
  { key: ["pending_appraiser"],                     label: "Appraiser" },
  { key: ["pending_appraisee"],                     label: "Appraisee" },
  { key: ["pending_hod"],                           label: "HOD" },
  { key: ["pending_sm"],                            label: "Senior Mgmt" },
  { key: ["pending_hr"],                            label: "HR" },
  { key: ["completed"],                             label: "Completed" },
];

export function currentStepIndex(state: AppraisalState): number {
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    if (WORKFLOW_STEPS[i].key.includes(state)) return i;
  }
  return 0;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  hr_admin:          "HR Administrator",
  senior_management: "Senior Management",
  hod:               "HOD / Manager",
  appraiser:         "Appraiser",
  appraisee:         "Appraisee",
};

/**
 * Can this role act in the given state?
 * Note: HR admin can act at almost any step (kick-off, reset).
 */
export function canActOn(role: AppRole, state: AppraisalState): boolean {
  if (role === "hr_admin") return true;
  if (role === "senior_management") return state === "pending_sm";
  if (role === "hod") return state === "pending_hod";
  if (role === "appraiser") return state === "pending_appraiser";
  if (role === "appraisee") return state === "pending_appraisee";
  return false;
}

export function canViewSectionIV(role: AppRole): boolean {
  // Strict rule from PRD §6: Appraisee NEVER sees Section IV at frontend or backend.
  return role === "hr_admin" || role === "senior_management" || role === "hod";
}

export function canViewAppraisal(
  role: AppRole,
  userId: string,
  a: Pick<Appraisal, "employee_id" | "appraiser_id" | "hod_id" | "sm_id">,
): boolean {
  if (role === "hr_admin" || role === "senior_management") return true;
  if (role === "hod") return a.hod_id === userId;
  if (role === "appraiser") return a.appraiser_id === userId;
  if (role === "appraisee") return a.employee_id === userId;
  return false;
}

export function daysInState(a: Pick<Appraisal, "updated_at">): number {
  return Math.floor((Date.now() - new Date(a.updated_at).getTime()) / 86400000);
}
