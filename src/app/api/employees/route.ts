import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { listEmployees, upsertEmployee } from "@/lib/repo";

export async function GET() {
  await requireSession();
  return NextResponse.json(await listEmployees());
}

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s.role !== "hr_admin") return NextResponse.json({ error: "HR admin only" }, { status: 403 });
  const body = await req.json();
  if (!body.employee_no || !body.name) {
    return NextResponse.json({ error: "employee_no and name required" }, { status: 400 });
  }
  const e = await upsertEmployee(body);
  return NextResponse.json(e);
}
