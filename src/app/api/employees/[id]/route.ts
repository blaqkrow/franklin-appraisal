import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { serviceClient } from "@/lib/supabase";
import { getEmployee } from "@/lib/repo";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await requireSession();
  const e = await getEmployee(params.id);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(e);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (s.role !== "hr_admin") return NextResponse.json({ error: "HR admin only" }, { status: 403 });
  const body = await req.json();
  delete body.id;
  delete body.password_hash;
  const { data, error } = await serviceClient()
    .from("employees")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (s.role !== "hr_admin") return NextResponse.json({ error: "HR admin only" }, { status: 403 });
  await serviceClient().from("employees").update({ is_active: false }).eq("id", params.id);
  return NextResponse.json({ ok: true });
}
