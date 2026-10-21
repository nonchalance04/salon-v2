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
  return <div className="schedule-overview tw:mt-6.5">
    <div className="schedule-overview-heading tw:flex tw:items-center tw:justify-between tw:gap-4 tw:mb-4.5 tw:[&_>_div]:flex
          tw:[&_>_div]:items-center tw:[&_>_div]:gap-[9px] tw:[&_>_div]:text-[#82702e] tw:[&_strong]:text-[#565349]
          tw:[&_strong]:text-[13px] tw:[&_>_span]:text-[#969082] tw:[&_>_span]:text-[11px] tw:down-540:flex-col
          tw:down-540:items-start tw:down-540:gap-2"><div><CalendarDays size={18} aria-hidden="true" /><strong>Weekly staff availability</strong></div><span>{active} active {active === 1 ? "shift" : "shifts"} · {timeZone}</span></div>
    <div className="schedule-week-grid tw:grid tw:grid-cols-2 tw:[align-items:start] tw:gap-4.5 tw:down-760:grid-cols-[1fr]">{days.map(day => {
      const shifts = schedules.filter(row => row.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
      const dayName = day.charAt(0) + day.slice(1).toLowerCase();
      return <section className="schedule-day tw:min-w-0 tw:[background:#fff] tw:[border:1px_solid_#e5e3dc] tw:rounded-[14px] tw:overflow-hidden
          tw:[&_>_header]:flex tw:[&_>_header]:items-center tw:[&_>_header]:justify-between tw:[&_>_header]:gap-3
          tw:[&_>_header]:py-4 tw:[&_>_header]:px-5 tw:[&_>_header]:[background:#f4e6b2]
          tw:[&_>_header]:[border-bottom:1px_solid_#e4cf84] tw:[&_>_header]:[border-left:5px_solid_#b28c20]
          tw:[&_>_header_h3]:m-0 tw:[&_>_header_h3]:text-[#51400f] tw:[&_>_header_h3]:text-[18px]
          tw:[&_>_header_h3]:font-bold tw:[&_>_header_span]:shrink-0 tw:[&_>_header_span]:py-1
          tw:[&_>_header_span]:px-2.5 tw:[&_>_header_span]:[border:1px_solid_#dcca8e] tw:[&_>_header_span]:rounded-[20px]
          tw:[&_>_header_span]:[background:#fff9e7] tw:[&_>_header_span]:text-[#786122] tw:[&_>_header_span]:text-[11px]
          tw:[&_>_header_span]:font-semibold tw:[&_ul]:[list-style:none] tw:[&_ul]:m-0 tw:[&_ul]:py-0 tw:[&_ul]:px-5
          tw:[&_li]:[padding:18px_0_14px] tw:[&_>_header_h3]:leading-[1.3]" key={day} aria-label={`${dayName} schedules`}>
        <header><h3>{dayName}</h3><span>{shifts.length} {shifts.length === 1 ? "shift" : "shifts"}</span></header>
        {!shifts.length ? <p className="schedule-day-empty tw:m-0 tw:py-6 tw:px-5 tw:text-[#aaa596] tw:text-[12px]">No shifts configured</p> : <ul>{shifts.map(row => {
          const member = staff.find(person => person.id === row.staffId);
          return <li key={row.id} className={row.isActive ? "" : "is-inactive"}>
            <div className="schedule-shift-heading tw:flex tw:items-center tw:gap-2.5 tw:justify-between tw:[&_>_strong]:text-[14px]
          tw:[&_>_strong]:text-[#3f403a] tw:[&_>_strong]:[overflow-wrap:anywhere]"><strong>{member?.name ?? "Unknown staff"}</strong><span className={`schedule-shift-status tw:shrink-0 tw:rounded-[20px] tw:py-[3px] tw:px-[9px] tw:text-[10px] tw:text-[#87857e] tw:[background:#f0f0ed] tw:[&.is-active]:[background:#eaf3ed] tw:[&.is-active]:text-[#37734c] ${row.isActive ? " is-active" : ""}`}>{row.isActive ? "Active" : "Inactive"}</span></div>
            <p className="schedule-shift-time tw:flex tw:items-center tw:gap-[7px] tw:[margin:9px_0_5px] tw:text-[#777566] tw:text-[12px]
          tw:flex-wrap tw:[&_svg]:text-[#a3956d] tw:[&_svg]:shrink-0"><Clock3 size={14} aria-hidden="true" />{scheduleTime(row.startTime)} – {scheduleTime(row.endTime)}</p>
            <div className="schedule-shift-footer tw:flex tw:items-center tw:justify-between tw:gap-2 tw:[&_>_span]:text-[#a19a88]
          tw:[&_>_span]:text-[10px] tw:[&_small]:block tw:[&_small]:text-[10px] tw:[&_small]:text-[#a57862]
          tw:[&_button]:text-[11px] tw:[&_button]:text-[#907929] tw:[&_>_span]:leading-[1.6]"><span>{row.effectiveFrom && row.effectiveTo ? `${scheduleDate(row.effectiveFrom)} – ${scheduleDate(row.effectiveTo)}` : row.effectiveFrom ? `From ${scheduleDate(row.effectiveFrom)}` : row.effectiveTo ? `Through ${scheduleDate(row.effectiveTo)}` : "No date limits"}{member && !member.isActive && <small>Staff member is inactive</small>}</span><Button type="button" variant="ghost" size="sm" disabled={busy} aria-label={`Edit ${member?.name ?? "staff"} ${dayName} schedule`} onClick={() => onEdit(row.id)}><Pencil size={13} aria-hidden="true" />Edit</Button></div>
          </li>;
        })}</ul>}
      </section>;
    })}</div>
  </div>;
}
