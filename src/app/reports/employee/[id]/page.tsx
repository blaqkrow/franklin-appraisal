import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEmployee, historicalForEmployee } from "@/lib/repo";
import HistoricalChart from "@/components/HistoricalChart";
import { bandFor } from "@/lib/criteria";
import Link from "next/link";

export default async function EmployeeHistoryPage({ params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "hr_admin" && s.role !== "senior_management") redirect("/");
  const emp = await getEmployee(params.id);
  if (!emp) notFound();
  const history = await historicalForEmployee(params.id);
  const data = history.map((a) => ({ year: a.cycle_year, pct: a.overall_pct }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <Link href="/reports" className="text-[12px] text-navy hover:underline">
            ← Back to reports
          </Link>
          <h2 className="text-lg sm:text-xl font-semibold mt-1">
            {emp.name} — Historical Performance
          </h2>
          <p className="text-[12.5px] text-slate-500">
            {emp.employee_no} · {emp.department} · {emp.designation}
          </p>
        </div>
      </div>
      <section className="card">
        <div className="card-body">
          <HistoricalChart data={data} />
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <span className="card-label">Log</span>
          <span className="card-title">All Cycles On Record</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Overall %</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const b = bandFor(h.overall_pct);
                return (
                  <tr key={h.id} className="border-b border-rule">
                    <td className="px-3 py-2 font-semibold">{h.cycle_year}</td>
                    <td className="px-3 py-2 capitalize">{h.appraisal_type}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {h.overall_pct != null ? `${h.overall_pct}%` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {b && (
                        <span className="chip text-white" style={{ background: b.color }}>
                          {b.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize">{h.state.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-right">
                      <Link className="text-navy hover:underline" href={`/appraisals/${h.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center px-3 py-5 text-slate-500 italic">
                    No appraisals on record for this employee.
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
