export interface Bucket {
  from: number; // inclusive
  to: number; // exclusive (except last)
  label: string;
  count: number;
}

export function bucketize(values: number[], step = 10): Bucket[] {
  const buckets: Bucket[] = [];
  for (let from = 0; from <= 100; from += step) {
    const to = from + step;
    buckets.push({
      from,
      to,
      label: `${from}–${Math.min(to, 100)}%`,
      count: 0,
    });
  }
  for (const v of values) {
    if (v == null || Number.isNaN(v)) continue;
    const idx = Math.min(buckets.length - 1, Math.max(0, Math.floor(v / step)));
    buckets[idx].count++;
  }
  return buckets;
}

export interface Stats {
  n: number;
  mean: number;
  stdev: number;
  min: number;
  max: number;
  median: number;
}

export function stats(values: number[]): Stats {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, stdev: 0, min: 0, max: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  const median =
    n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { n, mean, stdev, min: sorted[0], max: sorted[n - 1], median };
}

/** Gaussian PDF value at x given mean and stdev */
export function gauss(x: number, mean: number, stdev: number): number {
  if (stdev <= 0) return 0;
  const z = (x - mean) / stdev;
  return Math.exp(-0.5 * z * z) / (stdev * Math.sqrt(2 * Math.PI));
}
