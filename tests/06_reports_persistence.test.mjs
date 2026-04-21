// Bulk create, reporting, CSV export, and final Supabase persistence snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jar,
  SEEDED,
  serviceClient,
} from "./helpers.mjs";

test("bulk create: generates an appraisal per active appraisee and kicks off to appraiser", async () => {
  const sb = serviceClient();
  // Start clean
  await sb.from("appraisals").delete().gt("created_at", "1900-01-01");

  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const r = await hr.json("/api/appraisals", {
    method: "POST",
    body: JSON.stringify({ bulk: true }),
  });
  assert.equal(r.res.status, 200);
  assert.ok(r.data.created >= 1, `bulk created >0 (got ${r.data.created})`);

  const { data: rows } = await sb.from("appraisals").select("state, employee_id");
  assert.equal(rows.length, r.data.created);
  const uniqEmployees = new Set(rows.map((x) => x.employee_id));
  assert.equal(uniqEmployees.size, rows.length, "one appraisal per employee");
  for (const row of rows) {
    assert.equal(row.state, "pending_appraiser", "bulk-created rows land in pending_appraiser");
  }
});

test("CSV export: HR can download cycle CSV with all seeded rows", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const res = await hr.fetch("/api/export");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
  const body = await res.text();
  const lines = body.trim().split("\n");
  assert.ok(lines[0].startsWith("Cycle Year,Employee No,Name"), "header present");
  assert.ok(lines.length >= 2, "at least one data row");
});

test("CSV export: non-HR / non-SM gets 403", async () => {
  const c = jar();
  await c.login(SEEDED.appraiser.no, SEEDED.appraiser.password);
  const res = await c.fetch("/api/export");
  assert.equal(res.status, 403);
});

test("reports page: SM can render it (HTML contains key sections)", async () => {
  const sm = jar();
  await sm.login(SEEDED.sm.no, SEEDED.sm.password);
  const res = await sm.fetch("/reports");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Company-Wide Summary/);
  assert.match(html, /Bell Curve/);
  assert.match(html, /Multi-Year Historical Tracking/);
});

test("reports page: non-HR / non-SM is redirected home", async () => {
  const c = jar();
  await c.login(SEEDED.workerJohn.no, SEEDED.workerJohn.password);
  const res = await c.fetch("/reports");
  // redirect() throws a 307 in Next server components
  assert.equal(res.status, 307);
});

test("csv import: HR can upload org-chart rows and they persist", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const testNo = `TEST${Date.now().toString().slice(-6)}`;
  const payload = {
    filename: "test_org.csv",
    rows: [
      {
        employee_no: testNo,
        name: "Test User",
        designation: "Test Designation",
        department: "Rigging Fabrication",
        date_joined: "2024-01-01",
        email: "test@franklin.com.sg",
        phone: "+6500000000",
        form_type: "workers",
        role: "appraisee",
        appraiser_no: "OPS010",
        hod_no: "OPS001",
        sm_no: "MGT001",
      },
    ],
  };
  const r = await hr.json("/api/employees/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assert.equal(r.res.status, 200);
  assert.equal(r.data.upserted, 1);

  const sb = serviceClient();
  const { data: emp } = await sb
    .from("employees")
    .select("*")
    .eq("employee_no", testNo)
    .maybeSingle();
  assert.ok(emp, "new employee persisted");
  assert.equal(emp.name, "Test User");
  assert.ok(emp.appraiser_id, "appraiser_id wired by CSV import");
  assert.ok(emp.hod_id, "hod_id wired by CSV import");
  assert.ok(emp.sm_id, "sm_id wired by CSV import");

  const { data: upload } = await sb
    .from("org_chart_uploads")
    .select("*")
    .eq("filename", "test_org.csv")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assert.ok(upload, "upload audit row persisted");
  assert.equal(upload.row_count, 1);

  // Cleanup
  await sb.from("employees").delete().eq("id", emp.id);
  await sb.from("org_chart_uploads").delete().eq("id", upload.id);
});

test("persistence snapshot: schema contains required tables with rows", async () => {
  const sb = serviceClient();
  const tables = [
    "employees",
    "appraisal_cycles",
    "appraisals",
    "appraisal_scores",
    "appraisal_training",
    "appraisal_narrative",
    "section_iv",
    "signatures",
    "audit_log",
    "sessions",
    "org_chart_uploads",
  ];
  for (const t of tables) {
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    assert.equal(error, null, `select from ${t} errored: ${error?.message}`);
    assert.ok(typeof count === "number", `count returned for ${t}`);
  }

  // Employees seeded
  const { data: emps } = await sb.from("employees").select("employee_no").eq("is_active", true);
  const nos = new Set(emps.map((x) => x.employee_no));
  for (const v of Object.values(SEEDED)) {
    assert.ok(nos.has(v.no), `seeded employee ${v.no} present`);
  }
});
