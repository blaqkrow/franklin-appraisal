import type { Criterion, FormType } from "@/types";

// ── Non-Office / Workers PA Form — 11 criteria ─────────────────────────────
// Text matches "FOI - Workers PA Form (for MIS_updated 20260116).doc" verbatim.
export const WORKERS_CRITERIA: Criterion[] = [
  { no: 1,  name: "Quality of Work / Product Knowledge",
    description: "Neat, accurate and timely in completion of the job with correct application of relevant product knowledge.",
    optional: false },
  { no: 2,  name: "Quantity of Work Done",
    description: "Ability to handle routine and extra workload.",
    optional: false },
  { no: 3,  name: "Safety / Housekeeping",
    description: "The maintenance of a clean, organised and safe workplace.",
    optional: false },
  { no: 4,  name: "Teamwork",
    description: "Ability to work effectively as part of a team.",
    optional: false },
  { no: 5,  name: "Compliance",
    description: "Ability to understand, follow instructions & to process work according to internal SOP correctly.",
    optional: false },
  { no: 6,  name: "Attitude to Job/Enthusiasm for Work",
    description: "Demonstrate interest and have a positive attitude towards the job.",
    optional: false },
  { no: 7,  name: "Work Discipline",
    description: "Observation of company rules & regulations, including punctuality and attendance.",
    optional: false },
  { no: 8,  name: "Responsibility / Reliability",
    description: "Being responsible and hardworking. The level of reliance that can be placed on the staff to complete work assignments.",
    optional: false },
  { no: 9,  name: "Initiative / Problem Solving",
    description: "Ability to take initiative and to offer ideas on work improvements. Ability to solve work problem.",
    optional: false },
  { no: 10, name: "Customer Service Attitude",
    description: "To interact courteously and professionally with customers and external parties.",
    optional: false },
  { no: 11, name: "Supervisory Skills (if applicable)",
    description: "Ability to lead and manage team to complete work assignments.",
    optional: true  },
];

// ── Office Staff PA Form — 15 criteria ─────────────────────────────────────
// Text matches "FOI - Office Staff PA Form (for MIS _updated 20260116).doc" verbatim.
// Note: criterion 1 uses "Jobs skills" as written in the source document.
export const OFFICE_CRITERIA: Criterion[] = [
  { no: 1,  name: "Jobs skills, Product Knowledge & Quality of Work",
    description: "Ability to apply product knowledge, provide accurate information, and to perform task effectively and efficiently.",
    optional: false },
  { no: 2,  name: "Planning & Organisation",
    description: "Ability to plan and organise tasks. Time management.",
    optional: false },
  { no: 3,  name: "Compliance & Accuracy & SOP Adherence",
    description: "Ability to comply with work requirements and ensure work accuracy by complying to company policies, SOPs, safety rules, and internal workflows correctly.",
    optional: false },
  { no: 4,  name: "Commitment & Dependability",
    description: "Being responsible and hardworking. Trustworthiness and reliability.",
    optional: false },
  { no: 5,  name: "Teamwork",
    description: "Ability to work effectively as part of a team. Interpersonal skills.",
    optional: false },
  { no: 6,  name: "Service Attitude",
    description: "Ability to respond to customer needs, resolve issues, maintain professionalism, and represent the company well. Being courteous, positive, well-mannered and well-groomed.",
    optional: false },
  { no: 7,  name: "Creativity",
    description: "Ability to take initiative and to contribute constructive new ideas for improvement.",
    optional: false },
  { no: 8,  name: "Responsiveness & Adaptability",
    description: "Ability to respond quickly to instructions and changes.",
    optional: false },
  { no: 9,  name: "Communication",
    description: "Ability to understand and to express ideas clearly as well as to share information.",
    optional: false },
  { no: 10, name: "Work Discipline",
    description: "Observation of company rules & regulations, including punctuality and attendance.",
    optional: false },
  { no: 11, name: "Supervisory/Leadership Skills (if applicable)",
    description: "Ability to lead and manage team to achieve business goals.",
    optional: true  },
  { no: 12, name: "Meeting of Sales Targets (if applicable)",
    description: "Ability to meet sales targets set.",
    optional: true  },
  { no: 13, name: "Create New Customer Accounts (if applicable)",
    description: "Ability to create new customer accounts.",
    optional: true  },
  { no: 14, name: "Customer Relationship (if applicable)",
    description: "Maintaining and managing relationship with customers. Planning customer visits (no. of sales visits), keeping close contact with customers and submitting sales visit reports.",
    optional: true  },
  { no: 15, name: "Debt Collection Effort (if applicable)",
    description: "The effort put in to collect payments from customers, especially long overdue payments.",
    optional: true  },
];

export function criteriaFor(formType: FormType): Criterion[] {
  return formType === "workers" ? WORKERS_CRITERIA : OFFICE_CRITERIA;
}

// Rating scale per Section II of both forms, verbatim
export const RATING_LABELS: { value: number; label: string; desc: string }[] = [
  { value: 5, label: "Excellent",     desc: "Meet Expectation all the time" },
  { value: 4, label: "Good",          desc: "Meet Expectation most of the time" },
  { value: 3, label: "Satisfactory",  desc: "Meet Expectation some of the time" },
  { value: 2, label: "Poor",          desc: "Below Expectation" },
  { value: 1, label: "Very Poor",     desc: "Very much below Expectation" },
];

export const PERFORMANCE_BANDS = [
  { min: 85, max: 100,   label: "Outstanding",         color: "#065f46" },
  { min: 70, max: 84.99, label: "Good",                color: "#1d6e3f" },
  { min: 55, max: 69.99, label: "Satisfactory",        color: "#374151" },
  { min: 40, max: 54.99, label: "Below Expectation",   color: "#b45309" },
  { min: 0,  max: 39.99, label: "Unsatisfactory",      color: "#b91c1c" },
] as const;

export function bandFor(pct: number | null): { label: string; color: string } | null {
  if (pct == null) return null;
  for (const b of PERFORMANCE_BANDS) {
    if (pct >= b.min && pct <= b.max) return { label: b.label, color: b.color };
  }
  return null;
}

// ── Training taxonomies (verbatim from the two PA forms) ───────────────────
export const WORKERS_TRAINING = [
  "SSIC – GT",
  "Rigging/Material Handling Course",
  "Lifting Supervisor Safety Course",
  "SSIC - Hotwork",
  "Occupational First Aid Course",
  "Shipyard Safety Supervisor Course",
  "Bosiet Course",
  "Forklift Operations Course",
  "Others: pls specify",
];

export const OFFICE_TRAINING = [
  "Technical Competency",
  "Service Excellence",
  "Communications",
  "Supervisory/Leadership",
  "Others",
];

export function trainingFor(formType: FormType): string[] {
  return formType === "workers" ? WORKERS_TRAINING : OFFICE_TRAINING;
}

// Source-doc form headings (also used in reports)
export const APPRAISAL_TYPE_LABELS: Record<string, string> = {
  annual:       "Annual Appraisal",
  confirmation: "Confirmation Appraisal",
  promotion:    "Promotion Appraisal",
};

// Section IV checkbox options (matches the three boxes in Section IV of both forms)
export const RECOMMENDATION_LABELS: Record<string, string> = {
  continue:              "Continue in current position",
  higher_responsibility: "Ready for higher responsibility in (state time frame)",
  promotion:             "Recommend for promotion to",
};
