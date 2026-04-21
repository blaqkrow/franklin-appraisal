import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEmployee, setPassword } from "@/lib/repo";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { current, next } = (await req.json()) as { current: string; next: string };
  if (!next || next.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }
  const emp = await getEmployee(session.employeeId);
  if (!emp) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!verifyPassword(current, emp.password_hash ?? null)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  await setPassword(emp.id, hashPassword(next), false);
  return NextResponse.json({ ok: true });
}
