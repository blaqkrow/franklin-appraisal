import { test } from "node:test";
import assert from "node:assert/strict";
import { jar, SEEDED, getEmployeeByNo, serviceClient } from "./helpers.mjs";

test("auth: reject wrong password", async () => {
  const c = jar();
  const res = await c.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ employee_no: "HR001", password: "wrong" }),
  });
  assert.equal(res.status, 401);
});

test("auth: reject unknown employee", async () => {
  const c = jar();
  const res = await c.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ employee_no: "NONEXISTENT", password: "franklin2026" }),
  });
  assert.equal(res.status, 401);
});

test("auth: HR admin login + persisted password hash after first login", async () => {
  const c = jar();
  await c.login(SEEDED.hr.no, SEEDED.hr.password);
  const emp = await getEmployeeByNo(SEEDED.hr.no);
  assert.ok(emp.password_hash, "password_hash should be set on first login");
  assert.match(emp.password_hash, /^scrypt\$/, "hash uses scrypt format");

  // Session row exists in Supabase
  const sb = serviceClient();
  const { data: sessions } = await sb
    .from("sessions")
    .select("*")
    .eq("employee_id", emp.id);
  assert.ok(sessions.length >= 1, "session row persisted to Supabase");
});

test("auth: all seeded roles can log in", async () => {
  for (const [name, creds] of Object.entries(SEEDED)) {
    const c = jar();
    const data = await c.login(creds.no, creds.password);
    assert.equal(data.ok, true, `${name} login`);
    assert.ok(data.role, `${name} returns role`);
  }
});

test("auth: session-gated endpoint rejects unauthenticated", async () => {
  const res = await fetch(`${process.env.TEST_BASE_URL || "http://localhost:3460"}/api/appraisals`);
  assert.equal(res.status, 401);
});

test("auth: logout invalidates cookie; subsequent request is 401", async () => {
  const c = jar();
  await c.login(SEEDED.hr.no, SEEDED.hr.password);
  const { res: r1 } = await c.json("/api/appraisals");
  assert.equal(r1.status, 200);
  await c.logout();
  const r2 = await c.fetch("/api/appraisals");
  assert.equal(r2.status, 401);
});

test("auth: HR can reset another employee's password and they can log in with it", async () => {
  const hr = jar();
  await hr.login(SEEDED.hr.no, SEEDED.hr.password);
  const target = await getEmployeeByNo(SEEDED.workerRavi.no);
  const newPw = "changed" + Math.random().toString(36).slice(2, 8);
  const reset = await hr.json("/api/hr/reset-password", {
    method: "POST",
    body: JSON.stringify({ employee_id: target.id, new_password: newPw }),
  });
  assert.equal(reset.res.status, 200);

  const c = jar();
  const d = await c.login(SEEDED.workerRavi.no, newPw);
  assert.equal(d.must_change_password, true, "reset forces change on next login");

  // Restore original password via HR reset (so other tests still pass)
  await hr.json("/api/hr/reset-password", {
    method: "POST",
    body: JSON.stringify({ employee_id: target.id, new_password: SEEDED.workerRavi.password }),
  });
});

test("auth: non-HR cannot reset someone else's password", async () => {
  const c = jar();
  await c.login(SEEDED.appraiser.no, SEEDED.appraiser.password);
  const victim = await getEmployeeByNo(SEEDED.workerJohn.no);
  const res = await c.fetch("/api/hr/reset-password", {
    method: "POST",
    body: JSON.stringify({ employee_id: victim.id, new_password: "oops" }),
  });
  assert.equal(res.status, 403);
});

test("auth: change-password requires correct current password", async () => {
  const c = jar();
  await c.login(SEEDED.officeSarah.no, SEEDED.officeSarah.password);
  const bad = await c.json("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current: "wrong", next: "newpassword" }),
  });
  assert.equal(bad.res.status, 400);

  const good = await c.json("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current: SEEDED.officeSarah.password, next: "temppass99" }),
  });
  assert.equal(good.res.status, 200);

  // Change back
  await c.json("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current: "temppass99", next: SEEDED.officeSarah.password }),
  });
});
