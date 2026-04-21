// Submission validation + Section IV API gate + view permission boundaries.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jar,
  SEEDED,
  getEmployeeByNo,
  serviceClient,
} from "./helpers.mjs";

test("submission validation: appraiser cannot submit with missing ratings", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const hasan = await getEmployeeByNo("F0044");
  const sb = serviceClient();
  await sb.from("appraisals").delete().eq("employee_id", hasan.id);

  const c = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: hasan.id, appraisal_type: "annual" }),
  });
  const id = c.data.id;

  const appraiser = jar();
  await appraiser.login(SEEDED.appraiser.no, SEEDED.appraiser.password);

  // Attempt submit before rating anything
  const bad = await appraiser.fetch(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });
  assert.equal(bad.status, 400);
  const body = await bad.json();
  assert.match(body.error, /rate all applicable criteria/i);
});

test("submission validation: missing example comments rejected", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const hasan = await getEmployeeByNo("F0044");
  const sb = serviceClient();
  await sb.from("appraisals").delete().eq("employee_id", hasan.id);
  const c = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: hasan.id, appraisal_type: "annual" }),
  });
  const id = c.data.id;

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
        appraiser_rating: s.criterion_no === 11 ? null : 3,
        comments: "", // intentionally empty
      })),
      narrative: { appraiser_overall_comments: "ok" },
    }),
  });
  const r = await appraiser.fetch(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });
  assert.equal(r.status, 400);
  const body = await r.json();
  assert.match(body.error, /cite examples/i);
});

test("view boundary: appraiser cannot open an appraisal outside their reports", async () => {
  // Daniel (F2102) is Finance; HOD is Mei Tan (OFC001), appraiser is Mei too.
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const daniel = await getEmployeeByNo(SEEDED.officeDaniel.no);
  const sb = serviceClient();
  await sb.from("appraisals").delete().eq("employee_id", daniel.id);
  const c = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: daniel.id, appraisal_type: "annual" }),
  });
  const id = c.data.id;

  // Production appraiser (OPS010) should NOT be able to fetch this
  const otherAppraiser = jar();
  await otherAppraiser.login(SEEDED.appraiser.no, SEEDED.appraiser.password);
  const res = await otherAppraiser.fetch(`/api/appraisals/${id}`);
  assert.equal(res.status, 404, "out-of-scope fetch returns 404");
});

test("section iv PATCH: appraisee cannot edit it (role gate)", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const john = await getEmployeeByNo(SEEDED.workerJohn.no);
  const sb = serviceClient();
  await sb.from("appraisals").delete().eq("employee_id", john.id);
  const c = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: john.id, appraisal_type: "annual" }),
  });
  const id = c.data.id;

  const appraisee = jar();
  await appraisee.login(SEEDED.workerJohn.no, SEEDED.workerJohn.password);

  // Try to write Section IV — role gate in PATCH should block
  const res = await appraisee.fetch(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ section_iv: { recommendation: "promotion" } }),
  });
  assert.equal(res.status, 403);
});

test("confirmation appraisal: stores confirmation_date in section IV", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const daniel = await getEmployeeByNo(SEEDED.officeDaniel.no);
  const sb = serviceClient();
  await sb.from("appraisals").delete().eq("employee_id", daniel.id);
  const c = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ employee_id: daniel.id, appraisal_type: "confirmation" }),
  });
  const id = c.data.id;

  // HOD = Mei Tan (OFC001); walk state to pending_hod through appraiser+appraisee fast
  const { data: scores } = await sb
    .from("appraisal_scores")
    .select("*")
    .eq("appraisal_id", id);
  const appraiser = jar();
  await appraiser.login(SEEDED.hodFin.no, SEEDED.hodFin.password);
  await appraiser.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      scores: scores.map((s) => ({
        criterion_no: s.criterion_no,
        is_applicable: s.criterion_no <= 10,
        appraiser_rating: s.criterion_no <= 10 ? 4 : null,
        comments: s.criterion_no <= 10 ? "good" : "",
      })),
      narrative: { appraiser_overall_comments: "Ready to confirm." },
    }),
  });
  await appraiser.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "submit_to_appraisee" }),
  });

  const appraisee = jar();
  await appraisee.login(SEEDED.officeDaniel.no, SEEDED.officeDaniel.password);
  await appraisee.json(`/api/appraisals/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action: "appraisee_sign" }),
  });

  const hod = jar();
  await hod.login(SEEDED.hodFin.no, SEEDED.hodFin.password);
  await hod.json(`/api/appraisals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      narrative: { hod_comments: "Confirming." },
      section_iv: { confirmation_date: "2026-04-15", recommendation: "continue" },
    }),
  });

  const { data: sec4 } = await sb
    .from("section_iv")
    .select("*")
    .eq("appraisal_id", id)
    .maybeSingle();
  assert.equal(sec4.confirmation_date, "2026-04-15");
  assert.equal(sec4.recommendation, "continue");
});
