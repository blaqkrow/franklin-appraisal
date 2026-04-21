import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import {
  getAppraisalFull,
  updateNarrative,
  updateScores,
  updateSectionIV,
  updateTraining,
} from "@/lib/repo";
import { canViewSectionIV } from "@/lib/workflow";
import { serviceClient } from "@/lib/supabase";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireSession();
  const full = await getAppraisalFull(params.id, s);
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireSession();
  const body = (await req.json()) as {
    scores?: Array<{
      criterion_no: number;
      is_applicable: boolean;
      appraiser_rating: number | null;
      sm_rating?: number | null;
      comments: string;
    }>;
    training?: Array<{ training_type: string; is_selected: boolean | null; remarks: string }>;
    narrative?: {
      appraiser_overall_comments?: string;
      staff_comments?: string;
      hod_comments?: string;
      sm_comments?: string;
      hr_remarks?: string;
    };
    section_iv?: {
      confirmation_date?: string | null;
      extension_date?: string | null;
      recommendation?: "continue" | "higher_responsibility" | "promotion" | null;
      target_role?: string | null;
      timeframe?: string | null;
      justification?: string;
    };
  };

  // Load the row once so we can evaluate edge-based permissions (PRD §7: routing
  // is automated from the org chart, not the static role enum). An HOD who is
  // also their team's appraiser must be able to fill appraiser_overall_comments.
  const { data: row } = await serviceClient()
    .from("appraisals")
    .select("employee_id, appraiser_id, hod_id, sm_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAppraiser = row.appraiser_id === s.employeeId;
  const isAppraisee = row.employee_id === s.employeeId;
  const isHOD = row.hod_id === s.employeeId;
  const isSM = row.sm_id === s.employeeId || s.role === "senior_management";
  const isHR = s.role === "hr_admin";

  try {
    if (body.scores) {
      // Only the appraiser (to set initial ratings) or SM (for overrides) can edit scores.
      if (!(isAppraiser || isSM || isHR)) {
        return NextResponse.json({ error: "Not authorised to modify scores" }, { status: 403 });
      }
      const clean = body.scores.map((r) => ({
        ...r,
        sm_rating: isSM ? (r.sm_rating ?? null) : undefined,
      }));
      await updateScores(params.id, clean as typeof body.scores);
    }
    if (body.training) {
      if (!(isAppraiser || isHOD || isHR)) {
        return NextResponse.json({ error: "Not authorised to modify training" }, { status: 403 });
      }
      await updateTraining(params.id, body.training);
    }
    if (body.narrative) {
      const allowed = new Set<string>();
      if (isAppraiser || isHR) allowed.add("appraiser_overall_comments");
      if (isAppraisee || isHR) allowed.add("staff_comments");
      if (isHOD || isHR) allowed.add("hod_comments");
      if (isSM || isHR) allowed.add("sm_comments");
      if (isHR) allowed.add("hr_remarks");
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body.narrative)) {
        if (allowed.has(k)) patch[k] = v;
      }
      if (Object.keys(patch).length > 0) {
        await updateNarrative(params.id, patch);
      }
    }
    if (body.section_iv) {
      if (!canViewSectionIV(s.role) || !(isHOD || isSM || isHR)) {
        return NextResponse.json({ error: "Section IV forbidden" }, { status: 403 });
      }
      await updateSectionIV(params.id, body.section_iv, s);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const full = await getAppraisalFull(params.id, s);
  return NextResponse.json(full);
}
