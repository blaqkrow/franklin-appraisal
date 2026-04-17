import type { Factor, FormType } from "@/types";

export const PRODUCTION_WORKER_FACTORS: Factor[] = [
  {
    no: "01",
    name: "Safety & Compliance",
    weight: 0.25,
    gate: true,
    indicators:
      "0 incidents, full PPE compliance → 5 | 1 minor near-miss or PPE lapse → 3 | LTI or deliberate SOP breach → 1",
  },
  {
    no: "02",
    name: "Quality & Accuracy",
    weight: 0.2,
    indicators:
      "0 reworks, 100% first-pass inspection → 5 | 2–3 QC-flagged reworks → 3 | Customer complaint or failed proof load → 1",
  },
  {
    no: "03",
    name: "Productivity & Output",
    weight: 0.15,
    indicators:
      "≥110% of output standard → 5 | 100–109% → 4 | 85–99% → 3 | 70–84% → 2 | <70% → 1",
  },
  {
    no: "04",
    name: "Process Adherence & Work Standards",
    weight: 0.15,
    indicators:
      "0 deviations, full traceability records → 5 | 2–3 minor deviations corrected by supervisor → 3 | Unauthorised shortcut on critical step → 1",
  },
  {
    no: "05",
    name: "Technical Competency & Skill Development",
    weight: 0.1,
    indicators:
      "Multi-sling types, WLL knowledge, cert in progress → 5 | Single type, basic knowledge → 3 | Minimal skill breadth → 1",
  },
  {
    no: "06",
    name: "Teamwork & Communication",
    weight: 0.1,
    indicators:
      "Proactively communicates, assists and mentors peers → 5 | Cooperative when prompted → 3 | Poor communication affecting floor output → 1",
  },
  {
    no: "07",
    name: "Reliability & Attendance",
    weight: 0.05,
    indicators:
      "0 absences, 0 late → 5 | ≤1 notified absence → 4 | 2–3 absences → 3 | 4–5 absences → 2 | ≥6 or no-shows → 1",
  },
];

export const OFFICE_STAFF_FACTORS: Factor[] = [
  {
    no: "01",
    name: "Quality of Work",
    weight: 0.17,
    indicators: "Error rate ≤5%. ≤1 mistake per month.",
  },
  {
    no: "02",
    name: "Quantity / Productivity",
    weight: 0.17,
    indicators:
      "Completes 90–100% of assigned tasks on time. Rework required ≤1 time per month.",
  },
  {
    no: "03",
    name: "Safety Compliance",
    weight: 0.16,
    indicators:
      "0 serious safety violations. ≤3 minor safety lapses during appraisal period.",
  },
  {
    no: "04",
    name: "Reliability / Attendance",
    weight: 0.09,
    indicators:
      "Attendance ≥90%. Unplanned absenteeism ≤2 days per quarter. Late arrival ≤2 times per month.",
  },
  {
    no: "05",
    name: "Initiative / Problem Solving",
    weight: 0.09,
    indicators: "Solves routine problems ≥80% independently.",
  },
  {
    no: "06",
    name: "Attitude & Enthusiasm",
    weight: 0.09,
    indicators:
      "Maintains professional behaviour ≥90% of the time. 0 formal valid complaints or warnings.",
  },
  {
    no: "07",
    name: "Process Adherence",
    weight: 0.09,
    indicators:
      "Follows SOPs and work standards ≥90% of the time. ≤1 non-adherence per month.",
  },
  {
    no: "08",
    name: "Skill Development / Growth Potential",
    weight: 0.07,
    indicators:
      "Shows ability to learn, apply new skills, and handle increased responsibility with guidance.",
  },
  {
    no: "09",
    name: "Teamwork",
    weight: 0.07,
    indicators: "Cooperates with team in ≥80% of work activities.",
  },
];

export function factorsFor(formType: FormType): Factor[] {
  return formType === "production_worker"
    ? PRODUCTION_WORKER_FACTORS
    : OFFICE_STAFF_FACTORS;
}

export const RATING_LABELS: Record<number, { label: string; desc: string }> = {
  5: { label: "Outstanding", desc: "Consistently and significantly exceeds expectations" },
  4: { label: "Exceeds Expectation", desc: "Above the required standard in most areas" },
  3: { label: "Meets Expectation", desc: "Fully satisfactory; meets all requirements" },
  2: { label: "Below Expectation", desc: "Falls short of the required standard in key areas" },
  1: { label: "Very Much Below", desc: "Significantly below standard; immediate improvement needed" },
};

export const PERFORMANCE_BANDS = [
  { min: 4.5, max: 5.0, label: "Outstanding", color: "#065f46" },
  { min: 3.5, max: 4.49, label: "Exceeds Expectations", color: "#1d6e3f" },
  { min: 2.5, max: 3.49, label: "Meets Expectations", color: "#374151" },
  { min: 1.5, max: 2.49, label: "Below Expectations", color: "#b45309" },
  { min: 1.0, max: 1.49, label: "Very Much Below Expectations", color: "#b91c1c" },
] as const;

export const GUIDELINES = [
  "Stay within the review period: 01 October (previous year) to 30 September (current year).",
  "Do not refer to past appraisal reports when completing the current one.",
  "Be objective — do not let personal feelings or relationships influence the rating.",
  "Consider each factor independently — do not let one trait influence the overall rating.",
  "Rate each factor individually first; do not decide the overall score in advance.",
  "Only recommend promotion if the employee is qualified and has consistently strong performance.",
  "If supervised for less than 6 months, consult the previous supervisor and record the consultation in comments.",
  "All forms must be submitted to HR by 7 October this year.",
];
