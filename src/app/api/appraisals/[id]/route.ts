import { NextRequest, NextResponse } from "next/server";
import { getAppraisal, saveAppraisal } from "@/lib/store";
import { getSession } from "@/lib/session";
import { canView } from "@/lib/workflow";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const a = getAppraisal(params.id);
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
  const s = getSession();
  if (!canView(s.role, a, s.userId))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(a);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = getAppraisal(params.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = await req.json();
  const merged = {
    ...existing,
    ...patch,
    id: existing.id,
    scores: patch.scores ?? existing.scores,
    narrative: { ...existing.narrative, ...(patch.narrative ?? {}) },
  };
  const saved = saveAppraisal(merged);
  return NextResponse.json(saved);
}
