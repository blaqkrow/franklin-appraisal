import { NextRequest, NextResponse } from "next/server";
import {
  appraisalsForRole,
  bulkCreateForCycle,
  createAppraisalFor,
} from "@/lib/store";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = getSession();
  return NextResponse.json(appraisalsForRole(s.role, s.userId));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { employeeId?: string; bulk?: boolean };
  if (body.bulk) {
    return NextResponse.json(bulkCreateForCycle());
  }
  if (!body.employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }
  const a = createAppraisalFor(body.employeeId);
  return NextResponse.json(a);
}
