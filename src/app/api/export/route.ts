import { NextResponse } from "next/server";
import { getEmployee, listAppraisals } from "@/lib/store";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const rows: string[] = [];
  rows.push(
    [
      "Appraisal Year",
      "Employee ID",
      "Employee Name",
      "Department",
      "Form Type",
      "State",
      "Gate Fail",
      "Overall Score",
      "Performance Band",
      "Factor Scores",
    ].join(","),
  );
  listAppraisals().forEach((a) => {
    const emp = getEmployee(a.employeeId);
    const factors = a.scores
      .map((s) => `${s.factorNo}:${s.effectiveRating ?? "-"}`)
      .join(" | ");
    rows.push(
      [
        a.appraisalYear,
        emp?.employeeId,
        emp?.name,
        emp?.department,
        a.formType,
        a.state,
        a.gateFail ? "YES" : "",
        a.overallScore ?? "",
        a.performanceBand ?? "",
        factors,
      ]
        .map(csvEscape)
        .join(","),
    );
  });
  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=appraisals_${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
