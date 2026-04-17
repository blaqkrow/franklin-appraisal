import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  appraisalsForRole,
  getEmployee,
  listEmployees,
} from "@/lib/store";
import { STATE_LABEL } from "@/lib/workflow";
import { appraisalYearFor, daysUntilDeadline, periodLabel } from "@/lib/period";
import StatusBadge from "@/components/StatusBadge";
import BulkCreateButton from "@/components/BulkCreateButton";
import type { AppraisalState } from "@/types";

export default function Dashboard() {
  const session = getSession();
  const appraisals = appraisalsForRole(session.role, session.userId);
  const year = appraisalYearFor();
  const dueDays = daysUntilDeadline(year);

  const byState = appraisals.reduce<Record<string, number>>((acc, a) => {
    acc[a.state] = (acc[a.state] ?? 0) + 1;
    return acc;
  }, {});

  const gateFails = appraisals.filter((a) => a.gateFail || a.state === "gate_fail");
  const pending = appraisals.filter(
    (a) => a.state !== "completed" && a.state !== "draft",
  );
  const totalEmployees = listEmployees().filter((e) => e.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="card">
        <div className="card-body flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {session.role === "admin" && "HR Admin Dashboard"}
              {session.role === "hod" && `HOD Dashboard — ${session.name}`}
              {session.role === "countersigner" && "Senior Management Review"}
              {session.role === "hr" && "HR Reception"}
              {session.role === "employee" && "My Appraisal"}
            </h2>
            <p className="text-[13px] text-slate-500 mt-1">
              Cycle {year} &nbsp;·&nbsp; {periodLabel(year)} &nbsp;·&nbsp; Submission deadline 7 October {year}
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

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active Employees" value={totalEmployees} />
        <Stat label="Appraisals Open" value={pending.length} accent="amber" />
        <Stat label="Gate Fail" value={gateFails.length} accent="red" />
        <Stat label="Completed" value={byState.completed ?? 0} accent="emerald" />
      </section>

      {session.role === "admin" && (
        <section className="card">
          <div className="card-header">
            <span className="card-label">A</span>
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="card-body flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/appraisals/new">
              + New Appraisal
            </Link>
            <BulkCreateButton />
            <Link className="btn btn-ghost" href="/employees">
              Manage Employees
            </Link>
            <Link className="btn btn-ghost" href="/criteria">
              Configure Criteria
            </Link>
            <a className="btn btn-ghost" href="/api/export">
              ⬇ Export Cycle to CSV
            </a>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <span className="card-label">B</span>
          <span className="card-title">
            {session.role === "admin"
              ? "All Appraisals"
              : session.role === "employee"
                ? "Your Appraisal"
                : "Your Queue"}
          </span>
          <span className="ml-auto text-[12px] text-slate-500">
            {appraisals.length} record{appraisals.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost border-b border-rule text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Form</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Overall</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500 italic">
                    No appraisals. {session.role === "admin" && "Create one or bulk-seed the cycle."}
                  </td>
                </tr>
              )}
              {appraisals.map((a) => {
                const emp = getEmployee(a.employeeId);
                return (
                  <tr key={a.id} className="border-b border-rule hover:bg-ghost">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{emp?.name}</div>
                      <div className="text-[11px] text-slate-500">{emp?.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp?.department}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {a.formType.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge state={a.state as AppraisalState} />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {a.overallScore != null ? a.overallScore.toFixed(2) : "—"}
                      {a.performanceBand && (
                        <div className="text-[11px] text-slate-500">{a.performanceBand}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">
                      {new Date(a.updatedAt).toLocaleString("en-GB")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/appraisals/${a.id}`} className="text-navy font-semibold hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {session.role === "admin" && Object.keys(byState).length > 0 && (
        <section className="card">
          <div className="card-header">
            <span className="card-label">C</span>
            <span className="card-title">Pipeline Breakdown</span>
          </div>
          <div className="card-body grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(byState).map(([state, count]) => (
              <div key={state} className="border border-rule rounded p-4">
                <div className="text-[11px] tracking-wider uppercase text-slate-500">
                  {STATE_LABEL[state as AppraisalState]}
                </div>
                <div className="text-2xl font-bold mt-1">{count}</div>
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
        <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
      </div>
    </div>
  );
}

