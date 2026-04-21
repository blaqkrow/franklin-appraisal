// Shared test helpers: fetch-with-cookie, login, Supabase direct client.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

// Load .env.local so tests work whether or not the shell has it
const envPath = path.resolve(process.cwd(), ".env.local");
try {
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* ignore */
}

export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3460";

export const SEEDED = {
  hr:     { no: "HR001",  password: "admin2026" },
  sm:     { no: "MGT001", password: "franklin2026" },
  hodOps: { no: "OPS001", password: "franklin2026" },
  hodFin: { no: "OFC001", password: "franklin2026" },
  appraiser: { no: "OPS010", password: "franklin2026" },
  workerJohn: { no: "F0042", password: "franklin2026" },
  workerRavi: { no: "F0043", password: "franklin2026" },
  officeSarah: { no: "F2101", password: "franklin2026" },
  officeDaniel: { no: "F2102", password: "franklin2026" },
};

/**
 * Simple cookie jar that tracks the franklin_sess cookie only.
 */
export function jar() {
  let cookie = null;
  const wrap = {
    async fetch(path, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      if (cookie) headers.cookie = `franklin_sess=${cookie}`;
      if (opts.body && !headers["content-type"] && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers, redirect: "manual" });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const m = setCookie.match(/franklin_sess=([^;]+)/);
        if (m) cookie = m[1];
      }
      return res;
    },
    async json(path, opts) {
      const res = await wrap.fetch(path, opts);
      const text = await res.text();
      try {
        return { res, data: JSON.parse(text) };
      } catch {
        return { res, data: text };
      }
    },
    async login(employee_no, password) {
      const { res, data } = await wrap.json("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ employee_no, password }),
      });
      if (!res.ok) throw new Error(`login(${employee_no}): ${res.status} ${JSON.stringify(data)}`);
      return data;
    },
    async logout() {
      await wrap.fetch("/api/auth/logout", { method: "POST" });
      cookie = null;
    },
    get cookie() {
      return cookie;
    },
  };
  return wrap;
}

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Wait until the server answers GET /login with 200.
 */
export async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms at ${BASE_URL}`);
}

/**
 * Reset the live DB to a clean state for the current cycle year:
 *  - delete all appraisals (cascade nukes scores/training/narrative/section_iv/signatures/audit)
 *  - reset employee password_hash so seeded logins work with the default
 *  - clear sessions
 */
export async function resetState() {
  const sb = serviceClient();
  await sb.from("audit_log").delete().gt("at", "1900-01-01");
  await sb.from("appraisals").delete().gt("created_at", "1900-01-01");
  await sb.from("sessions").delete().gt("created_at", "1900-01-01");
  // Reset password_hash for all seeded users so the bootstrap path sets it fresh each run.
  const seeded = Object.values(SEEDED).map((x) => x.no);
  await sb.from("employees").update({ password_hash: null, must_change_password: false }).in("employee_no", seeded);
}

export async function getEmployeeByNo(no) {
  const sb = serviceClient();
  const { data } = await sb.from("employees").select("*").eq("employee_no", no).maybeSingle();
  return data;
}

export async function getAppraisalById(id) {
  const sb = serviceClient();
  const { data } = await sb.from("appraisals").select("*").eq("id", id).maybeSingle();
  return data;
}

export function rand(prefix = "tst") {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}
