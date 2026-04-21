export function cycleYearFor(date = new Date()): number {
  // Appraisal cycle: 01 Oct (prev year) — 30 Sep (current year). Label = end-year.
  return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
}

export function periodLabel(cycleYear: number): string {
  return `01 Oct ${cycleYear - 1} – 30 Sep ${cycleYear}`;
}

export function deadlineFor(cycleYear: number): Date {
  return new Date(Date.UTC(cycleYear, 9, 7));
}

export function daysUntilDeadline(cycleYear: number, today = new Date()): number {
  const d = deadlineFor(cycleYear);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}
