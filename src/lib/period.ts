export function appraisalYearFor(date = new Date()): number {
  // Cycle: 01 Oct (prev year) - 30 Sep (current year). Appraisal year = year of the Sep end.
  const y = date.getFullYear();
  const m = date.getMonth();
  return m >= 9 ? y + 1 : y;
}

export function periodLabel(year: number): string {
  return `01 Oct ${year - 1} – 30 Sep ${year}`;
}

export function deadlineFor(year: number): Date {
  return new Date(year, 9, 7);
}

export function daysUntilDeadline(year: number, today = new Date()): number {
  const d = deadlineFor(year);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
