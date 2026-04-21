// SM override updates effective_rating and overall_pct; rejection path resets state.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jar,
  SEEDED,
  getEmployeeByNo,
  getAppraisalById,
  serviceClient,
} from "./helpers.mjs";

async function primeRaviWorkflow() {
  // Create + walk to pending_sm so we can test override + rejection. Reset first
  // so residue from prior tests doesn't leave Ravi in an unexpected state.
  const sb = serviceClient();
  const ravi = await getEmployeeByNo(SEEDED.workerRavi.no);
  await sb.from("appraisals").delete().eq("employee_id", ravi.id);

  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const create = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: ravi.id, appraisal_type: "annual" }),
  });
  const id = create.data.id;

  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id)
    .order("criterion_no");

  const appraiser = jar();
  await appraiser.login(SEEDED.appraiser.no, SEEDED.appraiser.password);
  const ratings = scores.map((s) => ({
    criterion_no: s.criterion_no,
    is_applicable: s.criterion_no !== 11,
    appraiser_rating: s.criterion_no === 11 ? null : 5,
    comments: s.criterion_no === 11 ? "" : "Example.",
  }));
  await appraiser.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: ratings,
      narrative: { appraiser_overall_comments: "Exceeds." },
    }),
  });
  await appraiser.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });

  const appraisee = jar();
  await appraisee.login(SEEDED.workerRavi.no, SEEDED.workerRavi.password);
  await appraisee.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ narrative: { staff_comments: "Agree." } }),
  });
  await appraisee.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "appraisee_sign" }),
  });

  const hod = jar();
  await hod.login(SEEDED.hodOps.no, SEEDED.hodOps.password);
  await hod.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      narrative: { hod_comments: "Recommend promotion path." },
      section_iv: { recommendation: "higher_responsibility", timeframe: "12 months" },
    }),
  });
  await hod.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "hod_submit" }),
  });

  return { id, ravi };
}

test("sm override: lowers two ratings; effective_rating and overall_pct reflect override", async () => {
  const { id } = await primeRaviWorkflow();
  const sb = serviceClient();

  // Before: 10 × 5 = 50/50 = 100%
  let row = await getAppraisalById(id);
  assert.equal(Number(row.overall_pct), 100, "baseline HOD ratings = 100%");

  const sm = jar();
  await sm.login(SEEDED.sm.no, SEEDED.sm.password);

  // Fetch full detail (as SM sees override fields)
  const { data: currentScores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id)
    .order("criterion_no");

  // Override two ratings: 1 → 3, 2 → 4
  const overridden = currentScores.map((s) => ({
    criterion_no: s.criterion_no,
    is_applicable: s.is_applicable,
    appraiser_rating: s.appraiser_rating,
    sm_rating: s.criterion_no === 1 ? 3 : s.criterion_no === 2 ? 4 : null,
    comments: s.comments,
  }));
  const r = await sm.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: overridden,
      narrative: { sm_comments: "Tempering ratings after review." },
    }),
  });
  assert.equal(r.res.status, 200);

  // Effective rating = sm_rating if present else appraiser_rating; total = 3+4+5×8 = 47; pct = 94
  row = await getAppraisalById(id);
  assert.equal(Number(row.total_score), 47, "total = 3+4+8×5 after override");
  assert.equal(Number(row.overall_pct), 94);

  const { data: s1 } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id)
    .eq("criterion_no", 1)
    .single();
  assert.equal(s1.appraiser_rating, 5, "original HOD rating preserved");
  assert.equal(s1.sm_rating, 3);
  assert.equal(s1.effective_rating, 3, "effective = sm (override)");

  const { data: s3 } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id)
    .eq("criterion_no", 3)
    .single();
  assert.equal(s3.sm_rating, null);
  assert.equal(s3.effective_rating, 5, "effective = appraiser when no override");
});

test("reject: SM rejection stores reason and returns to rejected state", async () => {
  // Create a fresh pending_sm appraisal by priming
  const { id } = await primeRaviWorkflow();
  const sm = jar();
  await sm.login(SEEDED.sm.no, SEEDED.sm.password);

  // Reject without reason → 400
  const bad = await sm.fetch(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "reject" }),
  });
  assert.equal(bad.status, 400, "rejection requires reason");

  const r = await sm.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "reject", reason: "Need HOD to justify criterion 3 rating." }),
  });
  assert.equal(r.res.status, 200);
  const row = await getAppraisalById(id);
  assert.equal(row.state, "rejected");
  assert.match(row.rejected_reason, /justify criterion 3/);

  // Audit has rejection entry
  const sb = serviceClient();
  const { data: audit } = await sb
    .from("audit_log")
    .select("*")
    .eq("appraisal_id", id)
    .order("at", { ascending: false });
  assert.match(audit[0].action, /→ rejected/);
  assert.match(audit[0].detail ?? "", /justify criterion 3/);
});

test("forbidden: appraiser cannot act while state is pending_appraisee", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const john = await getEmployeeByNo(SEEDED.workerJohn.no);
  // Ensure we have a fresh appraisal by deleting any existing one for this cycle first
  const sb = serviceClient();
  await sb.from("appraisals").delete().eq("employee_id", john.id);

  const create = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: john.id, appraisal_type: "annual" }),
  });
  const id = create.data.id;
  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id)
    .order("criterion_no");

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
      narrative: { appraiser_overall_comments: "ok" },
    }),
  });
  await appraiser.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });

  // Try to act on it again as appraiser — should be rejected
  const stray = await appraiser.fetch(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });
  assert.equal(stray.status, 403);
});
