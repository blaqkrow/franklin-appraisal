import Link from "next/link";
import { getSession } from "@/lib/session";
import { appraisalsForRole, getEmployee } from "@/lib/store";
import StatusBadge from "@/components/StatusBadge";

export default function AppraisalsList() {
  const session = getSession();
  const appraisals = appraisalsForRole(session.role, session.userId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Appraisals</h2>
        {session.role === "admin" && (
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
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Form Type</th>
                <th className="text-left px-4 py-3">Year</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Overall</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.map((a) => {
                const emp = getEmployee(a.employeeId);
                return (
                  <tr key={a.id} className="border-b border-rule hover:bg-ghost">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{emp?.name}</div>
                      <div className="text-[11px] text-slate-500">{emp?.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp?.department}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {a.formType.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">{a.appraisalYear}</td>
                    <td className="px-4 py-3">
                      <StatusBadge state={a.state} />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {a.overallScore != null ? a.overallScore.toFixed(2) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/appraisals/${a.id}`} className="text-navy font-semibold hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {appraisals.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center px-5 py-8 text-slate-500 italic">
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
