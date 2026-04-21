import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { currentCycleYear, listAllAppraisalsWithEmployee, listAppraisalsFor, listEmployees } from "@/lib/repo";
import { STATE_LABEL } from "@/lib/workflow";
import { periodLabel, daysUntilDeadline } from "@/lib/period";
import StatusBadge from "@/components/StatusBadge";
import BulkCreateButton from "@/components/BulkCreateButton";
import { APPRAISAL_TYPE_LABELS } from "@/lib/criteria";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cycleYear = currentCycleYear();
  const dueDays = daysUntilDeadline(cycleYear);
  const mine = await listAppraisalsFor(session);
  const all =
    session.role === "hr_admin" || session.role === "senior_management"
      ? await listAllAppraisalsWithEmployee()
      : mine;
  const activeEmployees =
    session.role === "hr_admin" ? (await listEmployees()).filter((e) => e.is_active) : [];

  const byState = all.reduce<Record<string, number>>((acc, a) => {
    acc[a.state] = (acc[a.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <div className="card-body flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              {session.role === "hr_admin" && "HR Admin Dashboard"}
              {session.role === "senior_management" && "Senior Management Review"}
              {session.role === "hod" && "HOD Queue"}
              {session.role === "appraiser" && "Your Direct Reports"}
              {session.role === "appraisee" && "My Appraisal"}
            </h2>
            <p className="text-[12px] sm:text-[13px] text-slate-500 mt-1">
              Cycle {cycleYear} · {periodLabel(cycleYear)} · Deadline 7 Oct {cycleYear}
            </p>
          </div>
          <div
            className={`chip ${
              dueDays < 0
                ? "bg-red-100 text-red-800"
                : dueDays <= 7
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {dueDays < 0
              ? `Deadline passed ${Math.abs(dueDays)}d ago`
              : `${dueDays} day${dueDays === 1 ? "" : "s"} until deadline`}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Your Queue" value={mine.length} />
        <Stat label="All Appraisals" value={all.length} />
        <Stat label="Completed" value={byState.completed ?? 0} accent="emerald" />
        <Stat label="In Progress" value={all.length - (byState.completed ?? 0)} accent="amber" />
      </section>

      {session.role === "hr_admin" && (
        <section className="card">
          <div className="card-header">
            <span className="card-label">Actions</span>
            <span className="card-title">Admin Quick Actions</span>
          </div>
          <div className="card-body flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/appraisals/new">
              + New Appraisal
            </Link>
            <BulkCreateButton />
            <Link className="btn btn-ghost" href="/employees">
              Manage Employees ({activeEmployees.length})
            </Link>
            <Link className="btn btn-ghost" href="/employees/import">
              Upload Org Chart
            </Link>
            <Link className="btn btn-ghost" href="/reports">
              Reports &amp; Analytics
            </Link>
            <a className="btn btn-ghost" href="/api/export">
              ⬇ Export Cycle CSV
            </a>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <span className="card-label">{session.role === "hr_admin" ? "All" : "Your"}</span>
          <span className="card-title">Appraisals — Cycle {cycleYear}</span>
          <span className="ml-auto text-[12px] text-slate-500">
            {mine.length} record{mine.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost border-b border-rule text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Department</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Form</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {mine.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                    No appraisals yet.
                  </td>
                </tr>
              )}
              {mine.map((a) => (
                <tr key={a.id} className="border-b border-rule hover:bg-ghost">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{a.employee.name}</div>
                    <div className="text-[11px] text-slate-500">{a.employee.employee_no}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                    {a.employee.department}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize hidden md:table-cell">
                    {a.form_type === "workers" ? "Non-Office" : "Office"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {APPRAISAL_TYPE_LABELS[a.appraisal_type]}
                  </td>
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
            </tbody>
          </table>
        </div>
      </section>

      {session.role === "hr_admin" && Object.keys(byState).length > 0 && (
        <section className="card">
          <div className="card-header">
            <span className="card-label">Pipeline</span>
            <span className="card-title">Workflow Breakdown</span>
          </div>
          <div className="card-body grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(byState).map(([state, count]) => (
              <div key={state} className="border border-rule rounded p-3">
                <div className="text-[11px] tracking-wider uppercase text-slate-500">
                  {STATE_LABEL[state as keyof typeof STATE_LABEL]}
                </div>
                <div className="text-xl font-bold mt-1">{count}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "red" | "emerald";
}) {
  const color =
    accent === "red"
      ? "text-red-700"
      : accent === "amber"
        ? "text-amber-700"
        : accent === "emerald"
          ? "text-emerald-700"
          : "text-navy";
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-[11px] tracking-wider uppercase text-slate-500">{label}</div>
        <div className={`text-2xl sm:text-3xl font-bold mt-1 ${color}`}>{value}</div>
      </div>
    </div>
  );
}
