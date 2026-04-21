import { serviceClient } from "./supabase";
import { criteriaFor, trainingFor } from "./criteria";
import type {
  AppRole,
  Appraisal,
  AppraisalFull,
  AppraisalType,
  AuditEntry,
  Employee,
  FormType,
  SectionIV,
  Session,
} from "@/types";
import { canViewAppraisal, canViewSectionIV } from "./workflow";
import { cycleYearFor } from "./period";

// ── Employees ──────────────────────────────────────────────────────────────
export async function listEmployees(): Promise<Employee[]> {
  const { data, error } = await serviceClient()
    .from("employees")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data as Employee[]) ?? [];
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data } = await serviceClient()
    .from("employees")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Employee) ?? null;
}

export async function getEmployeeByNo(no: string): Promise<Employee | null> {
  const { data } = await serviceClient()
    .from("employees")
    .select("*")
    .eq("employee_no", no)
    .maybeSingle();
  return (data as Employee) ?? null;
}

export async function upsertEmployee(e: Partial<Employee> & { employee_no: string; name: string }) {
  const { data, error } = await serviceClient()
    .from("employees")
    .upsert(e, { onConflict: "employee_no" })
    .select()
    .single();
  if (error) throw error;
  return data as Employee;
}

export async function setPassword(employeeId: string, passwordHash: string, mustChange = false) {
  const { error } = await serviceClient()
    .from("employees")
    .update({ password_hash: passwordHash, must_change_password: mustChange })
    .eq("id", employeeId);
  if (error) throw error;
}

