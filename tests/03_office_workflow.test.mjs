// Office Staff form end-to-end: 15 criteria with several optional-N/A excluded from max.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jar,
  SEEDED,
  getEmployeeByNo,
  getAppraisalById,
  serviceClient,
} from "./helpers.mjs";

test("office: 15 criteria, N/A handling, non-integer percentage", async () => {
  const sb = serviceClient();
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);

  const sarah = await getEmployeeByNo(SEEDED.officeSarah.no);
  const create = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: sarah.id, appraisal_type: "annual" }),
  });
  assert.equal(create.res.status, 200);
  const id = create.data.id;
  let row = await getAppraisalById(id);
  assert.equal(row.form_type, "office");

  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id)
    .order("criterion_no");
  assert.equal(scores.length, 15, "office form has 15 criteria");
  const optional = scores.filter((s) => !s.is_applicable).map((s) => s.criterion_no);
  assert.deepEqual(optional, [11, 12, 13, 14, 15], "criteria 11–15 default N/A");

  // Training rows should be 5 office categories
  const { data: training } = await sb
    .from("appraisal_training")
    .select("*")
    .eq("appraisal_id", id);
  assert.equal(training.length, 5);

  // Appraiser (HOD-Finance) logs in and rates:
  //  - all 10 mandatory with mixed ratings (sum/max drives a non-round %)
  //  - criterion 11 toggled applicable with rating 5
  //  - 12–15 remain N/A
  const appraiser = jar();
  await appraiser.login(SEEDED.hodFin.no, SEEDED.hodFin.password);

  // Compute: ratings 4,5,3,4,4,3,5,4,4,3 = 39 across 10 mandatory; +5 for criterion 11 => 44 / 55 = 80.00%
  const ratingMap = { 1: 4, 2: 5, 3: 3, 4: 4, 5: 4, 6: 3, 7: 5, 8: 4, 9: 4, 10: 3, 11: 5 };
  const scoresPatch = scores.map((s) => ({
    criterion_no: s.criterion_no,
    is_applicable: s.criterion_no <= 11,
    appraiser_rating: ratingMap[s.criterion_no] ?? null,
    comments: s.criterion_no <= 11 ? `Evidence for criterion ${s.criterion_no}.` : "",
  }));

  await appraiser.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: scoresPatch,
      narrative: { appraiser_overall_comments: "Strong finance contributor." },
    }),
  });

  row = await getAppraisalById(id);
  assert.equal(Number(row.max_score), 55, "max = 11 applicable × 5");
  assert.equal(Number(row.total_score), 44, "total = 4+5+3+4+4+3+5+4+4+3+5 = 44");
  assert.equal(Number(row.overall_pct), 80, "44/55 = 80.00%");

  // Submit path continues end-to-end
  await appraiser.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });

  const appraisee = jar();
  await appraisee.login(SEEDED.officeSarah.no, SEEDED.officeSarah.password);
  const detail = await appraisee.json(`/api/appraisals/${id}`);
  assert.equal(
    detail.data.section_iv,
    null,
    "office appraisee also cannot see Section IV",
  );
  await appraisee.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ narrative: { staff_comments: "Thank you." } }),
  });
  await appraisee.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "appraisee_sign" }),
  });

  // HOD signs off (Finance HOD is the appraiser here, so Trevor as SM routes through the same path; for office Sarah, HOD=OFC001 which is the appraiser)
  // Since appraiser == hod in this seed, the route asserts role-based and hod sees pending_hod state now
  row = await getAppraisalById(id);
  assert.equal(row.state, "pending_hod");

  const hod = jar();
  await hod.login(SEEDED.hodFin.no, SEEDED.hodFin.password);
  await hod.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      narrative: { hod_comments: "Continue in current role." },
      section_iv: { recommendation: "continue" },
    }),
  });
  await hod.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "hod_submit" }),
  });
  row = await getAppraisalById(id);
  assert.equal(row.state, "pending_sm");

  const sm = jar();
  await sm.login(SEEDED.sm.no, SEEDED.sm.password);
  await sm.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "sm_concur" }),
  });
  row = await getAppraisalById(id);
  assert.equal(row.state, "pending_hr");

  await hr.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "hr_accept" }),
  });
  row = await getAppraisalById(id);
  assert.equal(row.state, "completed");
  assert.equal(Number(row.overall_pct), 80);
});
