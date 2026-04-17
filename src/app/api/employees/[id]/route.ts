import { NextRequest, NextResponse } from "next/server";
import { deactivateEmployee, getEmployee, upsertEmployee } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const e = getEmployee(params.id);
  if (!e) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(e);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = getEmployee(params.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = await req.json();
  const merged = { ...existing, ...patch, id: existing.id };
  upsertEmployee(merged);
  return NextResponse.json(merged);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  deactivateEmployee(params.id);
  return NextResponse.json({ ok: true });
}
