import { NextRequest, NextResponse } from "next/server";
import { listEmployees, upsertEmployee } from "@/lib/store";
import type { Employee } from "@/types";

export async function GET() {
  return NextResponse.json(listEmployees());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Employee>;
  const id = body.id ?? `usr_${Math.random().toString(36).slice(2, 10)}`;
  const e: Employee = {
    id,
    employeeId: body.employeeId ?? "",
    name: body.name ?? "",
    email: body.email ?? "",
    department: body.department ?? "",
    designation: body.designation ?? "",
    formType: body.formType ?? "office_staff",
    hodId: body.hodId,
    countersignerId: body.countersignerId,
    isActive: body.isActive ?? true,
    joinedDate: body.joinedDate ?? new Date().toISOString().slice(0, 10),
  };
  upsertEmployee(e);
  return NextResponse.json(e);
}
