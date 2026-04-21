import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getAppraisalFull, transitionAppraisal } from "@/lib/repo";
import { missingExampleComments, missingRequiredRatings } from "@/lib/scoring";
import { serviceClient } from "@/lib/supabase";
import type { AppraisalState } from "@/types";

type Action =
  | "submit_to_appraisee"
  | "appraisee_sign"
  | "submit_to_hod"
  | "hod_submit"
  | "sm_concur"
  | "sm_override_submit"
  | "hr_accept"
  | "reject";

const NEXT: Record<Action, AppraisalState> = {
  submit_to_appraisee: "pending_appraisee",
  appraisee_sign: "pending_hod",
  submit_to_hod: "pending_hod",
  hod_submit: "pending_sm",
  sm_concur: "pending_hr",
  sm_override_submit: "pending_hr",
  hr_accept: "completed",
  reject: "rejected",
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireSession();
  const { action, reason, target_state } = (await req.json()) as {
    action: Action;
    reason?: string;
    target_state?: AppraisalState;
  };
  const full = await getAppraisalFull(params.id, s);
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Permission matrix — PRD §7 says routing is "automated based on org chart", so we
  // check the edge (appraiser_id / hod_id / sm_id / employee_id) rather than the
  // static `role` enum. The enum just determines the default dashboard view; any
  // employee can act in a slot they occupy via the org chart.
  const isAppraiser = full.appraiser_id === s.employeeId;
  const isAppraisee = full.employee_id === s.employeeId;
  const isHOD = full.hod_id === s.employeeId;
  const isSM = full.sm_id === s.employeeId || s.role === "senior_management";
  const isHR = s.role === "hr_admin";

  const allowed = (() => {
    if (action === "submit_to_appraisee") return isAppraiser && full.state === "pending_appraiser";
    if (action === "appraisee_sign") return isAppraisee && full.state === "pending_appraisee";
    if (action === "hod_submit") return isHOD && full.state === "pending_hod";
    if (action === "sm_concur" || action === "sm_override_submit")
      return isSM && full.state === "pending_sm";
    if (action === "hr_accept") return isHR && full.state === "pending_hr";
    if (action === "reject")
      return (
        isHR ||
        (isSM && full.state === "pending_sm") ||
        (isHOD && full.state === "pending_hod") ||
        (isAppraisee && full.state === "pending_appraisee")
      );
    return false;
  })();
  if (!allowed) {
    return NextResponse.json(
      { error: `Action '${action}' not allowed for role '${s.role}' in state '${full.state}'` },
      { status: 403 },
    );
  }

  // Validations
  if (action === "submit_to_appraisee") {
    const unrated = missingRequiredRatings(full.scores);
    if (unrated.length) {
      return NextResponse.json(
        { error: `Please rate all applicable criteria: ${unrated.map((x) => x.criterion_no).join(", ")}` },
        { status: 400 },
      );
    }
    const noComments = missingExampleComments(full.scores);
    if (noComments.length) {
      return NextResponse.json(
        {
          error: `Cite examples in comments for criteria: ${noComments.map((x) => x.criterion_no).join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!full.narrative.appraiser_overall_comments.trim()) {
      return NextResponse.json({ error: "Appraiser overall comments required" }, { status: 400 });
    }
  }
  if (action === "hod_submit") {
    if (!full.narrative.hod_comments.trim()) {
      return NextResponse.json({ error: "HOD comments required" }, { status: 400 });
    }
    if (full.appraisal_type === "promotion" || full.section_iv?.recommendation) {
      // ok — already set
    }
  }
  if (action === "reject" && !reason?.trim()) {
    return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
  }

  // Apply transition
  let next: AppraisalState = NEXT[action];
  if (action === "reject") {
    next = "rejected";
    await serviceClient()
      .from("appraisals")
      .update({ rejected_reason: reason })
      .eq("id", full.id);
  }
  if (action === "reject" && target_state) next = target_state;

  await transitionAppraisal(full.id, next, s, reason);
  const updated = await getAppraisalFull(full.id, s);
  return NextResponse.json(updated);
}
