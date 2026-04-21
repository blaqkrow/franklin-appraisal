import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { setPassword } from "@/lib/repo";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "hr_admin") {
    return NextResponse.json({ error: "HR admin only" }, { status: 403 });
  }
  const { employee_id, new_password } = (await req.json()) as {
    employee_id: string;
    new_password: string;
  };
  if (!employee_id || !new_password) {
    return NextResponse.json({ error: "employee_id and new_password required" }, { status: 400 });
  }
  await setPassword(employee_id, hashPassword(new_password), true);
  return NextResponse.json({ ok: true });
}
