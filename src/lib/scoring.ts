import type { AppraisalScore } from "@/types";

export function effectiveRating(s: AppraisalScore): number | null {
  return s.sm_rating ?? s.appraiser_rating;
}

export function computeTotals(scores: AppraisalScore[]) {
  let total = 0;
  let max = 0;
  let allRated = true;
  for (const s of scores) {
    if (!s.is_applicable) continue;
    const eff = effectiveRating(s);
    if (eff == null) {
      allRated = false;
      continue;
    }
    total += eff;
    max += 5;
  }
  const pct = max > 0 ? Number(((total / max) * 100).toFixed(2)) : null;
  return { total, max, pct, allRated };
}

export function missingRequiredRatings(scores: AppraisalScore[]): AppraisalScore[] {
  return scores.filter((s) => s.is_applicable && s.appraiser_rating == null);
}

export function missingExampleComments(scores: AppraisalScore[]): AppraisalScore[] {
  // PRD §3.3 and §4.2 say "Required — cite examples" for each applicable criterion.
  return scores.filter((s) => s.is_applicable && !(s.comments ?? "").trim());
}
