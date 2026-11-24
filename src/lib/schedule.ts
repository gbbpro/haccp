type Frequency =
  | "per_batch"
  | "hourly"
  | "every_2_hours"
  | "every_4_hours"
  | "per_shift"
  | "daily"
  | "weekly";

const HOURS: Record<Frequency, number | null> = {
  per_batch: null, // event-driven, never "overdue"
  hourly: 1,
  every_2_hours: 2,
  every_4_hours: 4,
  per_shift: 8,
  daily: 24,
  weekly: 24 * 7,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  per_batch: "Each batch",
  hourly: "Hourly",
  every_2_hours: "Every 2 hours",
  every_4_hours: "Every 4 hours",
  per_shift: "Each shift",
  daily: "Daily",
  weekly: "Weekly",
};

export type DueStatus = "ok" | "due" | "event";

export function dueStatus(frequency: Frequency, lastRecordedAt: Date | null, now = new Date()): DueStatus {
  const h = HOURS[frequency];
  if (h == null) return "event";
  if (!lastRecordedAt) return "due";
  return now.getTime() - lastRecordedAt.getTime() >= h * 3_600_000 ? "due" : "ok";
}
