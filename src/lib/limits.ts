type LimitSpec = {
  limitType: "min" | "max" | "range" | "boolean";
  minValue: number | null;
  maxValue: number | null;
  unit: string | null;
};

/** Returns true when a reading meets the critical limit. */
export function isWithinLimits(
  task: LimitSpec,
  reading: { value?: number | null; passed?: boolean | null },
): boolean {
  if (task.limitType === "boolean") return reading.passed === true;
  const v = reading.value;
  if (v == null || Number.isNaN(v)) return false;
  if ((task.limitType === "min" || task.limitType === "range") && task.minValue != null && v < task.minValue)
    return false;
  if ((task.limitType === "max" || task.limitType === "range") && task.maxValue != null && v > task.maxValue)
    return false;
  return true;
}

/** Human-readable limit, e.g. "≤ 41°F", "≥ 165°F", "200–400 ppm", "Pass". */
export function describeLimit(task: LimitSpec): string {
  const u = task.unit ?? "";
  switch (task.limitType) {
    case "min":
      return `≥ ${task.minValue}${u}`;
    case "max":
      return `≤ ${task.maxValue}${u}`;
    case "range":
      return `${task.minValue}–${task.maxValue} ${u}`.trim();
    case "boolean":
      return "Pass";
  }
}
