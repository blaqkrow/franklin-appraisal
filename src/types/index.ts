export type FormType = "workers" | "office";

export type AppraisalType = "annual" | "confirmation" | "promotion";

export type AppRole =
  | "hr_admin"
  | "senior_management"
  | "hod"
  | "appraiser"
  | "appraisee";

export type AppraisalState =
  | "draft"
  | "pending_appraiser"
  | "pending_appraisee"
  | "pending_hod"
  | "pending_sm"
  | "pending_hr"
  | "completed"
  | "rejected"
  | "overdue";

export type Recommendation = "continue" | "higher_responsibility" | "promotion";

export interface Criterion {
  no: number;
  name: string;
  description: string;
  optional: boolean;
}

export interface Employee {
  id: string;
  employee_no: string;
  name: string;
  designation: string | null;
  department: string | null;
  date_joined: string | null;
  email: string | null;
  phone: string | null;
  form_type: FormType;
  role: AppRole;
  appraiser_id: string | null;
  hod_id: string | null;
  sm_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  password_hash?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppraisalCycle {
  id: string;
  cycle_year: number;
  start_date: string;
  end_date: string;
  deadline_date: string;
  is_active: boolean;
}

export interface AppraisalScore {
  id?: string;
  appraisal_id?: string;
  criterion_no: number;
  criterion_name: string;
  is_applicable: boolean;
  appraiser_rating: number | null;
  sm_rating: number | null;
  effective_rating: number | null;
  comments: string;
}

export interface AppraisalTraining {
  id?: string;
  appraisal_id?: string;
  training_type: string;
  is_selected: boolean | null;
  remarks: string;
}

export interface AppraisalNarrative {
  appraisal_id: string;
  appraiser_overall_comments: string;
  staff_comments: string;
  hod_comments: string;
  sm_comments: string;
  hr_remarks: string;
}

export interface SectionIV {
  appraisal_id: string;
  confirmation_date: string | null;
  extension_date: string | null;
  recommendation: Recommendation | null;
  target_role: string | null;
  timeframe: string | null;
  justification: string;
  hod_signed_at?: string | null;
  sm_signed_at?: string | null;
  hr_signed_at?: string | null;
}

export interface Appraisal {
  id: string;
  employee_id: string;
  form_type: FormType;
  appraisal_type: AppraisalType;
  cycle_year: number;
  state: AppraisalState;
  appraiser_id: string | null;
  hod_id: string | null;
  sm_id: string | null;
  hr_id: string | null;
  total_score: number | null;
  max_score: number | null;
  overall_pct: number | null;
  performance_grade: string | null;
  rejected_reason: string | null;
  appraiser_submitted_at: string | null;
  appraisee_submitted_at: string | null;
  hod_submitted_at: string | null;
  sm_submitted_at: string | null;
  hr_accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppraisalFull extends Appraisal {
  employee: Employee;
  appraiser?: Employee | null;
  hod?: Employee | null;
  sm?: Employee | null;
  hr?: Employee | null;
  scores: AppraisalScore[];
  training: AppraisalTraining[];
  narrative: AppraisalNarrative;
  section_iv: SectionIV | null;
  audit: AuditEntry[];
}

export interface AuditEntry {
  id?: string;
  appraisal_id?: string;
  actor_id: string | null;
  actor_role: AppRole | null;
  action: string;
  detail?: string | null;
  at: string;
}

export interface Session {
  employeeId: string;
  employeeNo: string;
  name: string;
  role: AppRole;
  formType: FormType;
  expiresAt: string;
}
