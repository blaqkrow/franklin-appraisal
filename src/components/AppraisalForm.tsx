"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Appraisal, Employee, FactorScore, Session } from "@/types";
import ScoringMatrix from "./ScoringMatrix";
import StatusBadge from "./StatusBadge";
import WorkflowBanner from "./WorkflowBanner";
import GuidelinesPanel from "./GuidelinesPanel";
import { PERFORMANCE_BANDS } from "@/lib/criteria";
import { bandFor, gateTriggered, isFullyRated, overallScore } from "@/lib/scoring";
import { canActAs } from "@/lib/workflow";

interface Props {
  appraisal: Appraisal;
  employee: Employee;
  session: Session;
  hod?: Employee;
  countersigner?: Employee;
}

export default function AppraisalForm({
  appraisal: initial,
  employee,
  session,
  hod,
  countersigner,
}: Props) {
  const router = useRouter();
  const [a, setA] = useState<Appraisal>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [employeeComments, setEmployeeComments] = useState(
    initial.narrative.employeeComments,
  );

  const editableHOD = session.role === "hod" && canActAs(session.role, a.state);
  const editableSM = session.role === "countersigner" && canActAs(session.role, a.state);
  const editableAdmin = session.role === "admin" && canActAs(session.role, a.state);

  const derived = useMemo(() => {
    const computed: FactorScore[] = a.scores.map((s) => {
      const eff = s.smRating ?? s.hodRating;
      return {
        ...s,
        effectiveRating: eff,
        weightedScore: eff == null ? null : Number((eff * s.weight).toFixed(4)),
      };
    });
    const tmp = { ...a, scores: computed };
    const o = overallScore(tmp);
    return {
      scores: computed,
      overall: o,
      band: bandFor(o),
      gate: gateTriggered(tmp),
      ready: isFullyRated(computed),
    };
  }, [a]);

  function updateScore(idx: number, patch: Partial<FactorScore>) {
    setA((prev) => {
      const scores = prev.scores.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return { ...prev, scores };
    });
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/appraisals/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      const next = await res.json();
      if (!res.ok) throw new Error(next.error || "Save failed");
      setA(next);
      setMsg({ kind: "ok", text: "Draft saved." });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function transition(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMsg(null);
    try {
      // Save first so server has latest scores
      await fetch(`/api/appraisals/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      const res = await fetch(`/api/appraisals/${a.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const next = await res.json();
      if (!res.ok) throw new Error(next.error || "Action failed");
      setA(next);
      setMsg({ kind: "ok", text: `${action.replace(/_/g, " ")} succeeded.` });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const readOnlyMeta = session.role !== "admin" || !editableAdmin;

  return (
    <div className="flex flex-col gap-6">
      <WorkflowBanner state={a.state} />

      {msg && (
        <div
          className={`rounded-md border px-4 py-2 text-[13px] ${
            msg.kind === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* WORKER INFO */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">A</span>
          <span className="card-title">Worker Information</span>
          <div className="ml-auto flex items-center gap-3">
            <StatusBadge state={a.state} />
            {a.performanceBand && (
              <span className="chip bg-slate-100 text-slate-700">{a.performanceBand}</span>
            )}
          </div>
        </header>
        <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-5">
          <Field label="Employee Name" value={employee.name} />
          <Field label="Employee ID" value={employee.employeeId} />
          <Field label="Department" value={employee.department} />
          <Field label="Designation" value={employee.designation} />
          <Field label="Appraisal Period" value={a.period} />
          <Field
            label="Date of Review"
            editable={editableAdmin}
            value={a.reviewDate}
            type="date"
            onChange={(v) => setA({ ...a, reviewDate: v })}
          />
          <Field label="Assessed by (HOD)" value={hod?.name ?? "—"} />
          <Field label="Countersigned by" value={countersigner?.name ?? "—"} />
        </div>
      </section>

      {/* GUIDELINES */}
      {(session.role === "hod" || session.role === "countersigner") && <GuidelinesPanel />}

      {/* MATRIX */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">B</span>
          <span className="card-title">Appraisal Matrix</span>
          <span className="ml-auto text-[12px] text-slate-500">
            {a.formType === "production_worker" ? "Production Worker" : "Office Staff"}
          </span>
        </header>
        <p className="px-7 pb-3 text-[12.5px] italic text-slate-500">
          Select the applicable rating for each factor. Weighted score updates in real time.
          Remarks are required for ratings of 1 or 5.
        </p>
        <div className="px-2">
          <ScoringMatrix
            formType={a.formType}
            scores={derived.scores}
            role={session.role}
            overall={derived.overall}
            gateFail={derived.gate}
            onRatingChange={
              editableHOD ? (idx, v) => updateScore(idx, { hodRating: v }) : undefined
            }
            onRemarksChange={
              editableHOD ? (idx, v) => updateScore(idx, { hodRemarks: v }) : undefined
            }
            onSMOverride={
              editableSM
                ? (idx, rating, reason) =>
                    updateScore(idx, { smRating: rating, smOverrideReason: reason })
                : undefined
            }
          />
        </div>
        {a.formType === "production_worker" && (
          <div className="px-7 pb-5">
            <div className="flex gap-3 items-start bg-rose-50 border border-rose-200 border-l-4 border-l-accent rounded px-4 py-3 text-[13px] leading-relaxed">
              <span>⚠</span>
              <span>
                <strong className="text-accent">Gate Rule — Safety &amp; Compliance:</strong> A
                rating of 1 on this factor caps the overall score at 2.0 and triggers a Gate Fail
                flag. Admin is notified. Appraisal cannot proceed to countersigning without Admin
                review.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* PERFORMANCE BANDS */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">C</span>
          <span className="card-title">Performance Band Reference</span>
        </header>
        <div className="card-body grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-rule rounded overflow-hidden">
          {PERFORMANCE_BANDS.map((b) => (
            <div key={b.label} className="bg-white p-4">
              <div className="font-semibold">{b.min.toFixed(2)} – {b.max.toFixed(2)}</div>
              <div className="text-[12px] text-slate-500 mt-0.5">{b.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEV NOTES */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">D</span>
          <span className="card-title">Development Notes &amp; Action Plan</span>
        </header>
        <div className="card-body grid md:grid-cols-2 gap-6">
          <LongField
            label="Key Strengths Observed"
            value={a.narrative.strengths}
            editable={editableHOD}
            onChange={(v) =>
              setA({ ...a, narrative: { ...a.narrative, strengths: v } })
            }
          />
          <LongField
            label="Areas for Improvement & Action Plan"
            value={a.narrative.improvements}
            editable={editableHOD}
            onChange={(v) =>
              setA({ ...a, narrative: { ...a.narrative, improvements: v } })
            }
          />
        </div>
      </section>

      {/* HOD COMMENTS */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">E</span>
          <span className="card-title">HOD Review &amp; Decision</span>
        </header>
        <div className="card-body flex flex-col gap-4">
          <LongField
            label="Overall HOD Comments"
            value={a.narrative.hodComments}
            editable={editableHOD}
            onChange={(v) =>
              setA({ ...a, narrative: { ...a.narrative, hodComments: v } })
            }
          />
          {editableHOD && (
            <label className="inline-flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={a.promotionRecommended}
                onChange={(e) => setA({ ...a, promotionRecommended: e.target.checked })}
              />
              <span>
                Recommend promotion (only if employee is qualified and consistently strong)
              </span>
            </label>
          )}
        </div>
      </section>

      {/* SM COMMENTS */}
      {(session.role === "countersigner" ||
        a.state === "pending_hr" ||
        a.state === "pending_employee_ack" ||
        a.state === "completed") && (
        <section className="card">
          <header className="card-header">
            <span className="card-label">F</span>
            <span className="card-title">Senior Management Countersign</span>
          </header>
          <div className="card-body flex flex-col gap-4">
            <LongField
              label="Overall SM Comments"
              value={a.narrative.smComments}
              editable={editableSM}
              onChange={(v) =>
                setA({ ...a, narrative: { ...a.narrative, smComments: v } })
              }
            />
            {editableSM && (
              <LongField
                label="Rejection Reason (if returning to HOD)"
                value={rejectReason}
                editable
                onChange={setRejectReason}
              />
            )}
          </div>
        </section>
      )}

      {/* EMPLOYEE ACK */}
      {session.role === "employee" && (a.state === "pending_employee_ack" || a.state === "completed") && (
        <section className="card">
          <header className="card-header">
            <span className="card-label">G</span>
            <span className="card-title">Employee Acknowledgement</span>
          </header>
          <div className="card-body flex flex-col gap-4">
            <LongField
              label="Your Comments (optional)"
              value={employeeComments}
              editable={a.state === "pending_employee_ack"}
              onChange={setEmployeeComments}
            />
            {a.employeeAcknowledgedAt && (
              <div className="text-[13px] text-emerald-700">
                ✓ Acknowledged on{" "}
                {new Date(a.employeeAcknowledgedAt).toLocaleString("en-GB")}
              </div>
            )}
          </div>
        </section>
      )}

      {/* AUDIT */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">H</span>
          <span className="card-title">Audit Trail</span>
        </header>
        <div className="card-body">
          {a.audit.length === 0 ? (
            <p className="text-[13px] text-slate-500 italic">No actions yet.</p>
          ) : (
            <ul className="text-[13px] space-y-2">
              {[...a.audit]
                .sort((x, y) => (x.at > y.at ? -1 : 1))
                .map((e, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-slate-400 w-44 shrink-0 text-[12px] font-mono">
                      {new Date(e.at).toLocaleString("en-GB")}
                    </span>
                    <span className="chip bg-slate-100 text-slate-600">{e.actor}</span>
                    <span>
                      <strong>{e.actorName}</strong> — {e.action}
                      {e.detail && (
                        <span className="text-slate-500 italic"> · {e.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      {/* ACTIONS */}
      <section className="card">
        <div className="card-body flex flex-wrap gap-3 items-center">
          {!readOnlyMeta || editableHOD || editableSM ? (
            <button type="button" className="btn btn-ghost" onClick={save} disabled={busy}>
              💾 Save Draft
            </button>
          ) : null}

          {session.role === "admin" && a.state === "draft" && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => transition("submit_to_hod")}
            >
              📤 Submit to HOD
            </button>
          )}

          {editableHOD && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !derived.ready}
              onClick={() => transition("hod_submit")}
            >
              ✓ Submit for Countersigning
            </button>
          )}

          {editableSM && (
            <>
              <button
                type="button"
                className="btn btn-approve"
                disabled={busy}
                onClick={() => transition("countersign_approve")}
              >
                ✓ Countersign — Send to HR
              </button>
              <button
                type="button"
                className="btn btn-reject"
                disabled={busy || !rejectReason.trim()}
                onClick={() => transition("countersign_reject", { reason: rejectReason })}
              >
                ✕ Reject — Return to HOD
              </button>
            </>
          )}

          {session.role === "hr" && a.state === "pending_hr" && (
            <>
              <button
                type="button"
                className="btn btn-approve"
                disabled={busy}
                onClick={() => transition("hr_accept")}
              >
                💾 Accept &amp; Archive to OneDrive
              </button>
              <button
                type="button"
                className="btn btn-reject"
                disabled={busy || !rejectReason.trim()}
                onClick={() => transition("hr_return", { reason: rejectReason })}
              >
                ✕ Return to Admin
              </button>
              <textarea
                className="flex-1 min-w-[240px] border border-rule rounded p-2 text-[13px]"
                placeholder="Return reason (if returning)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </>
          )}

          {session.role === "employee" && a.state === "pending_employee_ack" && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                transition("employee_ack", { employeeComments })
              }
            >
              ✓ I Acknowledge Receipt of this Appraisal
            </button>
          )}

          {a.pdfPath && (
            <span className="ml-auto text-[12px] text-slate-500 italic">
              Archived: <code className="text-graphite">{a.pdfPath}</code>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  editable,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  editable?: boolean;
  type?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="field-label">{label}</label>
      <input
        className={`field-input ${editable ? "" : "text-slate-600"}`}
        type={type}
        value={value ?? ""}
        readOnly={!editable}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function LongField({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="field-label border-b border-rule pb-2">{label}</h4>
      <textarea
        className="w-full min-h-[90px] border border-rule rounded p-3 text-[14px] leading-relaxed outline-none focus:border-navy disabled:bg-ghost"
        value={value ?? ""}
        disabled={!editable}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
