import type {
  Appraisal,
  AppraisalState,
  AuditEntry,
  Employee,
  FactorScore,
  FormType,
  Role,
} from "@/types";
import { factorsFor } from "./criteria";
import { bandFor, gateTriggered, overallScore } from "./scoring";
import { appraisalYearFor, periodLabel } from "./period";

type State = {
  employees: Map<string, Employee>;
  appraisals: Map<string, Appraisal>;
};

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

declare global {
  // eslint-disable-next-line no-var
  var __FRANKLIN_STORE__: State | undefined;
}

function initState(): State {
  const employees = new Map<string, Employee>();
  const appraisals = new Map<string, Appraisal>();

  const admin: Employee = {
    id: "usr_admin",
    employeeId: "HR-001",
    name: "Alex Lim",
    email: "alex@franklin.com.sg",
    department: "Human Resources",
    designation: "HR Manager",
    formType: "office_staff",
    isActive: true,
    joinedDate: "2018-05-01",
  };
  const sm: Employee = {
    id: "usr_sm",
    employeeId: "MGT-001",
    name: "Trevor Lim",
    email: "trevor@franklin.com.sg",
    department: "Senior Management",
    designation: "Managing Director",
    formType: "office_staff",
    isActive: true,
    joinedDate: "2005-01-01",
  };
  const hod1: Employee = {
    id: "usr_hod1",
    employeeId: "OPS-001",
    name: "Ian Lew",
    email: "ian.lew@franklin.com.sg",
    department: "Rigging Fabrication",
    designation: "Head of Production",
    formType: "office_staff",
    hodId: sm.id,
    countersignerId: sm.id,
    isActive: true,
    joinedDate: "2015-03-01",
  };
  const hod2: Employee = {
    id: "usr_hod2",
    employeeId: "OFC-001",
    name: "Mei Tan",
    email: "mei.tan@franklin.com.sg",
    department: "Finance",
    designation: "Finance Manager",
    formType: "office_staff",
    hodId: sm.id,
    countersignerId: sm.id,
    isActive: true,
    joinedDate: "2016-07-01",
  };
  const workers: Employee[] = [
    {
      id: "usr_w1",
      employeeId: "F0042",
      name: "John Tan",
      email: "john.tan@franklin.com.sg",
      department: "Rigging Fabrication",
      designation: "Wire Rope Rigger",
      formType: "production_worker",
      hodId: hod1.id,
      countersignerId: sm.id,
      isActive: true,
      joinedDate: "2020-06-15",
    },
    {
      id: "usr_w2",
      employeeId: "F0043",
      name: "Ravi Kumar",
      email: "ravi.k@franklin.com.sg",
      department: "Rigging Fabrication",
      designation: "Senior Rigger",
      formType: "production_worker",
      hodId: hod1.id,
      countersignerId: sm.id,
      isActive: true,
      joinedDate: "2017-02-10",
    },
    {
      id: "usr_o1",
      employeeId: "F2101",
      name: "Sarah Wong",
      email: "sarah.w@franklin.com.sg",
      department: "Finance",
      designation: "Accounts Executive",
      formType: "office_staff",
      hodId: hod2.id,
      countersignerId: sm.id,
      isActive: true,
      joinedDate: "2021-08-01",
    },
    {
      id: "usr_o2",
      employeeId: "F2102",
      name: "Daniel Goh",
      email: "daniel.g@franklin.com.sg",
      department: "Finance",
      designation: "Financial Analyst",
      formType: "office_staff",
      hodId: hod2.id,
      countersignerId: sm.id,
      isActive: true,
      joinedDate: "2019-11-15",
    },
  ];

  [admin, sm, hod1, hod2, ...workers].forEach((e) => employees.set(e.id, e));

  const year = appraisalYearFor();
  const demoAppraisal = createBlankAppraisal(workers[0], year);
  demoAppraisal.state = "pending_hod";
  demoAppraisal.audit.push({
    at: nowIso(),
    actor: "admin",
    actorName: admin.name,
    action: "Created and submitted to HOD",
  });
  appraisals.set(demoAppraisal.id, demoAppraisal);

  return { employees, appraisals };
}

function getState(): State {
  if (!global.__FRANKLIN_STORE__) {
    global.__FRANKLIN_STORE__ = initState();
  }
  return global.__FRANKLIN_STORE__;
}

export function createBlankAppraisal(emp: Employee, year: number): Appraisal {
  const scores: FactorScore[] = factorsFor(emp.formType).map((f) => ({
    factorNo: f.no,
    factorName: f.name,
    weight: f.weight,
    hodRating: null,
    smRating: null,
    effectiveRating: null,
    weightedScore: null,
    hodRemarks: "",
    smOverrideReason: "",
  }));
  const now = nowIso();
  return {
    id: uid("apr"),
    employeeId: emp.id,
    formType: emp.formType,
    appraisalYear: year,
    period: periodLabel(year),
    reviewDate: now.slice(0, 10),
    state: "draft",
    hodId: emp.hodId,
    countersignerId: emp.countersignerId,
    gateFail: false,
    overallScore: null,
    performanceBand: null,
    scores,
    narrative: {
      strengths: "",
      improvements: "",
      hodComments: "",
      smComments: "",
      employeeComments: "",
      rejectReason: "",
    },
    promotionRecommended: false,
    createdAt: now,
    updatedAt: now,
    audit: [],
  };
}

