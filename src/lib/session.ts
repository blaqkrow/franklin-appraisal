import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { serviceClient } from "./supabase";
import type { Employee, Session } from "@/types";

const COOKIE = "franklin_sess";
const SECRET = process.env.SESSION_SECRET ?? "franklin-dev-secret-change-me";
const SESSION_HOURS = 8;

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function pack(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function unpack(cookie: string): string | null {
  const [id, sig] = cookie.split(".");
  if (!id || !sig) return null;
  const expected = sign(id);
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  return id;
}

export async function createSession(employeeId: string, userAgent?: string): Promise<string> {
  const sb = serviceClient();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  const { data, error } = await sb
    .from("sessions")
    .insert({ employee_id: employeeId, expires_at: expires.toISOString(), user_agent: userAgent })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "session create failed");
  const token = pack(data.id);
  cookies().set(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) {
    const id = unpack(raw);
    if (id) {
      const sb = serviceClient();
      await sb.from("sessions").delete().eq("id", id);
    }
  }
  jar.set(COOKIE, "", { path: "/", expires: new Date(0) });
}

export async function getSession(): Promise<Session | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const id = unpack(raw);
  if (!id) return null;
  const sb = serviceClient();
  const { data, error } = await sb
    .from("sessions")
    .select("id, expires_at, employee_id, employees:employees(*)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  const emp = data.employees as unknown as Employee;
  if (!emp || !emp.is_active) return null;
  return {
    employeeId: emp.id,
    employeeNo: emp.employee_no,
    name: emp.name,
    role: emp.role,
    formType: emp.form_type,
    expiresAt: data.expires_at,
  };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("Unauthenticated");
  return s;
}

// For internal seed CSRF not needed — use state cookie only for forms.
export function newCsrfToken(): string {
  return randomBytes(16).toString("hex");
}
