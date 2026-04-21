import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import OrgChartImport from "./OrgChartImport";

export default async function ImportPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "hr_admin") redirect("/");
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h2 className="text-lg sm:text-xl font-semibold">Employee / Org Chart Import</h2>
      <p className="text-[13px] text-slate-600">
        Upload a CSV (UTF-8) with header row. Columns:
      </p>
      <code className="text-[11px] bg-slate-900 text-emerald-200 p-3 rounded overflow-x-auto block">
        employee_no,name,designation,department,date_joined,email,phone,form_type,role,appraiser_no,hod_no,sm_no
      </code>
      <ul className="text-[12.5px] text-slate-600 list-disc list-inside">
        <li>
          <strong>form_type:</strong> <code>workers</code> or <code>office</code>
        </li>
        <li>
          <strong>role:</strong> <code>hr_admin</code> | <code>senior_management</code> |{" "}
          <code>hod</code> | <code>appraiser</code> | <code>appraisee</code>
        </li>
        <li>
          <strong>appraiser_no / hod_no / sm_no:</strong> the Employee Number of that person (used to wire routing after upsert).
        </li>
        <li>Existing rows (same employee_no) are updated; new rows are created.</li>
        <li>A temporary password is set by HR via the Employees page after import.</li>
      </ul>
      <OrgChartImport />
    </div>
  );
}
