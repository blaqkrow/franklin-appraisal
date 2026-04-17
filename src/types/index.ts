export type FormType = "production_worker" | "office_staff";

export type Role = "admin" | "hod" | "countersigner" | "hr" | "employee";

export type AppraisalState =
  | "draft"
  | "pending_hod"
  | "hod_overdue"
  | "pending_countersign"
  | "pending_hr"
  | "pending_employee_ack"
  | "completed"
  | "rejected_to_hod"
  | "rejected_to_admin"
  | "gate_fail";

export type PerformanceBand =
  | "Outstanding"
  | "Exceeds Expectations"
  | "Meets Expectations"
  | "Below Expectations"
  | "Very Much Below Expectations";

export interface Factor {
  no: string;
  name: string;
  weight: number;
  gate?: boolean;
  indicators: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  formType: FormType;
  hodId?: string;
  countersignerId?: string;
  isActive: boolean;
  joinedDate: string;
}

export interface FactorScore {
  factorNo: string;
  factorName: string;
  weight: number;
  hodRating: number | null;
  smRating: number | null;
  effectiveRating: number | null;
  weightedScore: number | null;
  hodRemarks: string;
  smOverrideReason: string;
  notForDiscussion?: boolean;
}

export interface AuditEntry {
  at: string;
  actor: Role;
  actorName: string;
  action: string;
  detail?: string;
}

export interface Appraisal {
  id: string;
  employeeId: string;
  formType: FormType;
  appraisalYear: number;
  period: string;
  reviewDate: string;
  state: AppraisalState;
  hodId?: string;
  countersignerId?: string;
  hrId?: string;
  gateFail: boolean;
  overallScore: number | null;
  performanceBand: PerformanceBand | null;
  pdfPath?: string;
  scores: FactorScore[];
  narrative: {
    strengths: string;
    improvements: string;
    hodComments: string;
    smComments: string;
    employeeComments: string;
    rejectReason: string;
  };
  promotionRecommended: boolean;
  hodSubmittedAt?: string;
  countersignedAt?: string;
  hrAcceptedAt?: string;
  employeeAcknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  audit: AuditEntry[];
}

export interface Session {
  role: Role;
  userId: string;
  name: string;
  email: string;
}
