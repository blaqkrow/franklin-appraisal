import { NextRequest, NextResponse } from "next/server";
import { getEmployeeByNo, setPassword } from "@/lib/repo";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { employee_no, password } = (await req.json()) as {
    employee_no: string;
    password: string;
  };
  if (!employee_no || !password) {
    return NextResponse.json({ error: "Employee Number and password required" }, { status: 400 });
  }
  const emp = await getEmployeeByNo(employee_no.trim());
  if (!emp || !emp.is_active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Bootstrap: if no password hash stored yet, accept the seed default and set it
  if (!emp.password_hash) {
    const seed = process.env.SEED_DEFAULT_PASSWORD || "franklin2026";
    const adminSeed = emp.role === "hr_admin" ? "admin2026" : seed;
    if (password !== adminSeed) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await setPassword(emp.id, hashPassword(password), false);
  } else if (!verifyPassword(password, emp.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(emp.id, req.headers.get("user-agent") ?? undefined);
  return NextResponse.json({
    ok: true,
    must_change_password: emp.must_change_password,
    role: emp.role,
  });
}
