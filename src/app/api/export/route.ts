import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { currentCycleYear, listAllAppraisalsWithEmployee } from "@/lib/repo";
import { STATE_LABEL } from "@/lib/workflow";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const s = await requireSession();
  if (s.role !== "hr_admin" && s.role !== "senior_management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await listAllAppraisalsWithEmployee();
  const cy = currentCycleYear();
  const header = [
    "Cycle Year",
    "Employee No",
    "Name",
    "Department",
    "Designation",
    "Form Type",
    "Appraisal Type",
    "State",
    "Total",
    "Max",
    "Overall %",
    "Performance",
  ].join(",");
  const body = rows.map((a) =>
    [
      a.cycle_year,
      a.employee.employee_no,
      a.employee.name,
      a.employee.department,
      a.employee.designation,
      a.form_type,
      a.appraisal_type,
      STATE_LABEL[a.state],
      a.total_score ?? "",
      a.max_score ?? "",
      a.overall_pct ?? "",
      a.performance_grade ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return new NextResponse([header, ...body].join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=appraisals_${cy}.csv`,
    },
  });
}
