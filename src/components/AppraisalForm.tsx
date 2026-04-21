"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppRole,
  AppraisalFull,
  AppraisalScore,
  AppraisalTraining,
  SectionIV,
} from "@/types";
import ScoringMatrix from "./ScoringMatrix";
import StatusBadge from "./StatusBadge";
import WorkflowBanner from "./WorkflowBanner";
import GuidelinesPanel from "./GuidelinesPanel";
import {
  APPRAISAL_TYPE_LABELS,
  RECOMMENDATION_LABELS,
  bandFor,
  criteriaFor,
} from "@/lib/criteria";
import { computeTotals } from "@/lib/scoring";
import { canViewSectionIV } from "@/lib/workflow";
import { periodLabel } from "@/lib/period";

interface Props {
  appraisal: AppraisalFull;
  role: AppRole;
  userId: string;
}

export default function AppraisalForm({ appraisal: initial, role, userId }: Props) {
  const router = useRouter();
  const [a, setA] = useState<AppraisalFull>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const criteria = useMemo(() => criteriaFor(a.form_type), [a.form_type]);

  const editableAppraiser =
    role === "appraiser" && a.state === "pending_appraiser" && a.appraiser_id === userId;
  const editableSM = role === "senior_management" && a.state === "pending_sm";
  const editableAppraisee =
    role === "appraisee" && a.state === "pending_appraisee" && a.employee_id === userId;
  const editableHOD = role === "hod" && a.state === "pending_hod" && a.hod_id === userId;
  const editableHR = role === "hr_admin" && a.state === "pending_hr";

  const showSection4 = canViewSectionIV(role);

  const totals = useMemo(() => computeTotals(a.scores), [a.scores]);
  const band = bandFor(totals.pct);

  function mutateScore(criterion_no: number, patch: Partial<AppraisalScore>) {
    setA((prev) => ({
      ...prev,
      scores: prev.scores.map((s) => (s.criterion_no === criterion_no ? { ...s, ...patch } : s)),
    }));
  }
  function mutateTraining(training_type: string, patch: Partial<AppraisalTraining>) {
    setA((prev) => ({
      ...prev,
      training: prev.training.map((t) =>
        t.training_type === training_type ? { ...t, ...patch } : t,
      ),
    }));
  }
  function mutateNarrative(patch: Partial<AppraisalFull["narrative"]>) {
    setA((prev) => ({ ...prev, narrative: { ...prev.narrative, ...patch } }));
  }
  function mutateSection4(patch: Partial<SectionIV>) {
    setA((prev) => ({
      ...prev,
      section_iv: { ...(prev.section_iv ?? ({} as SectionIV)), ...patch } as SectionIV,
    }));
  }

  async function save(silent = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/appraisals/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: a.scores.map((s) => ({
            criterion_no: s.criterion_no,
            is_applicable: s.is_applicable,
            appraiser_rating: s.appraiser_rating,
            sm_rating: s.sm_rating,
            comments: s.comments,
          })),
          training: a.training.map((t) => ({
            training_type: t.training_type,
            is_selected: t.is_selected,
            remarks: t.remarks,
          })),
          narrative: a.narrative,
          section_iv: showSection4 && a.section_iv ? a.section_iv : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setA(data);
      if (!silent) setMsg("Saved.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function transition(action: string, reason?: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await save(true);
      const res = await fetch(`/api/appraisals/${a.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setA(data);
      setMsg(`${action.replace(/_/g, " ")} succeeded.`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <WorkflowBanner state={a.state} />

      {err && (
        <div className="rounded-md border bg-rose-50 border-rose-200 text-rose-800 px-4 py-2 text-[13px]">{err}</div>
      )}
      {msg && (
        <div className="rounded-md border bg-emerald-50 border-emerald-200 text-emerald-800 px-4 py-2 text-[13px]">{msg}</div>
      )}

      {/* Form title + appraisal type checkbox row (matches the top of the PA form) */}
      <section className="card">
        <div className="px-4 sm:px-7 py-4 border-b border-rule flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase text-slate-500">
              Performance Appraisal
            </div>
            <div className="text-[15px] font-semibold">
              {a.form_type === "workers" ? "Non-Office Staff" : "Office Staff"}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["annual", "confirmation", "promotion"]).map((t) => (
              <span
                key={t}
                className={`inline-flex items-center gap-1.5 border rounded px-2 py-1 text-[12px] ${
                  a.appraisal_type === t
                    ? "bg-navy text-white border-navy"
                    : "border-rule text-slate-500"
                }`}
              >
                <span className={`inline-block w-3 h-3 border ${a.appraisal_type === t ? "bg-white border-white" : "border-slate-400"}`} />
                {APPRAISAL_TYPE_LABELS[t]}
              </span>
            ))}
            <StatusBadge state={a.state} />
          </div>
        </div>
      </section>

      {/* Section I — Header */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">(I)</span>
          <span className="card-title">Staff Current Details</span>
        </header>
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          <Field label="Name" value={a.employee.name} />
          <Field label="E/No." value={a.employee.employee_no} />
          <Field label="Designation" value={a.employee.designation ?? "—"} />
          <Field label="Date Joined" value={a.employee.date_joined ?? "—"} />
          <Field label="Department" value={a.employee.department ?? "—"} />
          <Field
            label={a.form_type === "workers" ? "Assessed period" : "Assessment period"}
            value={periodLabel(a.cycle_year)}
          />
          <Field label="Appraiser" value={a.appraiser?.name ?? "—"} />
          <Field label="HOD" value={a.hod?.name ?? "—"} />
        </div>
      </section>

      {(role === "appraiser" || role === "hod" || role === "senior_management") && (
        <GuidelinesPanel />
      )}

      {/* Section II — Scoring */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">(II)</span>
          <span className="card-title">
            {a.form_type === "workers" ? "Assessment Rating" : "Assessment"}
          </span>
          <span className="ml-auto text-[12px] text-slate-500">
            Cite examples to support each rating (required for applicable criteria).
          </span>
        </header>
        <div className="px-4 sm:px-7 pt-3 pb-2 text-[12px] text-slate-600 flex flex-wrap gap-x-5 gap-y-1 border-b border-rule">
          <span><strong>1. Very Poor</strong> — Very much below Expectation</span>
          <span><strong>2. Poor</strong> — Below Expectation</span>
          <span><strong>3. Satisfactory</strong> — Meet Expectation some of the time</span>
          <span><strong>4. Good</strong> — Meet Expectation most of the time</span>
          <span><strong>5. Excellent</strong> — Meet Expectation all the time</span>
        </div>
        <div className="card-body">
          <ScoringMatrix
            criteria={criteria}
            scores={a.scores}
            role={role}
            showWeights
            editableAppraiser={editableAppraiser}
            editableSM={editableSM}
            onChange={mutateScore}
          />
        </div>
        <div className="px-4 sm:px-7 pb-5 bg-ghost border-t border-rule py-4">
          <div className="text-[11px] tracking-wider uppercase text-slate-500 mb-1">Total</div>
          <div className="flex items-center flex-wrap gap-2 text-[16px] font-semibold">
            <span className="inline-block min-w-[60px] text-center border-b-2 border-slate-400 px-2">
              {totals.total}
            </span>
            <span>/</span>
            <span className="inline-block min-w-[60px] text-center border-b-2 border-slate-400 px-2">
              {totals.max}
            </span>
            <span>× 100%</span>
            <span>=</span>
            <span
              className="text-white rounded px-3 py-1 inline-block"
              style={{ background: band?.color ?? "#6b7280" }}
            >
              {totals.pct != null ? `${totals.pct}%` : "—"}
            </span>
            {band && (
              <span className="text-[13px] font-normal text-slate-600 ml-2 italic">
                ({band.label})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Appraiser overall comments */}
      {(editableAppraiser || a.narrative.appraiser_overall_comments) && (
        <section className="card">
          <header className="card-header">
            <span className="card-label">II+</span>
            <span className="card-title">Appraiser Overall Comments</span>
          </header>
          <div className="card-body">
            <textarea
              className="w-full min-h-[100px] border border-rule rounded p-3 text-[14px] outline-none focus:border-navy disabled:bg-ghost"
              placeholder="Overall assessment, context, and highlights…"
              disabled={!editableAppraiser}
              value={a.narrative.appraiser_overall_comments}
              onChange={(e) => mutateNarrative({ appraiser_overall_comments: e.target.value })}
            />
          </div>
        </section>
      )}

      {/* Section III — Training */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">(III)</span>
          <span className="card-title">
            {a.form_type === "workers"
              ? "Training & Development Needs"
              : "Recommended Training"}
          </span>
          <span className="ml-auto text-[12px] text-slate-500 italic">
            {a.form_type === "workers"
              ? "Tick the appropriate training needs based on this appraisal."
              : "Identify recommended training per category, with remarks."}
          </span>
        </header>
        <div className="card-body">
          {a.form_type === "workers" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {a.training.map((t) => (
                <label
                  key={t.training_type}
                  className={`flex items-start gap-2 p-3 border border-rule rounded cursor-pointer ${
                    t.is_selected ? "bg-navy/5 border-navy" : ""
                  } ${!editableAppraiser ? "cursor-default" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={!!t.is_selected}
                    disabled={!editableAppraiser}
                    onChange={(e) =>
                      mutateTraining(t.training_type, { is_selected: e.target.checked })
                    }
                  />
                  <span className="text-[13px]">{t.training_type}</span>
                </label>
              ))}
              <label className="flex flex-col gap-1 sm:col-span-3 mt-2">
                <span className="field-label">Others — pls specify</span>
                <textarea
                  className="border border-rule rounded p-2 text-[13px] outline-none focus:border-navy disabled:bg-ghost"
                  rows={2}
                  disabled={!editableAppraiser}
                  value={
                    a.training.find((t) => t.training_type === "Others: pls specify")
                      ?.remarks ?? ""
                  }
                  onChange={(e) =>
                    mutateTraining("Others: pls specify", { remarks: e.target.value })
                  }
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {a.training.map((t) => (
                <div key={t.training_type} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:gap-4 items-start">
                  <div className="text-[13px] font-semibold pt-2">{t.training_type}</div>
                  <textarea
                    className="border border-rule rounded p-2 text-[13px] outline-none focus:border-navy disabled:bg-ghost"
                    rows={2}
                    placeholder="Remarks / specific course"
                    disabled={!editableAppraiser}
                    value={t.remarks}
                    onChange={(e) => mutateTraining(t.training_type, { remarks: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Staff comments — placed before HOD comments per the PA form layout */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">Staff</span>
          <span className="card-title">
            {a.form_type === "workers"
              ? "Staff comments / Signature"
              : "Comments / Suggestions for improvement by Staff"}
          </span>
          <span className="ml-auto text-[12px] text-slate-500">
            Completed by the Appraisee
          </span>
        </header>
        <div className="card-body">
          <textarea
            className="w-full min-h-[100px] border border-rule rounded p-3 text-[14px] outline-none focus:border-navy disabled:bg-ghost"
            placeholder="Your comments, suggestions for improvement…"
            disabled={!editableAppraisee}
            value={a.narrative.staff_comments}
            onChange={(e) => mutateNarrative({ staff_comments: e.target.value })}
          />
        </div>
      </section>

      {/* HOD comments */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">HOD</span>
          <span className="card-title">
            {a.form_type === "workers"
              ? "HOD comments / Signature"
              : "Comments / Suggestions for improvement by Head of Department"}
          </span>
        </header>
        <div className="card-body">
          <textarea
            className="w-full min-h-[100px] border border-rule rounded p-3 text-[14px] outline-none focus:border-navy disabled:bg-ghost"
            placeholder="HOD overall comments and assessment…"
            disabled={!editableHOD}
            value={a.narrative.hod_comments}
            onChange={(e) => mutateNarrative({ hod_comments: e.target.value })}
          />
        </div>
      </section>

      {/* Senior Management comments (panel appears only at / after pending_sm) */}
      {(editableSM || a.narrative.sm_comments || a.state === "pending_hr" || a.state === "completed") && (
        <section className="card">
          <header className="card-header">
            <span className="card-label">SM</span>
            <span className="card-title">Concurred by Senior Management — Comments</span>
          </header>
          <div className="card-body">
            <textarea
              className="w-full min-h-[100px] border border-rule rounded p-3 text-[14px] outline-none focus:border-navy disabled:bg-ghost"
              disabled={!editableSM}
              value={a.narrative.sm_comments}
              onChange={(e) => mutateNarrative({ sm_comments: e.target.value })}
            />
          </div>
        </section>
      )}

      {/* Section IV — confidential */}
      {showSection4 && a.section_iv && (
        <section className="card border-2 border-rose-200">
          <header className="card-header bg-rose-50/50 flex-col items-start">
            <div className="text-[12px] tracking-[0.15em] uppercase text-rose-700 font-bold">
              Not For Discussion With Appraisee
            </div>
            <div className="flex items-baseline gap-3">
              <span className="card-label text-rose-700">(IV)</span>
              <span className="card-title text-rose-800">
                Overall Assessment by Head of Department / Senior Management
              </span>
            </div>
          </header>
          <div className="card-body flex flex-col gap-5">
            {a.appraisal_type === "confirmation" && (
              <div className="border border-rule rounded p-4">
                <div className="text-[11px] tracking-wider uppercase text-slate-500 font-semibold mb-3">
                  Confirmation Appraisal
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="field-label">To be confirmed on</span>
                    <input
                      type="date"
                      className="border border-rule rounded px-2 py-2 text-[14px]"
                      disabled={!editableHOD && !editableSM}
                      value={a.section_iv.confirmation_date ?? ""}
                      onChange={(e) =>
                        mutateSection4({ confirmation_date: e.target.value || null })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="field-label">Confirmation to be extended until</span>
                    <input
                      type="date"
                      className="border border-rule rounded px-2 py-2 text-[14px]"
                      disabled={!editableHOD && !editableSM}
                      value={a.section_iv.extension_date ?? ""}
                      onChange={(e) =>
                        mutateSection4({ extension_date: e.target.value || null })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="field-label">
                Annual / Promotion Appraisal — please tick the most appropriate box
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["continue", "higher_responsibility", "promotion"] as const).map((v) => (
                  <label
                    key={v}
                    className={`flex items-start gap-2 p-3 border border-rule rounded cursor-pointer ${
                      a.section_iv?.recommendation === v ? "bg-navy/5 border-navy" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="rec"
                      checked={a.section_iv?.recommendation === v}
                      disabled={!editableHOD && !editableSM}
                      onChange={() => mutateSection4({ recommendation: v })}
                    />
                    <span className="text-[13px] font-semibold">
                      {RECOMMENDATION_LABELS[v]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {(a.section_iv.recommendation === "higher_responsibility" ||
              a.section_iv.recommendation === "promotion") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="field-label">Target Role</span>
                  <input
                    type="text"
                    className="border border-rule rounded px-2 py-2 text-[14px]"
                    disabled={!editableHOD && !editableSM}
                    value={a.section_iv.target_role ?? ""}
                    onChange={(e) => mutateSection4({ target_role: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="field-label">Timeframe</span>
                  <input
                    type="text"
                    placeholder="e.g. within 12 months"
                    className="border border-rule rounded px-2 py-2 text-[14px]"
                    disabled={!editableHOD && !editableSM}
                    value={a.section_iv.timeframe ?? ""}
                    onChange={(e) => mutateSection4({ timeframe: e.target.value })}
                  />
                </label>
              </div>
            )}
            <label className="flex flex-col gap-1">
              <span className="field-label">
                Comments / Suggestions / Justifications for Promotions / Special Achievements in the year
              </span>
              <textarea
                className="w-full min-h-[100px] border border-rule rounded p-3 text-[14px] outline-none focus:border-navy disabled:bg-ghost"
                disabled={!editableHOD && !editableSM}
                value={a.section_iv.justification ?? ""}
                onChange={(e) => mutateSection4({ justification: e.target.value })}
              />
            </label>
          </div>
        </section>
      )}

      {/* Section V — HR Official Use (only visible to HR and SM) */}
      {(role === "hr_admin" || role === "senior_management") && (
        <section className="card">
          <header className="card-header">
            <span className="card-label">(V)</span>
            <span className="card-title">For HR&rsquo;s Official Use only</span>
          </header>
          <div className="card-body">
            <label className="flex flex-col gap-1">
              <span className="field-label">Remarks</span>
              <textarea
                className="w-full min-h-[100px] border border-rule rounded p-3 text-[14px] outline-none focus:border-navy disabled:bg-ghost"
                disabled={!editableHR}
                value={a.narrative.hr_remarks}
                onChange={(e) => mutateNarrative({ hr_remarks: e.target.value })}
              />
            </label>
            <p className="text-[11px] text-slate-500 italic mt-2">
              Name / Designation / Signature / Date are captured automatically via the audit trail.
            </p>
          </div>
        </section>
      )}

      {/* Audit */}
      <section className="card">
        <header className="card-header">
          <span className="card-label">Log</span>
          <span className="card-title">Audit Trail &amp; Signatures</span>
        </header>
        <div className="card-body">
          {a.audit.length === 0 ? (
            <p className="text-[13px] text-slate-500 italic">No actions yet.</p>
          ) : (
            <ul className="text-[13px] space-y-1.5">
              {a.audit.map((e, i) => (
                <li key={i} className="flex gap-2 flex-wrap items-start">
                  <span className="text-slate-400 text-[11px] font-mono w-40 shrink-0">
                    {new Date(e.at).toLocaleString("en-GB")}
                  </span>
                  <span className="chip bg-slate-100 text-slate-600">{e.actor_role ?? "system"}</span>
                  <span className="flex-1 min-w-0 break-words">
                    {e.action}
                    {e.detail && <span className="text-slate-500 italic"> · {e.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="card">
        <div className="card-body flex flex-wrap gap-3 items-center">
          {(editableAppraiser || editableAppraisee || editableHOD || editableSM || editableHR) && (
            <button className="btn btn-ghost" onClick={() => save()} disabled={busy}>
              💾 Save Draft
            </button>
          )}
          {editableAppraiser && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => transition("submit_to_appraisee")}
            >
              → Submit to Appraisee
            </button>
          )}
          {editableAppraisee && (
            <>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => transition("appraisee_sign")}
              >
                ✓ Sign &amp; Forward to HOD
              </button>
              <button
                className="btn btn-reject"
                disabled={busy || !rejectReason.trim()}
                onClick={() => transition("reject", rejectReason)}
              >
                ✕ Reject / Dispute
              </button>
            </>
          )}
          {editableHOD && (
            <>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => transition("hod_submit")}
              >
                → Submit to Senior Management
              </button>
              <button
                className="btn btn-reject"
                disabled={busy || !rejectReason.trim()}
                onClick={() => transition("reject", rejectReason)}
              >
                ✕ Reject
              </button>
            </>
          )}
          {editableSM && (
            <>
              <button
                className="btn btn-approve"
                disabled={busy}
                onClick={() => transition("sm_concur")}
              >
                ✓ Concur &amp; Submit to HR
              </button>
              <button
                className="btn btn-reject"
                disabled={busy || !rejectReason.trim()}
                onClick={() => transition("reject", rejectReason)}
              >
                ✕ Reject to HOD
              </button>
            </>
          )}
          {editableHR && (
            <button
              className="btn btn-approve"
              disabled={busy}
              onClick={() => transition("hr_accept")}
            >
              💾 Accept &amp; Archive
            </button>
          )}
          {(editableAppraisee || editableHOD || editableSM) && (
            <input
              type="text"
              className="flex-1 min-w-[200px] border border-rule rounded px-2 py-2 text-[13px]"
              placeholder="Rejection reason (if rejecting)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="field-label">{label}</span>
      <span className="text-[14px] font-medium text-graphite pb-1 border-b border-rule">
        {value || "—"}
      </span>
    </div>
  );
}
