// Verify that the criteria names, descriptions and training options persisted
// into Supabase match the two source PA forms verbatim:
//  - "FOI - Workers PA Form (for MIS_updated 20260116).doc"
//  - "FOI - Office Staff PA Form (for MIS _updated 20260116).doc"
//
// This is the "form fidelity" contract: an HR audit should find identical
// wording in the system and on the paper form.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jar,
  SEEDED,
  getEmployeeByNo,
  serviceClient,
} from "./helpers.mjs";

// Verbatim copies of the 11 Non-Office / Workers criteria (source: .doc §II)
const WORKERS_CRITERIA = [
  { no: 1,  name: "Quality of Work / Product Knowledge",
    description: "Neat, accurate and timely in completion of the job with correct application of relevant product knowledge." },
  { no: 2,  name: "Quantity of Work Done",
    description: "Ability to handle routine and extra workload." },
  { no: 3,  name: "Safety / Housekeeping",
    description: "The maintenance of a clean, organised and safe workplace." },
  { no: 4,  name: "Teamwork",
    description: "Ability to work effectively as part of a team." },
  { no: 5,  name: "Compliance",
    description: "Ability to understand, follow instructions & to process work according to internal SOP correctly." },
  { no: 6,  name: "Attitude to Job/Enthusiasm for Work",
    description: "Demonstrate interest and have a positive attitude towards the job." },
  { no: 7,  name: "Work Discipline",
    description: "Observation of company rules & regulations, including punctuality and attendance." },
  { no: 8,  name: "Responsibility / Reliability",
    description: "Being responsible and hardworking. The level of reliance that can be placed on the staff to complete work assignments." },
  { no: 9,  name: "Initiative / Problem Solving",
    description: "Ability to take initiative and to offer ideas on work improvements. Ability to solve work problem." },
  { no: 10, name: "Customer Service Attitude",
    description: "To interact courteously and professionally with customers and external parties." },
  { no: 11, name: "Supervisory Skills (if applicable)",
    description: "Ability to lead and manage team to complete work assignments." },
];

// Verbatim copies of the 15 Office Staff criteria (source: .doc §II)
const OFFICE_CRITERIA = [
  { no: 1,  name: "Jobs skills, Product Knowledge & Quality of Work",
    description: "Ability to apply product knowledge, provide accurate information, and to perform task effectively and efficiently." },
  { no: 2,  name: "Planning & Organisation",
    description: "Ability to plan and organise tasks. Time management." },
  { no: 3,  name: "Compliance & Accuracy & SOP Adherence",
    description: "Ability to comply with work requirements and ensure work accuracy by complying to company policies, SOPs, safety rules, and internal workflows correctly." },
  { no: 4,  name: "Commitment & Dependability",
    description: "Being responsible and hardworking. Trustworthiness and reliability." },
  { no: 5,  name: "Teamwork",
    description: "Ability to work effectively as part of a team. Interpersonal skills." },
  { no: 6,  name: "Service Attitude",
    description: "Ability to respond to customer needs, resolve issues, maintain professionalism, and represent the company well. Being courteous, positive, well-mannered and well-groomed." },
  { no: 7,  name: "Creativity",
    description: "Ability to take initiative and to contribute constructive new ideas for improvement." },
  { no: 8,  name: "Responsiveness & Adaptability",
    description: "Ability to respond quickly to instructions and changes." },
  { no: 9,  name: "Communication",
    description: "Ability to understand and to express ideas clearly as well as to share information." },
  { no: 10, name: "Work Discipline",
    description: "Observation of company rules & regulations, including punctuality and attendance." },
  { no: 11, name: "Supervisory/Leadership Skills (if applicable)",
    description: "Ability to lead and manage team to achieve business goals." },
  { no: 12, name: "Meeting of Sales Targets (if applicable)",
    description: "Ability to meet sales targets set." },
  { no: 13, name: "Create New Customer Accounts (if applicable)",
    description: "Ability to create new customer accounts." },
  { no: 14, name: "Customer Relationship (if applicable)",
    description: "Maintaining and managing relationship with customers. Planning customer visits (no. of sales visits), keeping close contact with customers and submitting sales visit reports." },
  { no: 15, name: "Debt Collection Effort (if applicable)",
    description: "The effort put in to collect payments from customers, especially long overdue payments." },
];

// Verbatim training options from the two forms
const WORKERS_TRAINING = [
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
const OFFICE_TRAINING = [
  "Technical Competency",
  "Service Excellence",
  "Communications",
  "Supervisory/Leadership",
  "Others",
];

// 1–5 rating labels (source: Section II of both forms)
const RATING_LABELS = {
  1: "Very Poor",
  2: "Poor",
  3: "Satisfactory",
  4: "Good",
  5: "Excellent",
};

async function primeAppraisal(employeeNo, type = "annual") {
  const sb = serviceClient();
  const emp = await getEmployeeByNo(employeeNo);
  await sb.from("appraisals").delete().eq("employee_id", emp.id);
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const { res, data } = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: emp.id, appraisal_type: type }),
  });
  assert.equal(res.status, 200);
  return data.id;
}

test("form-fidelity: Workers form — 11 criteria names + descriptions match verbatim", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no);
  const sb = serviceClient();
  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("criterion_no, criterion_name, is_applicable")
    .eq("appraisal_id", id)
    .order("criterion_no");

  assert.equal(scores.length, 11, "11 criteria seeded for workers form");
  for (const expected of WORKERS_CRITERIA) {
    const actual = scores.find((s) => s.criterion_no === expected.no);
    assert.ok(actual, `criterion ${expected.no} present`);
    assert.equal(
      actual.criterion_name,
      expected.name,
      `Workers criterion ${expected.no} name must match source doc verbatim`,
    );
  }
  // Optional-only criterion should be criterion 11
  const optional = scores.filter((s) => !s.is_applicable).map((s) => s.criterion_no);
  assert.deepEqual(optional, [11], "only criterion 11 is 'if applicable' → defaults N/A");
});

