export default function GuidelinesPage() {
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <h2 className="text-xl font-semibold">Appraisal Guidelines</h2>
      <p className="text-[13px] bg-amber-50 border border-amber-200 text-amber-900 rounded p-3">
        <strong>STRICTLY CONFIDENTIAL.</strong> Visible only to the employee, HOD, and Senior
        Management. All appraisal forms must be submitted to HR by <strong>7 October</strong>.
        Appraisal period: <strong>01 October (last year) – 30 September (current year)</strong>.
      </p>

      <Section title="Purpose">
        <ul className="list-disc list-inside space-y-1">
          <li>Provide formal feedback between supervisors and staff.</li>
          <li>Identify performance gaps and help close them.</li>
          <li>Highlight strengths, weaknesses and agree on improvement plans.</li>
          <li>Plan training needs and career development.</li>
          <li>Support succession planning in the organisation.</li>
        </ul>
      </Section>

      <Section title="Semi-Open Appraisal System">
        <ol className="list-decimal list-inside space-y-1">
          <li>Use the correct form based on staff category — Office or Production (Non-Office).</li>
          <li>
            Employees must be engaged in the discussion and given the opportunity to comment,
            except for the section marked <em>Not For Discussion With Appraisee</em>.
          </li>
          <li>Submission flow: Immediate superior (HOD) → Senior Management → HR.</li>
        </ol>
      </Section>

      <Section title="Rater Principles">
        <ul className="list-disc list-inside space-y-1">
          <li>Stay within the review period. Do not penalise for mistakes outside the timeframe.</li>
          <li>Do not refer to past appraisal reports when completing the current one.</li>
          <li>Avoid letting isolated or recent events overly influence the rating.</li>
          <li>Be objective. Do not let personal feelings influence the appraisal.</li>
          <li>Consider each factor independently.</li>
          <li>Only recommend promotion if the employee is qualified and has consistently strong performance.</li>
          <li>
            If you&rsquo;ve supervised the employee for less than six months, consult the previous
            supervisor and record the consultation in the comments with both signatures.
          </li>
          <li>Rate each factor individually first. Do not decide the overall score in advance.</li>
          <li>Do not be influenced by the employee&rsquo;s job title, tenure or seniority.</li>
        </ul>
      </Section>

      <Section title="Countersign Authority">
        <p className="text-[13.5px] leading-relaxed">
          Senior Management acts as the HOD&rsquo;s supervisor and will review and countersign the
          appraisal. If they disagree with the HOD&rsquo;s ratings, they can override the score in
          this system — the override will be highlighted with justification and the Senior
          Management&rsquo;s rating will take effect. Senior Management may, on a case-by-case
          basis, ask a Head of Department to justify ratings in person.
        </p>
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
      <div className="card-body text-[13.5px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
