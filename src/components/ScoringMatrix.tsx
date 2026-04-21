"use client";
import type { AppRole, AppraisalScore, Criterion } from "@/types";
import { RATING_LABELS } from "@/lib/criteria";

interface Props {
  criteria: Criterion[];
  scores: AppraisalScore[];
  role: AppRole;
  showWeights: boolean; // always true; weights N/A here but kept for parity
  editableAppraiser: boolean;
  editableSM: boolean;
  onChange: (criterionNo: number, patch: Partial<AppraisalScore>) => void;
}

export default function ScoringMatrix({
  criteria,
  scores,
  role,
  editableAppraiser,
  editableSM,
  onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {criteria.map((c) => {
        const s = scores.find((x) => x.criterion_no === c.no);
        if (!s) return null;
        const locked = !s.is_applicable;
        const appraiserVal = s.appraiser_rating;
        const smVal = s.sm_rating;
        const overridden = smVal != null && smVal !== appraiserVal;
        return (
          <div
            key={c.no}
            className={`border border-rule rounded-md p-3 sm:p-4 ${locked ? "opacity-60 bg-ghost" : "bg-white"}`}
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="text-slate-400 font-mono text-[12px] pt-1 w-6 shrink-0">
                {String(c.no).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px] leading-snug">{c.name}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{c.description}</div>
              </div>
              {c.optional && (
                <label className="chip bg-slate-100 text-slate-600 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={s.is_applicable}
                    disabled={!editableAppraiser}
                    onChange={(e) => onChange(c.no, { is_applicable: e.target.checked })}
                    className="mr-1"
                  />
                  Applicable
                </label>
              )}
              {overridden && (
                <span className="chip bg-amber-100 text-amber-800 shrink-0">SM Override</span>
              )}
            </div>

            {s.is_applicable && (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {RATING_LABELS.map((r) => {
                    const appChecked = appraiserVal === r.value;
                    const smChecked = smVal === r.value;
                    const active = editableSM ? smChecked : appChecked;
                    const editable = editableAppraiser || editableSM;
                    return (
                      <button
                        type="button"
                        key={r.value}
                        disabled={!editable}
                        onClick={() =>
                          editableSM
                            ? onChange(c.no, { sm_rating: r.value })
                            : onChange(c.no, { appraiser_rating: r.value })
                        }
                        className={`rating-pill ${active ? (editableSM ? "rating-pill-sm" : "rating-pill-on") : "rating-pill-off"} ${!editable ? "cursor-default" : ""}`}
                        title={`${r.label} — ${r.desc}`}
                      >
                        {r.value}
                      </button>
                    );
                  })}
                  {overridden && (
                    <span className="text-[11px] text-slate-500 italic ml-2">
                      HOD rated {appraiserVal} · SM set {smVal}
                    </span>
                  )}
                  {appraiserVal != null && !editableAppraiser && !editableSM && (
                    <span className="text-[11px] text-slate-500 italic ml-2">
                      {RATING_LABELS.find((x) => x.value === (smVal ?? appraiserVal))?.label}
                    </span>
                  )}
                </div>
                <textarea
                  className={`w-full min-h-[60px] border rounded p-2 text-[13px] leading-snug outline-none ${
                    !s.comments.trim() && (appraiserVal === 1 || appraiserVal === 5 || editableAppraiser)
                      ? "border-amber-400"
                      : "border-rule"
                  } ${!editableAppraiser && role !== "senior_management" ? "bg-ghost text-slate-600" : ""}`}
                  placeholder="Cite examples (required)"
                  readOnly={!editableAppraiser && role !== "senior_management"}
                  value={s.comments}
                  onChange={(e) => onChange(c.no, { comments: e.target.value })}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