export function listEmployees(): Employee[] {
  return Array.from(getState().employees.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function getEmployee(id: string): Employee | undefined {
  return getState().employees.get(id);
}

export function upsertEmployee(e: Employee): Employee {
  getState().employees.set(e.id, e);
  return e;
}

export function deactivateEmployee(id: string) {
  const e = getState().employees.get(id);
  if (e) getState().employees.set(id, { ...e, isActive: false });
}

export function listAppraisals(): Appraisal[] {
  return Array.from(getState().appraisals.values()).sort(
    (a, b) => (b.updatedAt > a.updatedAt ? 1 : -1),
  );
}

export function getAppraisal(id: string): Appraisal | undefined {
  return getState().appraisals.get(id);
}

function recalc(a: Appraisal): Appraisal {
  a.scores = a.scores.map((s) => {
    const eff = s.smRating ?? s.hodRating;
    return {
      ...s,
      effectiveRating: eff,
      weightedScore: eff == null ? null : Number((eff * s.weight).toFixed(4)),
    };
  });
  a.gateFail = gateTriggered(a);
  a.overallScore = overallScore(a);
  a.performanceBand = bandFor(a.overallScore);
  a.updatedAt = nowIso();
  return a;
}

export function saveAppraisal(a: Appraisal): Appraisal {
  recalc(a);
  getState().appraisals.set(a.id, a);
  return a;
}

export function createAppraisalFor(employeeId: string): Appraisal {
  const emp = getEmployee(employeeId);
  if (!emp) throw new Error("Employee not found");
  const year = appraisalYearFor();
  const existing = listAppraisals().find(
    (x) => x.employeeId === employeeId && x.appraisalYear === year,
  );
  if (existing) return existing;
  const a = createBlankAppraisal(emp, year);
  getState().appraisals.set(a.id, a);
  return a;
}

export function bulkCreateForCycle(): { created: number; existing: number } {
  let created = 0;
  let existing = 0;
  const year = appraisalYearFor();
  listEmployees()
    .filter((e) => e.isActive && e.hodId)
    .forEach((e) => {
      const has = listAppraisals().find(
        (a) => a.employeeId === e.id && a.appraisalYear === year,
      );
      if (has) {
        existing++;
      } else {
        const a = createBlankAppraisal(e, year);
        getState().appraisals.set(a.id, a);
        created++;
      }
    });
  return { created, existing };
}

export function transition(
  id: string,
  nextState: AppraisalState,
  entry: Omit<AuditEntry, "at">,
): Appraisal {
  const a = getAppraisal(id);
  if (!a) throw new Error("Appraisal not found");
  a.state = nextState;
  a.audit.push({ at: nowIso(), ...entry });
  recalc(a);
  if (nextState === "pending_countersign") a.hodSubmittedAt = a.updatedAt;
  if (nextState === "pending_hr") a.countersignedAt = a.updatedAt;
  if (nextState === "pending_employee_ack") a.hrAcceptedAt = a.updatedAt;
  if (nextState === "completed") a.employeeAcknowledgedAt = a.updatedAt;
  return a;
}

export function auditTrail(a: Appraisal): AuditEntry[] {
  return [...a.audit].sort((x, y) => (x.at > y.at ? -1 : 1));
}

export function employeesForRole(role: Role, userId?: string): Employee[] {
  const all = listEmployees();
  if (role === "admin" || role === "hr" || role === "countersigner") return all;
  if (role === "hod") return all.filter((e) => e.hodId === userId);
  if (role === "employee") return all.filter((e) => e.id === userId);
  return [];
}

export function appraisalsForRole(role: Role, userId?: string): Appraisal[] {
  const all = listAppraisals();
  if (role === "admin" || role === "hr") return all;
  if (role === "hod") return all.filter((a) => a.hodId === userId);
  if (role === "countersigner") return all.filter((a) => a.countersignerId === userId);
  if (role === "employee") return all.filter((a) => a.employeeId === userId);
  return [];
}

export const ROLE_USER: Record<Role, { id: string; email: string; name: string }> = {
  admin: { id: "usr_admin", email: "alex@franklin.com.sg", name: "Alex Lim" },
  hod: { id: "usr_hod1", email: "ian.lew@franklin.com.sg", name: "Ian Lew" },
  countersigner: { id: "usr_sm", email: "trevor@franklin.com.sg", name: "Trevor Lim" },
  hr: { id: "usr_admin", email: "hr@franklin.com.sg", name: "HR Receiver" },
  employee: { id: "usr_w1", email: "john.tan@franklin.com.sg", name: "John Tan" },
};

export type { FormType };
