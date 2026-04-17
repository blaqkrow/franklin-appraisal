import type { Appraisal, FactorScore, PerformanceBand } from "@/types";
import { PERFORMANCE_BANDS } from "./criteria";

export function effectiveRating(s: FactorScore): number | null {
  if (s.smRating != null) return s.smRating;
  return s.hodRating;
}

export function computeScores(scores: FactorScore[]): FactorScore[] {
  return scores.map((s) => {
    const eff = effectiveRating(s);
    return {
      ...s,
      effectiveRating: eff,
      weightedScore: eff == null ? null : Number((eff * s.weight).toFixed(4)),
    };
  });
}

export function isFullyRated(scores: FactorScore[]): boolean {
  return scores.every((s) => effectiveRating(s) != null);
}

export function gateTriggered(a: Appraisal): boolean {
  if (a.formType !== "production_worker") return false;
  const gate = a.scores.find((s) => s.factorNo === "01");
  if (!gate) return false;
  const eff = effectiveRating(gate);
  return eff === 1;
}

export function overallScore(a: Appraisal): number | null {
  if (!isFullyRated(a.scores)) return null;
  let total = 0;
  a.scores.forEach((s) => {
    const eff = effectiveRating(s)!;
    total += eff * s.weight;
  });
  if (gateTriggered(a)) total = Math.min(total, 2.0);
  return Number(total.toFixed(2));
}

export function bandFor(score: number | null): PerformanceBand | null {
  if (score == null) return null;
  for (const b of PERFORMANCE_BANDS) {
    if (score >= b.min && score <= b.max) return b.label as PerformanceBand;
  }
  return null;
}

export function bandColor(score: number | null): string {
  if (score == null) return "#6b7280";
  for (const b of PERFORMANCE_BANDS) {
    if (score >= b.min && score <= b.max) return b.color;
  }
  return "#6b7280";
}

export function requiresRemark(rating: number | null): boolean {
  return rating === 1 || rating === 5;
}
