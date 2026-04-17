import { PRODUCTION_WORKER_FACTORS, OFFICE_STAFF_FACTORS } from "@/lib/criteria";

export default function CriteriaPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Scoring Criteria</h2>
      <p className="text-[13px] text-slate-600 max-w-3xl">
        Weights total 100% per form type. Rating ×Weight = factor score; the sum is the overall
        weighted score. The <strong>Safety &amp; Compliance</strong> factor on the Production
        Worker form is a <strong>Gate Factor</strong>: a rating of 1 caps the overall score at 2.0
        and triggers a <em>Gate Fail</em> flag that requires Admin review before proceeding.
      </p>

      <CriteriaTable title="Production Worker (Franklin Rigging)" factors={PRODUCTION_WORKER_FACTORS} />
      <CriteriaTable title="Office Staff" factors={OFFICE_STAFF_FACTORS} />

      <section className="card">
        <div className="card-header">
          <span className="card-label">R</span>
          <span className="card-title">Rating Scale</span>
        </div>
        <div className="card-body">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left w-16">Rating</th>
                <th className="px-4 py-2 text-left w-48">Label</th>
                <th className="px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                [5, "Outstanding", "Consistently and significantly exceeds expectations"],
                [4, "Exceeds Expectation", "Performance is above the required standard in most areas"],
                [3, "Meets Expectation", "Performance is fully satisfactory and meets all requirements"],
                [2, "Below Expectation", "Performance falls short of the required standard in key areas"],
                [1, "Very Much Below", "Performance is significantly below standard; immediate improvement needed"],
              ].map(([n, l, d]) => (
                <tr key={n} className="border-b border-rule">
                  <td className="px-4 py-2 font-bold">{n}</td>
                  <td className="px-4 py-2 font-semibold text-graphite">{l}</td>
                  <td className="px-4 py-2 text-slate-600">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CriteriaTable({
  title,
  factors,
}: {
  title: string;
  factors: typeof PRODUCTION_WORKER_FACTORS;
}) {
  const total = factors.reduce((s, f) => s + f.weight, 0);
  return (
    <section className="card">
      <div className="card-header">
        <span className="card-label">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-ghost text-[11px] tracking-wider uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left w-10">#</th>
              <th className="px-4 py-2 text-left">Factor</th>
              <th className="px-4 py-2 text-right w-20">Weight</th>
              <th className="px-4 py-2 text-left">Measurable Indicators</th>
            </tr>
          </thead>
          <tbody>
            {factors.map((f) => (
              <tr key={f.no} className={`border-b border-rule ${f.gate ? "bg-rose-50/40" : ""}`}>
                <td className="px-4 py-2 text-slate-400">{f.no}</td>
                <td className="px-4 py-2 font-semibold">
                  {f.name}
                  {f.gate && (
                    <span className="chip bg-red-50 text-accent ml-2">Gate</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {Math.round(f.weight * 100)}%
                </td>
                <td className="px-4 py-2 text-slate-600">{f.indicators}</td>
              </tr>
            ))}
            <tr className="bg-ghost">
              <td className="px-4 py-3" />
              <td className="px-4 py-3 font-semibold text-right">Total</td>
              <td className="px-4 py-3 text-right font-bold">{Math.round(total * 100)}%</td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
