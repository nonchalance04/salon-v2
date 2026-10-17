export const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type Weekday = typeof weekdays[number];
export type OpeningHour = { id: string; dayOfWeek: string; openTime: string; closeTime: string; isActive: boolean };
export type Period = { id?: string; openTime: string; closeTime: string };
export type DayHours = { isOpen: boolean; periods: Period[] };

// Time-of-day values are salon-local wall times. Do not apply browser timezone conversion.
export function dayHours(rows: OpeningHour[]): DayHours {
  const active = rows.filter(row => row.isActive).sort((a, b) => a.openTime.localeCompare(b.openTime));
  return {
    isOpen: active.length > 0,
    periods: active.length ? active.map(row => ({ id: row.id, openTime: row.openTime.slice(11, 19), closeTime: row.closeTime.slice(11, 19) }))
      : [{ openTime: "08:00:00", closeTime: "22:00:00" }],
  };
}

export function dayHoursRequest(draft: DayHours): DayHours {
  return { isOpen: draft.isOpen, periods: draft.isOpen ? draft.periods : [] };
}
