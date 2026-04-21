import { WORKERS_CRITERIA, OFFICE_CRITERIA, RATING_LABELS, PERFORMANCE_BANDS } from "@/lib/criteria";

export default function CriteriaPage() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg sm:text-xl font-semibold">Scoring Criteria</h2>
      <p className="text-[13px] text-slate-600 max-w-3xl">
        Each applicable criterion is rated on a 1–5 scale. Overall % = (sum of effective ratings ÷ 5 × number of applicable criteria) × 100. Criteria marked <em>if applicable</em> can be toggled N/A per employee — when N/A, they're excluded from the maximum.
      </p>

      <CriteriaTable title="Non-Office / Workers PA Form — 11 criteria" rows={WORKERS_CRITERIA} />
      <CriteriaTable title="Office Staff PA Form — 15 criteria" rows={OFFICE_CRITERIA} />

      <section className="card">
        <div className="card-header">
          <span className="card-label">Scale</span>
          <span className="card-title">Rating Scale</span>
        </div>
        <div className="card-body">
          <table className="w-full text-[13px]">
            <thead className="bg-ghost text-[11px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left w-16">Rating</th>
                <th className="px-3 py-2 text-left w-48">Label</th>
                <th className="px-3 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {[...RATING_LABELS].reverse().map((r) => (
                <tr key={r.value} className="border-b border-rule">
                  <td className="px-3 py-2 font-bold">{r.value}</td>
                  <td className="px-3 py-2 font-semibold text-graphite">{r.label}</td>
                  <td className="px-3 py-2 text-slate-600">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-label">Bands</span>
          <span className="card-title">Performance Grade Bands</span>
        </div>
        <div className="card-body grid grid-cols-1 sm:grid-cols-5 gap-[1px] bg-rule rounded overflow-hidden">
          {PERFORMANCE_BANDS.map((b) => (
            <div key={b.label} className="bg-white p-3">
              <div className="font-semibold">{b.min}% – {b.max}%</div>
              <div
                className="text-[11px] uppercase tracking-wider mt-1 inline-block px-2 py-0.5 rounded text-white"
                style={{ background: b.color }}
              >
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CriteriaTable({ title, rows }: { title: string; rows: typeof WORKERS_CRITERIA }) {
  return (
    <section className="card">
      <div className="card-header">
        <span className="card-label">Form</span>
        <span className="card-title">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-ghost text-[11px] tracking-wider uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">Criterion</th>
              <th className="px-3 py-2 text-left hidden sm:table-cell">Description</th>
              <th className="px-3 py-2 text-right w-24">Optional?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.no}
                className={`border-b border-rule ${c.optional ? "bg-ghost" : ""}`}
              >
                <td className="px-3 py-2 text-slate-400">{c.no}</td>
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2 text-slate-600 hidden sm:table-cell">
                  {c.description}
                </td>
                <td className="px-3 py-2 text-right">
                  {c.optional ? <span className="chip bg-slate-200 text-slate-700">N/A</span> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
