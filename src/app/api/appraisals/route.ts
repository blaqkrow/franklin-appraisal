import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import {
  bulkCreateForCycle,
  createAppraisal,
  currentCycleYear,
  listAppraisalsFor,
  transitionAppraisal,
} from "@/lib/repo";
import type { AppraisalType } from "@/types";

export async function GET() {
  try {
    const s = await requireSession();
    const rows = await listAppraisalsFor(s);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s.role !== "hr_admin") {
    return NextResponse.json({ error: "HR admin only" }, { status: 403 });
  }
  const body = (await req.json()) as {
    bulk?: boolean;
    employee_id?: string;
    appraisal_type?: AppraisalType;
    cycle_year?: number;
  };
  const cycleYear = body.cycle_year ?? currentCycleYear();
  if (body.bulk) {
    const result = await bulkCreateForCycle(cycleYear, s);
    return NextResponse.json(result);
  }
  if (!body.employee_id) {
    return NextResponse.json({ error: "employee_id required" }, { status: 400 });
  }
  const a = await createAppraisal({
    employeeId: body.employee_id,
    appraisalType: body.appraisal_type ?? "annual",
    cycleYear,
  });
  await transitionAppraisal(a.id, "pending_appraiser", s, "Admin kick-off");
  return NextResponse.json(a);
}
