import { CalendarDays, Clock3, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { days } from "./Configuration.fields";
import type { ScheduleStaff } from "./ScheduleEditor";

export type ScheduleRecord = { id: string; staffId: string; dayOfWeek: string; startTime: string; endTime: string; effectiveFrom: string | null; effectiveTo: string | null; isActive: boolean };
export function scheduleTime(value: string) {
  const time = value.includes("T") ? value.slice(11, 19) : value;
  const [hours, minutes = "00", seconds = "00"] = time.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes}${seconds !== "00" ? `:${seconds}` : ""} ${hour >= 12 ? "PM" : "AM"}`;
}
function scheduleDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
export function ScheduleList({ schedules, staff, timeZone, busy, onEdit }: {
  schedules: ScheduleRecord[]; staff: ScheduleStaff[]; timeZone: string; busy: boolean; onEdit: (id: string) => void;
}) {
  const active = schedules.filter(row => row.isActive).length;
  return <div className="schedule-overview">
    <div className="schedule-overview-heading"><div><CalendarDays size={18} aria-hidden="true" /><strong>Weekly staff availability</strong></div><span>{active} active {active === 1 ? "shift" : "shifts"} · {timeZone}</span></div>
    <div className="schedule-week-grid">{days.map(day => {
      const shifts = schedules.filter(row => row.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
      const dayName = day.charAt(0) + day.slice(1).toLowerCase();
      return <section className="schedule-day" key={day} aria-label={`${dayName} schedules`}>
        <header><h3>{dayName}</h3><span>{shifts.length} {shifts.length === 1 ? "shift" : "shifts"}</span></header>
        {!shifts.length ? <p className="schedule-day-empty">No shifts configured</p> : <ul>{shifts.map(row => {
          const member = staff.find(person => person.id === row.staffId);
          return <li key={row.id} className={row.isActive ? "" : "is-inactive"}>
            <div className="schedule-shift-heading"><strong>{member?.name ?? "Unknown staff"}</strong><span className={`schedule-shift-status${row.isActive ? " is-active" : ""}`}>{row.isActive ? "Active" : "Inactive"}</span></div>
            <p className="schedule-shift-time"><Clock3 size={14} aria-hidden="true" />{scheduleTime(row.startTime)} – {scheduleTime(row.endTime)}</p>
            <div className="schedule-shift-footer"><span>{row.effectiveFrom && row.effectiveTo ? `${scheduleDate(row.effectiveFrom)} – ${scheduleDate(row.effectiveTo)}` : row.effectiveFrom ? `From ${scheduleDate(row.effectiveFrom)}` : row.effectiveTo ? `Through ${scheduleDate(row.effectiveTo)}` : "No date limits"}{member && !member.isActive && <small>Staff member is inactive</small>}</span><Button type="button" variant="ghost" size="sm" disabled={busy} aria-label={`Edit ${member?.name ?? "staff"} ${dayName} schedule`} onClick={() => onEdit(row.id)}><Pencil size={13} aria-hidden="true" />Edit</Button></div>
          </li>;
        })}</ul>}
      </section>;
    })}</div>
  </div>;
}
