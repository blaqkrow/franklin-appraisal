import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { companyReport, currentCycleYear, listEmployees } from "@/lib/repo";
import { stats } from "@/lib/bellcurve";
import { bandFor } from "@/lib/criteria";
import BellCurve from "@/components/BellCurve";
import { STATE_LABEL } from "@/lib/workflow";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { year?: string; dept?: string };
}) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "hr_admin" && s.role !== "senior_management") redirect("/");

  const cycleYear = Number(searchParams?.year ?? currentCycleYear());
  const dept = searchParams?.dept ?? "";

  const rows = await companyReport(cycleYear);
  const employees = await listEmployees();
  const filtered = dept ? rows.filter((r) => r.employee.department === dept) : rows;
  const departments = Array.from(
    new Set(rows.map((r) => r.employee.department).filter(Boolean) as string[]),
  ).sort();

  const completedPcts = filtered
    .map((r) => r.overall_pct)
    .filter((v): v is number => typeof v === "number");
  const deptAvgs: { dept: string; avg: number; n: number }[] = departments.map((d) => {
    const arr = rows
      .filter((r) => r.employee.department === d)
      .map((r) => r.overall_pct)
      .filter((v): v is number => typeof v === "number");
    const st = stats(arr);
    return { dept: d, avg: st.mean, n: arr.length };
  });

  const appraiserAvgs: { name: string; avg: number; n: number }[] = [];
  const byAppraiser = new Map<string, number[]>();
  rows.forEach((r) => {
    if (!r.appraiser_id || r.overall_pct == null) return;
    const arr = byAppraiser.get(r.appraiser_id) ?? [];
    arr.push(r.overall_pct);
    byAppraiser.set(r.appraiser_id, arr);
  });
  byAppraiser.forEach((arr, appId) => {
    const emp = employees.find((e) => e.id === appId);
    if (!emp) return;
    const st = stats(arr);
    appraiserAvgs.push({ name: emp.name, avg: st.mean, n: arr.length });
  });
  appraiserAvgs.sort((a, b) => b.avg - a.avg);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">Reports &amp; Analytics</h2>
        <form className="flex items-center gap-2 flex-wrap" action="/reports">
          <select name="year" defaultValue={cycleYear} className="border border-rule rounded px-2 py-1.5 text-[13px] bg-white">
            {[cycleYear - 2, cycleYear - 1, cycleYear, cycleYear + 1].map((y) => (
              <option key={y} value={y}>
                Cycle {y}
              </option>
            ))}
          </select>
          <select name="dept" defaultValue={dept} className="border border-rule rounded px-2 py-1.5 text-[13px] bg-white">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost">Apply</button>
          <a className="btn btn-ghost" href="/api/export">
            ⬇ Export CSV
          </a>
        </form>
      </div>

      <section className="card">
        <div className="card-header">
          <span className="card-label">1</span>
          <span className="card-title">
            Company-Wide Summary — {filtered.length} appraisal{filtered.length === 1 ? "" : "s"}
            {dept ? ` · ${dept}` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-left hidden sm:table-cell">Department</th>
                <th className="px-3 py-2 text-left hidden md:table-cell">Designation</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Score %</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-left hidden md:table-cell">State</th>
                <th className="px-3 py-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const b = bandFor(r.overall_pct);
                return (
                  <tr key={r.id} className="border-b border-rule hover:bg-ghost">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{r.employee.name}</div>
                      <div className="text-[11px] text-slate-500">{r.employee.employee_no}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 hidden sm:table-cell">
                      {r.employee.department}
                    </td>
                    <td className="px-3 py-2 text-slate-600 hidden md:table-cell">
                      {r.employee.designation}
                    </td>
                    <td className="px-3 py-2 capitalize">{r.appraisal_type}</td>
                    <td className="px-3 py-2 font-semibold">
                      {r.overall_pct != null ? `${r.overall_pct}%` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {b && (
                        <span
                          className="chip text-white"
                          style={{ background: b.color }}
                        >
                          {b.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell text-slate-600 text-[12px]">
                      {STATE_LABEL[r.state]}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/appraisals/${r.id}`} className="text-navy hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center px-4 py-8 text-slate-500 italic">
                    No appraisals for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-label">2</span>
          <span className="card-title">
            Bell Curve — Score Distribution {dept ? ` (${dept})` : " (company-wide)"}
          </span>
        </div>
        <div className="card-body">
          <BellCurve values={completedPcts} />
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header">
            <span className="card-label">3a</span>
            <span className="card-title">Department Averages</span>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-ghost text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-right">n</th>
                  <th className="px-3 py-2 text-right">Average</th>
                </tr>
              </thead>
              <tbody>
                {deptAvgs
                  .sort((a, b) => b.avg - a.avg)
                  .map((d) => (
                    <tr key={d.dept} className="border-b border-rule">
                      <td className="px-3 py-2 font-semibold">{d.dept}</td>
                      <td className="px-3 py-2 text-right">{d.n}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {d.n > 0 ? `${d.avg.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-label">3b</span>
            <span className="card-title">Appraiser Calibration</span>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-ghost text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Appraiser</th>
                  <th className="px-3 py-2 text-right">n</th>
                  <th className="px-3 py-2 text-right">Avg of direct reports</th>
                </tr>
              </thead>
              <tbody>
                {appraiserAvgs.map((a) => (
                  <tr key={a.name} className="border-b border-rule">
                    <td className="px-3 py-2 font-semibold">{a.name}</td>
                    <td className="px-3 py-2 text-right">{a.n}</td>
                    <td className="px-3 py-2 text-right font-semibold">{a.avg.toFixed(1)}%</td>
                  </tr>
                ))}
                {appraiserAvgs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center px-3 py-5 text-slate-500 italic">
                      No appraiser-linked scores yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-label">4</span>
          <span className="card-title">Multi-Year Historical Tracking</span>
        </div>
        <div className="card-body">
          <p className="text-[13px] text-slate-600 mb-3">
            Pick an employee to view their score trajectory across all cycles on record.
          </p>
          <div className="flex flex-wrap gap-2">
            {employees
              .filter((e) => e.role === "appraisee")
              .map((e) => (
                <Link
                  key={e.id}
                  href={`/reports/employee/${e.id}`}
                  className="chip bg-slate-100 text-slate-700 hover:bg-navy hover:text-white"
                >
                  {e.name} · {e.employee_no}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
