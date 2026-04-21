import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { serviceClient } from "@/lib/supabase";
import type { AppRole, FormType } from "@/types";

// Accepts a CSV or JSON array. CSV columns (header row required):
// employee_no,name,designation,department,date_joined,email,phone,form_type,role,appraiser_no,hod_no,sm_no
export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s.role !== "hr_admin") return NextResponse.json({ error: "HR admin only" }, { status: 403 });
  const body = await req.json();
  const rows: Record<string, string>[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "rows required" }, { status: 400 });

  const sb = serviceClient();
  const incoming = rows.map((r) => ({
    employee_no: r.employee_no?.trim(),
    name: r.name?.trim(),
    designation: r.designation?.trim() || null,
    department: r.department?.trim() || null,
    date_joined: r.date_joined?.trim() || null,
    email: r.email?.trim() || null,
    phone: r.phone?.trim() || null,
    form_type: (r.form_type?.trim() as FormType) || "office",
    role: (r.role?.trim() as AppRole) || "appraisee",
    is_active: true,
  })).filter((r) => r.employee_no && r.name);

  const { error: upErr } = await sb.from("employees").upsert(incoming, { onConflict: "employee_no" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Second pass: wire org chart using employee_no references
  const { data: all } = await sb.from("employees").select("id, employee_no");
  const byNo = new Map((all ?? []).map((x) => [x.employee_no, x.id]));
  const updates: Array<{ id: string; appraiser_id: string | null; hod_id: string | null; sm_id: string | null }> = [];
  for (const r of rows) {
    const id = byNo.get(r.employee_no?.trim());
    if (!id) continue;
    updates.push({
      id,
      appraiser_id: byNo.get(r.appraiser_no?.trim()) ?? null,
      hod_id: byNo.get(r.hod_no?.trim()) ?? null,
      sm_id: byNo.get(r.sm_no?.trim()) ?? null,
    });
  }
  for (const u of updates) {
    await sb.from("employees").update(u).eq("id", u.id);
  }

  // Record upload
  await sb.from("org_chart_uploads").insert({
    filename: body.filename ?? "upload",
    uploaded_by: s.employeeId,
    row_count: incoming.length,
  });

  return NextResponse.json({ ok: true, upserted: incoming.length, routed: updates.length });
}
