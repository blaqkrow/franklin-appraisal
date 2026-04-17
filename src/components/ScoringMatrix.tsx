"use client";
import type { FactorScore, FormType, Role } from "@/types";
import { factorsFor, RATING_LABELS } from "@/lib/criteria";
import { bandColor } from "@/lib/scoring";

interface Props {
  formType: FormType;
  scores: FactorScore[];
  role: Role;
  overall: number | null;
  gateFail: boolean;
  onRatingChange?: (idx: number, value: number) => void;
  onRemarksChange?: (idx: number, value: string) => void;
  onSMOverride?: (idx: number, rating: number | null, reason: string) => void;
}

export default function ScoringMatrix({
  formType,
  scores,
  role,
  overall,
  gateFail,
  onRatingChange,
  onRemarksChange,
  onSMOverride,
}: Props) {
  const factors = factorsFor(formType);
  const isHod = role === "hod";
  const isSM = role === "countersigner";
  const showWeights = role !== "employee";
  const employeeView = role === "employee";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="border-b-2 border-rule">
            <th className="w-8 py-2 px-3 text-left text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
              #
            </th>
            <th className="py-2 px-3 text-left text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
              Factor
            </th>
            {showWeights && (
              <th className="w-16 py-2 px-3 text-center text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
                Weight
              </th>
            )}
            {[1, 2, 3, 4, 5].map((v) => (
              <th
                key={v}
                title={RATING_LABELS[v].label}
                className="w-10 py-2 px-1 text-center text-[10px] tracking-wider uppercase text-slate-500 font-semibold"
              >
                {v}
              </th>
            ))}
            <th className="w-20 py-2 px-3 text-center text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
              Score
            </th>
            <th className="min-w-[220px] py-2 px-3 text-left text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
              Indicators
            </th>
            <th className="min-w-[200px] py-2 px-3 text-left text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
              HOD Remarks
            </th>
          </tr>
        </thead>
        <tbody>
          {factors.map((f, i) => {
            const s = scores[i];
            const effective = s.smRating ?? s.hodRating;
            const overridden = s.smRating != null;
            const needRemark = (s.hodRating === 1 || s.hodRating === 5) && !s.hodRemarks.trim();
            return (
              <tr
                key={f.no}
                className={`border-b border-rule ${f.gate ? "bg-rose-50/40" : ""}`}
              >
                <td className="py-3 px-3 text-slate-400 align-top text-[12px]">{f.no}</td>
                <td className="py-3 px-3 align-top">
                  <div className="font-semibold text-[13.5px]">{f.name}</div>
                  {f.gate && (
                    <span className="inline-block mt-1 chip bg-red-50 text-accent">
                      Gate Factor
                    </span>
                  )}
                  {overridden && (
                    <div className="mt-1">
                      <span className="chip bg-amber-100 text-amber-800">SM Override</span>
                    </div>
                  )}
                </td>
                {showWeights && (
                  <td className="py-3 px-3 text-center align-top font-semibold text-graphite">
                    {Math.round(f.weight * 100)}%
                  </td>
                )}
                {[1, 2, 3, 4, 5].map((v) => {
                  const hodChecked = s.hodRating === v;
                  const smChecked = s.smRating === v;
                  const checked = isSM && smChecked ? true : !isSM && hodChecked;
                  const editable = (isHod && onRatingChange) || (isSM && onSMOverride);
                  return (
                    <td key={v} className="py-3 px-1 text-center align-top">
                      <label
                        className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[12px] font-medium cursor-pointer transition border ${
                          checked
                            ? "bg-navy text-white border-navy shadow"
                            : "border-rule text-slate-500 hover:border-navy hover:text-navy"
                        } ${!editable ? "cursor-default hover:border-rule hover:text-slate-500" : ""}`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          name={`r_${i}_${role}`}
                          checked={checked}
                          disabled={!editable}
                          onChange={() => {
                            if (isHod && onRatingChange) onRatingChange(i, v);
                            if (isSM && onSMOverride)
                              onSMOverride(i, v, s.smOverrideReason);
                          }}
                        />
                        {v}
                      </label>
                    </td>
                  );
                })}
                <td className="py-3 px-3 align-middle text-center">
                  <div className="bg-slate-100 rounded font-semibold text-graphite py-1.5 px-2 min-w-[56px] inline-block">
                    {s.weightedScore != null ? s.weightedScore.toFixed(2) : "—"}
                  </div>
                  {effective != null && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      rate {effective}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 align-top text-slate-500 text-[12px] leading-snug">
                  {f.indicators}
                </td>
                <td className="py-3 px-3 align-top">
                  <textarea
                    className={`w-full min-h-[56px] border rounded p-2 text-[12.5px] leading-snug outline-none ${
                      needRemark ? "border-accent" : "border-rule"
                    } ${employeeView ? "bg-ghost text-slate-500" : ""}`}
                    placeholder="HOD remarks (required for 1 or 5)…"
                    readOnly={!isHod || !onRemarksChange || employeeView}
                    value={s.hodRemarks}
                    onChange={(e) => onRemarksChange?.(i, e.target.value)}
                  />
                  {isSM && overridden && (
                    <textarea
                      className="mt-1 w-full min-h-[48px] border border-amber-400 rounded p-2 text-[12px] leading-snug outline-none bg-amber-50"
                      placeholder="SM override justification (required)"
                      value={s.smOverrideReason}
                      onChange={(e) =>
                        onSMOverride?.(i, s.smRating, e.target.value)
                      }
                    />
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="bg-ghost">
            <td className="py-3 px-3" colSpan={showWeights ? 8 : 7}>
              <div className="text-right text-[11px] tracking-wider uppercase font-semibold text-graphite">
                Overall Weighted Score
              </div>
            </td>
            <td className="py-3 px-3">
              <div
                className="text-white rounded py-2 px-3 text-center font-bold"
                style={{ background: bandColor(overall) }}
              >
                {overall != null ? overall.toFixed(2) : "—"}
              </div>
              {gateFail && (
                <div className="text-[10px] text-accent mt-1 text-center font-semibold">
                  Capped · Gate
                </div>
              )}
            </td>
            <td className="py-3 px-3 text-[11px] italic text-slate-500" colSpan={2}>
              {formType === "production_worker"
                ? "Score = (S×25%) + (Q×20%) + (P×15%) + (PA×15%) + (TC×10%) + (TW×10%) + (R×5%)"
                : "Weighted average across 9 factors (17/17/16/9/9/9/9/7/7)"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