// ── Cycles ─────────────────────────────────────────────────────────────────
export async function getActiveCycle() {
  const { data, error } = await serviceClient()
    .from("appraisal_cycles")
    .select("*")
    .eq("is_active", true)
    .order("cycle_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Appraisals ─────────────────────────────────────────────────────────────
export async function listAppraisalsFor(session: Session): Promise<(Appraisal & { employee: Employee })[]> {
  const sb = serviceClient();
  let query = sb
    .from("appraisals")
    .select("*, employee:employees!appraisals_employee_id_fkey(*)")
    .order("updated_at", { ascending: false });

  if (session.role === "hr_admin" || session.role === "senior_management") {
    // all
  } else if (session.role === "hod") {
    query = query.eq("hod_id", session.employeeId);
  } else if (session.role === "appraiser") {
    query = query.eq("appraiser_id", session.employeeId);
  } else if (session.role === "appraisee") {
    query = query.eq("employee_id", session.employeeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as (Appraisal & { employee: Employee })[];
}

export async function listAllAppraisalsWithEmployee(): Promise<(Appraisal & { employee: Employee })[]> {
  const { data, error } = await serviceClient()
    .from("appraisals")
    .select("*, employee:employees!appraisals_employee_id_fkey(*)")
    .order("cycle_year", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (Appraisal & { employee: Employee })[];
}

export async function getAppraisalFull(id: string, session: Session): Promise<AppraisalFull | null> {
  const sb = serviceClient();
  const { data: a, error } = await sb
    .from("appraisals")
    .select(`
      *,
      employee:employees!appraisals_employee_id_fkey(*),
      appraiser:employees!appraisals_appraiser_id_fkey(*),
      hod:employees!appraisals_hod_id_fkey(*),
      sm:employees!appraisals_sm_id_fkey(*),
      hr:employees!appraisals_hr_id_fkey(*)
    `)
    .eq("id", id)
    .maybeSingle();
  if (error || !a) return null;

  if (!canViewAppraisal(session.role, session.employeeId, a as unknown as Appraisal)) {
    return null;
  }

  const [scores, training, narrative, sectionIv, audit] = await Promise.all([
    sb.from("appraisal_scores").select("*").eq("appraisal_id", id).order("criterion_no"),
    sb.from("appraisal_training").select("*").eq("appraisal_id", id),
    sb.from("appraisal_narrative").select("*").eq("appraisal_id", id).maybeSingle(),
    sb.from("section_iv").select("*").eq("appraisal_id", id).maybeSingle(),
    sb.from("audit_log").select("*").eq("appraisal_id", id).order("at", { ascending: false }),
  ]);

  const full: AppraisalFull = {
    ...(a as unknown as Appraisal & {
      employee: Employee;
      appraiser: Employee | null;
      hod: Employee | null;
      sm: Employee | null;
      hr: Employee | null;
    }),
    scores: (scores.data ?? []) as AppraisalFull["scores"],
    training: (training.data ?? []) as AppraisalFull["training"],
    narrative:
      (narrative.data as AppraisalFull["narrative"]) ?? {
        appraisal_id: id,
        appraiser_overall_comments: "",
        staff_comments: "",
        hod_comments: "",
        sm_comments: "",
        hr_remarks: "",
      },
    section_iv: canViewSectionIV(session.role) ? ((sectionIv.data as SectionIV) ?? null) : null,
    audit: (audit.data ?? []) as AuditEntry[],
  };
  return full;
}

export async function createAppraisal(options: {
  employeeId: string;
  appraisalType: AppraisalType;
  cycleYear: number;
}): Promise<Appraisal> {
  const sb = serviceClient();
  const emp = await getEmployee(options.employeeId);
  if (!emp) throw new Error("Employee not found");

  // Idempotent for (employee, cycle)
  const { data: existing } = await sb
    .from("appraisals")
    .select("*")
    .eq("employee_id", options.employeeId)
    .eq("cycle_year", options.cycleYear)
    .maybeSingle();
  if (existing) return existing as Appraisal;

  const { data: a, error } = await sb
    .from("appraisals")
    .insert({
      employee_id: emp.id,
      form_type: emp.form_type,
      appraisal_type: options.appraisalType,
      cycle_year: options.cycleYear,
      state: "draft",
      appraiser_id: emp.appraiser_id,
      hod_id: emp.hod_id,
      sm_id: emp.sm_id,
    })
    .select()
    .single();
  if (error || !a) throw error ?? new Error("insert failed");

  // Seed score rows
  const scoreRows = criteriaFor(emp.form_type).map((c) => ({
    appraisal_id: a.id,
    criterion_no: c.no,
    criterion_name: c.name,
    is_applicable: !c.optional, // optional criteria default N/A; user toggles on
    comments: "",
  }));
  await sb.from("appraisal_scores").insert(scoreRows);

  // Seed training rows
  const trainingRows = trainingFor(emp.form_type).map((t) => ({
    appraisal_id: a.id,
    training_type: t,
    is_selected: emp.form_type === "workers" ? false : null,
    remarks: "",
  }));
  await sb.from("appraisal_training").insert(trainingRows);

  // Seed narrative row
  await sb.from("appraisal_narrative").insert({ appraisal_id: a.id });

  // Seed empty section IV row
  await sb.from("section_iv").insert({ appraisal_id: a.id });

  return a as Appraisal;
}

export async function bulkCreateForCycle(cycleYear: number, actor: Session) {
  const sb = serviceClient();
  const { data: employees } = await sb
    .from("employees")
    .select("id, role, appraiser_id, hod_id")
    .eq("is_active", true)
    .eq("role", "appraisee");

  let created = 0;
  let existing = 0;
  for (const e of employees ?? []) {
    if (!e.appraiser_id || !e.hod_id) continue;
    const { data: has } = await sb
      .from("appraisals")
      .select("id")
      .eq("employee_id", e.id)
      .eq("cycle_year", cycleYear)
      .maybeSingle();
    if (has) {
      existing++;
      continue;
    }
    const a = await createAppraisal({ employeeId: e.id, appraisalType: "annual", cycleYear });
    await transitionAppraisal(a.id, "pending_appraiser", actor, "Cycle bulk kick-off");
    created++;
  }
  await logAudit({
    appraisal_id: null,
    actor_id: actor.employeeId,
    actor_role: actor.role,
    action: `Bulk-created ${created} appraisals for cycle ${cycleYear}`,
  });
  return { created, existing };
}

// ── Writes ─────────────────────────────────────────────────────────────────
export async function updateScores(appraisalId: string, rows: Array<{
  criterion_no: number;
  is_applicable: boolean;
  appraiser_rating: number | null;
  sm_rating?: number | null;
  comments: string;
}>) {
  const sb = serviceClient();
  for (const r of rows) {
    await sb
      .from("appraisal_scores")
      .update({
        is_applicable: r.is_applicable,
        appraiser_rating: r.appraiser_rating,
        sm_rating: r.sm_rating ?? null,
        comments: r.comments,
      })
      .eq("appraisal_id", appraisalId)
      .eq("criterion_no", r.criterion_no);
  }
}

export async function updateTraining(appraisalId: string, rows: Array<{
  training_type: string;
  is_selected: boolean | null;
  remarks: string;
}>) {
  const sb = serviceClient();
  for (const r of rows) {
    await sb
      .from("appraisal_training")
      .update({ is_selected: r.is_selected, remarks: r.remarks })
      .eq("appraisal_id", appraisalId)
      .eq("training_type", r.training_type);
  }
}

export async function updateNarrative(
  appraisalId: string,
  patch: Partial<{
    appraiser_overall_comments: string;
    staff_comments: string;
    hod_comments: string;
    sm_comments: string;
    hr_remarks: string;
  }>,
) {
  const sb = serviceClient();
  const { error } = await sb
    .from("appraisal_narrative")
    .update(patch)
    .eq("appraisal_id", appraisalId);
  if (error) throw error;
}

export async function updateSectionIV(
  appraisalId: string,
  patch: Partial<SectionIV>,
  actor: Session,
) {
  if (!canViewSectionIV(actor.role)) {
    throw new Error("Section IV edit forbidden for this role");
  }
  const sb = serviceClient();
  const { error } = await sb.from("section_iv").update(patch).eq("appraisal_id", appraisalId);
  if (error) throw error;
}

export async function transitionAppraisal(
  appraisalId: string,
  nextState: Appraisal["state"],
  actor: Session,
  detail?: string,
) {
  const sb = serviceClient();
  const stamps: Partial<Record<keyof Appraisal, string>> = {};
  const now = new Date().toISOString();
  if (nextState === "pending_appraisee") stamps.appraiser_submitted_at = now;
  if (nextState === "pending_hod") stamps.appraisee_submitted_at = now;
  if (nextState === "pending_sm") stamps.hod_submitted_at = now;
  if (nextState === "pending_hr") stamps.sm_submitted_at = now;
  if (nextState === "completed") {
    stamps.hr_accepted_at = now;
    stamps.completed_at = now;
  }

  const { error } = await sb
    .from("appraisals")
    .update({ state: nextState, ...stamps })
    .eq("id", appraisalId);
  if (error) throw error;

  await sb.from("signatures").insert({
    appraisal_id: appraisalId,
    role: actor.role,
    signed_by_id: actor.employeeId,
  });

  await logAudit({
    appraisal_id: appraisalId,
    actor_id: actor.employeeId,
    actor_role: actor.role,
    action: `→ ${nextState}`,
    detail: detail ?? null,
  });
}

export async function logAudit(entry: {
  appraisal_id: string | null;
  actor_id: string | null;
  actor_role: AppRole | null;
  action: string;
  detail?: string | null;
}) {
  await serviceClient().from("audit_log").insert(entry);
}

// ── Reports ────────────────────────────────────────────────────────────────
export async function companyReport(cycleYear: number) {
  const { data, error } = await serviceClient()
    .from("appraisals")
    .select("*, employee:employees!appraisals_employee_id_fkey(*)")
    .eq("cycle_year", cycleYear);
  if (error) throw error;
  return (data ?? []) as unknown as (Appraisal & { employee: Employee })[];
}

export async function historicalForEmployee(employeeId: string) {
  const { data, error } = await serviceClient()
    .from("appraisals")
    .select("*")
    .eq("employee_id", employeeId)
    .order("cycle_year");
  if (error) throw error;
  return (data ?? []) as Appraisal[];
}

export function currentCycleYear(): number {
  return cycleYearFor();
}

// ── Convenience: form scaffolding ──────────────────────────────────────────
export function formTypeFor(emp: Employee): FormType {
  return emp.form_type;
}
