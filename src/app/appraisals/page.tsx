import Link from "next/link";
import { getSession } from "@/lib/session";
import { listAppraisalsFor } from "@/lib/repo";
import StatusBadge from "@/components/StatusBadge";
import { redirect } from "next/navigation";
import { APPRAISAL_TYPE_LABELS } from "@/lib/criteria";

export default async function AppraisalsList() {
  const s = await getSession();
  if (!s) redirect("/login");
  const rows = await listAppraisalsFor(s);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">Appraisals</h2>
        {s.role === "hr_admin" && (
          <Link href="/appraisals/new" className="btn btn-primary">
            + New
          </Link>
        )}
      </div>
      <section className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost border-b border-rule text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Department</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Form</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3">Year</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-rule hover:bg-ghost">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{a.employee.name}</div>
                    <div className="text-[11px] text-slate-500">{a.employee.employee_no}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                    {a.employee.department}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600 hidden md:table-cell">
                    {a.form_type === "workers" ? "Non-Office" : "Office"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {APPRAISAL_TYPE_LABELS[a.appraisal_type]}
                  </td>
                  <td className="px-4 py-3">{a.cycle_year}</td>
                  <td className="px-4 py-3">
                    <StatusBadge state={a.state} />
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {a.overall_pct != null ? `${a.overall_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/appraisals/${a.id}`}
                      className="text-navy font-semibold hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center px-4 py-8 text-slate-500 italic">
                    No appraisals visible for your role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
