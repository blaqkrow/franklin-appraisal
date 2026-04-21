// Full end-to-end workflow walk for a Non-Office / Workers form.
// Exercises all 5 roles, 11 criteria, training checkboxes, Section IV, SM concurrence, HR accept.
// Verifies data persists to Supabase at every step.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jar,
  SEEDED,
  getEmployeeByNo,
  getAppraisalById,
  serviceClient,
} from "./helpers.mjs";

test("workers: full workflow end-to-end (Appraiser → Appraisee → HOD → SM → HR)", async () => {
  const sb = serviceClient();
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);

  // 1. Admin creates an Annual appraisal for John Tan (F0042, workers form)
  const john = await getEmployeeByNo(SEEDED.workerJohn.no);
  const create = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({
      employee_id: john.id,
      appraisal_type: "annual",
    }),
  });
  assert.equal(create.res.status, 200);
  const appraisalId = create.data.id;
  assert.ok(appraisalId, "appraisal has id");

  // Verify DB row
  let row = await getAppraisalById(appraisalId);
  assert.equal(row.form_type, "workers");
  assert.equal(row.appraisal_type, "annual");
  assert.equal(row.state, "pending_appraiser", "auto-transitioned after create");
  assert.equal(row.employee_id, john.id);
  assert.equal(row.appraiser_id, john.appraiser_id);
  assert.equal(row.hod_id, john.hod_id);
  assert.equal(row.sm_id, john.sm_id);

  // Score rows seeded for all 11 workers criteria
  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", appraisalId)
    .order("criterion_no");
  assert.equal(scores.length, 11, "11 score rows seeded");
  // Criterion 11 (Supervisory - if applicable) should default to is_applicable=false
  const supervisory = scores.find((s) => s.criterion_no === 11);
  assert.equal(supervisory.is_applicable, false, "optional supervisory criterion defaults N/A");

  // Training rows seeded
  const { data: training } = await sb
    .from("appraisal_training")
    .select("*")
    .eq("appraisal_id", appraisalId);
  assert.equal(training.length, 9, "9 workers training options seeded");

  // 2. Appraiser (OPS010) logs in, scores each criterion, adds comments, submits
  const appraiser = jar();
  await appraiser.login(SEEDED.appraiser.no, SEEDED.appraiser.password);

  // Appraiser sees John in their queue
  const { data: queue } = await appraiser.json("/api/appraisals");
  assert.ok(
    queue.find((a) => a.id === appraisalId),
    "appraisal visible to appraiser",
  );

  // Patch ratings: rate all 10 applicable criteria = 4, criterion 11 stays N/A
  const ratings = scores.map((s) => ({
    criterion_no: s.criterion_no,
    is_applicable: s.criterion_no !== 11,
    appraiser_rating: s.criterion_no === 11 ? null : 4,
    comments:
      s.criterion_no === 11 ? "" : `Example for criterion ${s.criterion_no}: consistently meets standard.`,
  }));

  // Select a few training checkboxes
  const trainingPatch = training.map((t) => ({
    training_type: t.training_type,
    is_selected: t.training_type.includes("Rigging") || t.training_type.includes("First Aid"),
    remarks: t.training_type.includes("Others") ? "" : "",
  }));

  const patch1 = await appraiser.json(`/api/appraisals/${appraisalId}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: ratings,
      training: trainingPatch,
      narrative: {
        appraiser_overall_comments: "Solid performer; reliable on wire rope tasks.",
      },
    }),
  });
  assert.equal(patch1.res.status, 200);

  // Totals recomputed by DB trigger
  row = await getAppraisalById(appraisalId);
  assert.equal(Number(row.max_score), 50, "max = 10 applicable × 5");
  assert.equal(Number(row.total_score), 40, "total = 10 × 4");
  assert.equal(Number(row.overall_pct), 80, "overall = 40/50 = 80%");

  // Submit to appraisee
  const step1 = await appraiser.json(`/api/appraisals/${appraisalId}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });
  assert.equal(step1.res.status, 200);
  row = await getAppraisalById(appraisalId);
  assert.equal(row.state, "pending_appraisee");
  assert.ok(row.appraiser_submitted_at, "appraiser submission timestamp set");

  // Verify a signature row was written
  const { data: sigs1 } = await sb
    .from("signatures")
    .select("*")
    .eq("appraisal_id", appraisalId)
    .eq("role", "appraiser");
  assert.ok(sigs1.length >= 1, "appraiser signature persisted");

  // 3. Appraisee (John) logs in, adds staff comments, signs
  const appraisee = jar();
  await appraisee.login(SEEDED.workerJohn.no, SEEDED.workerJohn.password);

  // Appraisee sees their appraisal
  const mine = await appraisee.json("/api/appraisals");
  assert.equal(mine.data.length, 1, "appraisee only sees their own appraisal");
  assert.equal(mine.data[0].id, appraisalId);

  // Full fetch — Section IV must be null
  const detail = await appraisee.json(`/api/appraisals/${appraisalId}`);
  assert.equal(detail.res.status, 200);
  assert.equal(
    detail.data.section_iv,
    null,
    "PRD §6: Section IV stripped at API for appraisee",
  );
  // Also ensure scores and training are visible
  assert.equal(detail.data.scores.length, 11);
  assert.equal(detail.data.training.length, 9);

  // Add staff comments
  await appraisee.json(`/api/appraisals/${appraisalId}`, {
    method: "PATCH",
    body: JSON.stringify({
      narrative: { staff_comments: "I acknowledge and appreciate the feedback." },
    }),
  });

  // Appraisee cannot modify scores — should 403
  const scoreAttempt = await appraisee.fetch(`/api/appraisals/${appraisalId}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: [{ criterion_no: 1, is_applicable: true, appraiser_rating: 5, comments: "I want 5" }],
    }),
  });
  assert.equal(scoreAttempt.status, 403, "appraisee cannot modify scores");

  const step2 = await appraisee.json(`/api/appraisals/${appraisalId}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "appraisee_sign" }),
  });
  assert.equal(step2.res.status, 200);
  row = await getAppraisalById(appraisalId);
  assert.equal(row.state, "pending_hod");

  // 4. HOD (OPS001) logs in, adds comments, ticks Section IV "continue", submits to SM
  const hod = jar();
  await hod.login(SEEDED.hodOps.no, SEEDED.hodOps.password);

  // HOD sees section IV
  const hodView = await hod.json(`/api/appraisals/${appraisalId}`);
  assert.ok(hodView.data.section_iv, "HOD sees Section IV");

  // Update Section IV recommendation
  await hod.json(`/api/appraisals/${appraisalId}`, {
    method: "PATCH",
    body: JSON.stringify({
      narrative: { hod_comments: "Performance meets expectations for current role." },
      section_iv: { recommendation: "continue" },
    }),
  });

  const step3 = await hod.json(`/api/appraisals/${appraisalId}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "hod_submit" }),
  });
  assert.equal(step3.res.status, 200);
  row = await getAppraisalById(appraisalId);
  assert.equal(row.state, "pending_sm");

  // Verify section IV persisted
  const { data: sec4 } = await sb
    .from("section_iv")
    .select("*")
    .eq("appraisal_id", appraisalId)
    .maybeSingle();
  assert.equal(sec4.recommendation, "continue");

  // 5. Senior Management concurs (no override) and submits to HR
  const sm = jar();
  await sm.login(SEEDED.sm.no, SEEDED.sm.password);
  await sm.json(`/api/appraisals/${appraisalId}`, {
    method: "PATCH",
    body: JSON.stringify({ narrative: { sm_comments: "Concur with HOD assessment." } }),
  });
  const step4 = await sm.json(`/api/appraisals/${appraisalId}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "sm_concur" }),
  });
  assert.equal(step4.res.status, 200);
  row = await getAppraisalById(appraisalId);
  assert.equal(row.state, "pending_hr");

  // 6. HR accepts and archives
  await hr.json(`/api/appraisals/${appraisalId}`, {
    method: "PATCH",
    body: JSON.stringify({ narrative: { hr_remarks: "Filed." } }),
  });
  const step5 = await hr.json(`/api/appraisals/${appraisalId}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "hr_accept" }),
  });
  assert.equal(step5.res.status, 200);
  row = await getAppraisalById(appraisalId);
  assert.equal(row.state, "completed");
  assert.ok(row.hr_accepted_at);
  assert.ok(row.completed_at);

  // 7. Verify full audit trail and signatures persisted for every role
  const { data: audit } = await sb
    .from("audit_log")
    .select("*")
    .eq("appraisal_id", appraisalId)
    .order("at");
  const actions = audit.map((a) => `${a.actor_role}→${a.action}`);
  // Must include entries for every actor
  const actorRoles = new Set(audit.map((a) => a.actor_role));
  for (const r of ["hr_admin", "appraiser", "appraisee", "hod", "senior_management"]) {
    assert.ok(actorRoles.has(r), `audit has ${r} entry (got: ${actions.join(", ")})`);
  }

  const { data: allSigs } = await sb
    .from("signatures")
    .select("role")
    .eq("appraisal_id", appraisalId);
  const sigRoles = new Set(allSigs.map((s) => s.role));
  for (const r of ["appraiser", "appraisee", "hod", "senior_management", "hr_admin"]) {
    assert.ok(sigRoles.has(r), `signature for ${r} persisted`);
  }

  // 8. Narrative should contain all five role comments
  const { data: narr } = await sb
    .from("appraisal_narrative")
    .select("*")
    .eq("appraisal_id", appraisalId)
    .maybeSingle();
  assert.ok(narr.appraiser_overall_comments.length > 0);
  assert.ok(narr.staff_comments.length > 0);
  assert.ok(narr.hod_comments.length > 0);
  assert.ok(narr.sm_comments.length > 0);
  assert.ok(narr.hr_remarks.length > 0);
});
