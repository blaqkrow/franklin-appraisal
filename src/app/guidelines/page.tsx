export default function GuidelinesPage() {
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <h2 className="text-lg sm:text-xl font-semibold">Appraisal Guidelines</h2>
      <p className="text-[13px] bg-amber-50 border border-amber-200 text-amber-900 rounded p-3">
        <strong>STRICTLY CONFIDENTIAL.</strong> Visible only to the employee, HOD, Senior Management and HR. All appraisal forms must be submitted to HR by <strong>7 October</strong>. Appraisal period: <strong>01 October (previous year) – 30 September (current year)</strong>.
      </p>

      <Section title="Purpose">
        <ul className="list-disc list-inside space-y-1">
          <li>Provide formal feedback between supervisors and staff.</li>
          <li>Identify performance gaps and help close them.</li>
          <li>Highlight strengths and agree on improvement plans.</li>
          <li>Plan training needs and career development.</li>
          <li>Support succession planning.</li>
        </ul>
      </Section>

      <Section title="Semi-Open Appraisal System">
        <ol className="list-decimal list-inside space-y-1">
          <li>Use the correct form based on staff category — Non-Office / Workers or Office.</li>
          <li>
            Employees must be engaged in the discussion and given the opportunity to comment,{" "}
            <em>except</em> for Section IV (&ldquo;Not For Discussion With Appraisee&rdquo;), which is hidden from their view at both the frontend and backend.
          </li>
          <li>
            Submission flow: Appraiser → Appraisee → HOD → Senior Management → HR.
          </li>
        </ol>
      </Section>

      <Section title="Rater Principles">
        <ul className="list-disc list-inside space-y-1">
          <li>Stay within the review period.</li>
          <li>Do not refer to past appraisal reports when completing the current one.</li>
          <li>Don&rsquo;t give too much weight to one-off incidents or recent events.</li>
          <li>Be objective — do not let personal feelings influence the appraisal.</li>
          <li>Consider each factor independently.</li>
          <li>Only recommend promotion if the employee is qualified and has consistently strong performance.</li>
          <li>
            If you&rsquo;ve supervised for less than six months, consult the previous supervisor and record the consultation in the comments with both signatures.
          </li>
          <li>Rate each factor individually first; do not decide the overall score in advance.</li>
          <li>Do not let the importance of the job or years of service bias the rating.</li>
        </ul>
      </Section>

      <Section title="Senior Management Authority">
        <p className="text-[14px] leading-relaxed">
          Senior Management reviews and countersigns. If they disagree with the HOD&rsquo;s ratings, they can override any score; the system records the original HOD rating and marks the override with a justification. The Senior Management rating becomes the effective rating in all calculations and reports.
        </p>
      </Section>

      <Section title="Appraisal Types">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Annual Appraisal</strong> — standard yearly review for the full cycle.
          </li>
          <li>
            <strong>Confirmation Appraisal</strong> — for probationary staff; records confirmation or extension date in Section IV.
          </li>
          <li>
            <strong>Promotion Appraisal</strong> — standalone review triggering a promotion recommendation in Section IV.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
      </div>
      <div className="card-body text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
