export function progress(baseline: number, target: number, value: number) {
  if (target === baseline) {
    return value >= target ? 100 : 0;
  }

  const pct = ((value - baseline) / (target - baseline)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