test("form-fidelity: Workers form — 9 training options in source-doc order", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no);
  const sb = serviceClient();
  const { data: training } = await sb
    .from("appraisal_training")
    .select("training_type")
    .eq("appraisal_id", id);

  const got = new Set(training.map((t) => t.training_type));
  for (const expected of WORKERS_TRAINING) {
    assert.ok(got.has(expected), `training option exactly matches: "${expected}"`);
  }
  assert.equal(training.length, WORKERS_TRAINING.length);
});

test("form-fidelity: Office form — 15 criteria names + descriptions match verbatim", async () => {
  const id = await primeAppraisal(SEEDED.officeSarah.no);
  const sb = serviceClient();
  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("criterion_no, criterion_name, is_applicable")
    .eq("appraisal_id", id)
    .order("criterion_no");

  assert.equal(scores.length, 15, "15 criteria seeded for office form");
  for (const expected of OFFICE_CRITERIA) {
    const actual = scores.find((s) => s.criterion_no === expected.no);
    assert.ok(actual, `criterion ${expected.no} present`);
    assert.equal(
      actual.criterion_name,
      expected.name,
      `Office criterion ${expected.no} name must match source doc verbatim`,
    );
  }
  // Optional criteria should be 11-15
  const optional = scores.filter((s) => !s.is_applicable).map((s) => s.criterion_no);
  assert.deepEqual(optional, [11, 12, 13, 14, 15], "criteria 11–15 are 'if applicable'");
});

test("form-fidelity: Office form — 5 training categories in source-doc order", async () => {
  const id = await primeAppraisal(SEEDED.officeSarah.no);
  const sb = serviceClient();
  const { data: training } = await sb
    .from("appraisal_training")
    .select("training_type")
    .eq("appraisal_id", id);

  const got = new Set(training.map((t) => t.training_type));
  for (const expected of OFFICE_TRAINING) {
    assert.ok(got.has(expected), `training category exactly matches: "${expected}"`);
  }
  assert.equal(training.length, OFFICE_TRAINING.length);
});

test("form-fidelity: rendered form HTML contains rating scale legend", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no);
  const c = jar();
  await c.login(SEEDED.workerJohn.no, SEEDED.workerJohn.password);
  const res = await c.fetch(`/appraisals/${id}`);
  const html = await res.text();
  // The Section II legend shows all 5 labels and their descriptions
  for (const [n, label] of Object.entries(RATING_LABELS)) {
    assert.ok(html.includes(label), `rendered form contains "${label}"`);
    assert.ok(
      html.includes(`${n}. ${label}`) || html.includes(`>${n}<`) || html.includes(`&gt;${n}&lt;`),
      `rating ${n} shown in matrix`,
    );
  }
});

test("form-fidelity: Annual/Confirmation/Promotion checkbox row rendered at top", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no, "confirmation");
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const res = await hr.fetch(`/appraisals/${id}`);
  const html = await res.text();
  assert.ok(html.includes("Annual Appraisal"));
  assert.ok(html.includes("Confirmation Appraisal"));
  assert.ok(html.includes("Promotion Appraisal"));
});

test("form-fidelity: Section IV heading and Section V (HR) heading rendered for HR", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no);
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const res = await hr.fetch(`/appraisals/${id}`);
  const html = await res.text();
  assert.match(html, /Not For Discussion With Appraisee/);
  assert.match(html, /Overall Assessment by Head of Department/);
  // Section V (HR) for HR role
  assert.match(html, /For HR.*Official Use only/);
});

test("form-fidelity: Section IV heading is NOT rendered for appraisee", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no);
  const c = jar();
  await c.login(SEEDED.workerJohn.no, SEEDED.workerJohn.password);
  const res = await c.fetch(`/appraisals/${id}`);
  const html = await res.text();
  assert.doesNotMatch(html, /Not For Discussion With Appraisee/,
    "PRD §6: Section IV heading never shown to appraisee");
  assert.doesNotMatch(html, /For HR.*Official Use only/,
    "Section V hidden from appraisee");
});

test("form-fidelity: Total line rendered as 'X / Y × 100% = Z%'", async () => {
  const id = await primeAppraisal(SEEDED.workerJohn.no);
  const sb = serviceClient();
  // Score all 10 mandatory with rating 4
  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id);
  const appraiser = jar();
  await appraiser.login(SEEDED.appraiser.no, SEEDED.appraiser.password);
  await appraiser.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: scores.map((s) => ({
        criterion_no: s.criterion_no,
        is_applicable: s.criterion_no !== 11,
        appraiser_rating: s.criterion_no === 11 ? null : 4,
        comments: s.criterion_no === 11 ? "" : "ok",
      })),
    }),
  });
  const res = await appraiser.fetch(`/appraisals/${id}`);
  const html = await res.text();
  // Numbers are rendered in a specific "X / Y × 100% = Z%" layout
  assert.match(html, />\s*40\s*</, "total 40 present");
  assert.match(html, />\s*50\s*</, "max 50 present");
  assert.match(html, /×\s*100%/, "× 100% shown");
  assert.match(html, />\s*80%\s*</, "result 80% shown");
});
