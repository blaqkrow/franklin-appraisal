import { NextRequest, NextResponse } from "next/server";
import { getAppraisal, saveAppraisal, transition } from "@/lib/store";
import { getSession } from "@/lib/session";
import { isFullyRated } from "@/lib/scoring";
import { notify } from "@/lib/notify";
import type { AppraisalState } from "@/types";

type Body = {
  action:
    | "submit_to_hod"
    | "hod_submit"
    | "countersign_approve"
    | "countersign_reject"
    | "hr_accept"
    | "hr_return"
    | "employee_ack";
  reason?: string;
  employeeComments?: string;
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = getAppraisal(params.id);
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
  const s = getSession();
  const body = (await req.json()) as Body;

  let next: AppraisalState = a.state;
  let audit = "";

  if (body.action === "submit_to_hod" && s.role === "admin") {
    next = "pending_hod";
    audit = "Admin submitted appraisal to HOD";
    await notify.submittedToHOD({ appraisalId: a.id, to: a.hodId });
  } else if (body.action === "hod_submit" && s.role === "hod") {
    if (!isFullyRated(a.scores))
      return NextResponse.json({ error: "All factors must be rated" }, { status: 400 });
    const missingRemarks = a.scores.filter(
      (x) => (x.hodRating === 1 || x.hodRating === 5) && !x.hodRemarks.trim(),
    );
    if (missingRemarks.length)
      return NextResponse.json(
        {
          error: `Remarks required for ratings of 1 or 5: ${missingRemarks.map((m) => m.factorName).join(", ")}`,
        },
        { status: 400 },
      );
    if (!a.narrative.hodComments.trim())
      return NextResponse.json({ error: "Overall HOD comments required" }, { status: 400 });
    // gate check (production worker only)
    const safety = a.scores.find((x) => x.factorNo === "01");
    const gateFail = a.formType === "production_worker" && safety?.hodRating === 1;
    next = gateFail ? "gate_fail" : "pending_countersign";
    audit = gateFail ? "HOD submitted — Gate Fail triggered" : "HOD submitted for countersigning";
    if (!gateFail) await notify.submittedToCountersign({ appraisalId: a.id, to: a.countersignerId });
  } else if (
    body.action === "countersign_approve" &&
    s.role === "countersigner" &&
    (a.state === "pending_countersign" || a.state === "gate_fail")
  ) {
    next = "pending_hr";
    audit = "Senior Management countersigned and sent to HR";
  } else if (body.action === "countersign_reject" && s.role === "countersigner") {
    if (!body.reason?.trim())
      return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
    a.narrative.rejectReason = body.reason;
    saveAppraisal(a);
    next = "rejected_to_hod";
    audit = `Senior Management rejected to HOD: ${body.reason}`;
    await notify.rejected({ appraisalId: a.id, reason: body.reason });
  } else if (body.action === "hr_accept" && s.role === "hr") {
    next = "pending_employee_ack";
    audit = "HR accepted; employee notified";
    a.pdfPath = `/HR/Appraisals/${a.appraisalYear}/${a.appraisalYear}_${a.formType === "production_worker" ? "OPS" : "OFC"}_${a.employeeId}_Appraisal.pdf`;
    saveAppraisal(a);
    await notify.hrAccepted({ appraisalId: a.id, pdfPath: a.pdfPath });
  } else if (body.action === "hr_return" && s.role === "hr") {
    if (!body.reason?.trim())
      return NextResponse.json({ error: "Reason required" }, { status: 400 });
    a.narrative.rejectReason = body.reason;
    saveAppraisal(a);
    next = "rejected_to_admin";
    audit = `HR returned to admin: ${body.reason}`;
  } else if (body.action === "employee_ack" && s.role === "employee") {
    if (body.employeeComments != null) {
      a.narrative.employeeComments = body.employeeComments;
      saveAppraisal(a);
    }
    next = "completed";
    audit = "Employee acknowledged receipt";
    await notify.acknowledged({ appraisalId: a.id });
  } else {
    return NextResponse.json(
      { error: `Action '${body.action}' not allowed for role '${s.role}' in state '${a.state}'` },
      { status: 400 },
    );
  }

  const updated = transition(params.id, next, {
    actor: s.role,
    actorName: s.name,
    action: audit,
    detail: body.reason,
  });
  return NextResponse.json(updated);
}
