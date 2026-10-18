import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { StaffManagementDialog } from "../StaffManagementDialog/StaffManagementDialog";
import { days } from "./Configuration.fields";
import { scheduleTime } from "./ScheduleList";

export type ScheduleStaff = { id: string; name: string; isActive: boolean };
export function ScheduleEditor({ editing, values, staff, timeZone, busy, error, errorDetails, onChange, onSubmit, onClose, onRestoreFocus }: {
  editing: boolean; values: Record<string, string | boolean>; staff: ScheduleStaff[]; timeZone: string;
  busy: boolean; error: string; errorDetails?: ReactNode;
  onChange: (key: string, value: string | boolean) => void;
  onSubmit: (event: FormEvent) => void; onClose: () => void; onRestoreFocus: () => void;
}) {
  const errorPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorPanel.current?.scrollIntoView({ block: "nearest" }); }, [error]);
  const start = String(values.startTime ?? "");
  const end = String(values.endTime ?? "");
  const from = String(values.effectiveFrom ?? "");
  const through = String(values.effectiveTo ?? "");
  const invalidTime = Boolean(start && end && start.padEnd(8, ":00") >= end.padEnd(8, ":00"));
  const invalidDates = Boolean(from && through && from > through);
  const day = String(values.dayOfWeek ?? "MONDAY");
  const dayName = day.charAt(0) + day.slice(1).toLowerCase();
  const member = staff.find(row => row.id === values.staffId);
  return <StaffManagementDialog title={editing ? "Edit staff schedule" : "Add staff schedule"} description={editing ? "Adjust the shift hours or active status for this schedule." : "Set a recurring weekly shift and when it applies."} name={member?.name ?? "Weekly availability"} icon={<CalendarDays size={23} />} busy={busy} onClose={onClose} onRestoreFocus={onRestoreFocus}>
    <form className="staff-management-form schedule-editor" aria-busy={busy} onSubmit={event => { if (invalidTime || invalidDates) event.preventDefault(); else onSubmit(event); }}>
      <div className="staff-management-body" tabIndex={-1}>
        {error && <div ref={errorPanel} role="alert" className="error"><p>{error}</p>{errorDetails}</div>}
        <div className="schedule-preview"><span><CalendarDays size={20} aria-hidden="true" /></span><div><strong>Every {dayName}</strong><p>{start && end ? `${scheduleTime(start)} – ${scheduleTime(end)}` : "Choose the shift hours below"}</p></div><small>{timeZone}</small></div>
        {!editing && <fieldset disabled={busy} className="schedule-fields"><legend>Staff & recurrence</legend><div className="schedule-form-grid">
          <label>Staff member<NativeSelect required value={String(values.staffId ?? "")} onChange={e => onChange("staffId", e.target.value)}><NativeSelectOption value="">Select staff member</NativeSelectOption>{staff.map(row => <NativeSelectOption key={row.id} value={row.id}>{row.name}{row.isActive ? "" : " (inactive)"}</NativeSelectOption>)}</NativeSelect></label>
          <label>Day of week<NativeSelect required value={day} onChange={e => onChange("dayOfWeek", e.target.value)}>{days.map(value => <NativeSelectOption key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</NativeSelectOption>)}</NativeSelect></label>
        </div>{!staff.length && <p className="schedule-field-help">Add a staff member before creating a schedule.</p>}</fieldset>}
        <fieldset disabled={busy} className="schedule-fields"><legend>Shift hours</legend><div className="schedule-form-grid">
          <label>Starts at<Input required type="time" step="1" value={start} onChange={e => onChange("startTime", e.target.value)} /></label>
          <label>Ends at<Input required type="time" step="1" aria-invalid={invalidTime || undefined} aria-describedby={invalidTime ? "schedule-time-error" : undefined} value={end} onChange={e => onChange("endTime", e.target.value)} /></label>
        </div>{invalidTime ? <p id="schedule-time-error" role="alert" className="schedule-validation">End time must be later than start time on the same day.</p> : <p className="schedule-field-help"><Clock3 size={13} aria-hidden="true" />All shift times use {timeZone}.</p>}</fieldset>
        {!editing && <fieldset disabled={busy} className="schedule-fields"><legend>Effective dates <span>Optional</span></legend><div className="schedule-form-grid">
          <label>Effective from<Input type="date" value={from} onChange={e => onChange("effectiveFrom", e.target.value)} /></label>
          <label>Effective through<Input type="date" min={from || undefined} value={through} aria-invalid={invalidDates || undefined} aria-describedby={invalidDates ? "schedule-date-error" : undefined} onChange={e => onChange("effectiveTo", e.target.value)} /></label>
        </div>{invalidDates ? <p id="schedule-date-error" role="alert" className="schedule-validation">The end date must be on or after the start date.</p> : <p className="schedule-field-help">Both dates are inclusive. Leave either blank for no limit on that side.</p>}</fieldset>}
        <fieldset disabled={busy} className="schedule-availability"><label><span><strong>Active schedule</strong><small>{values.isActive ? "This shift contributes to staff availability for new bookings." : "This shift is excluded from availability for new bookings."}</small></span><input type="checkbox" aria-label="Active schedule" checked={Boolean(values.isActive)} onChange={e => onChange("isActive", e.target.checked)} /><span className="schedule-toggle" aria-hidden="true" /></label></fieldset>
        <p className="staff-management-note"><ShieldCheck size={16} aria-hidden="true" />Changes that conflict with existing reservations must be resolved before saving.</p>
      </div>
      <div className="staff-management-footer"><span>Repeats weekly on {dayName}</span><div><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || invalidTime || invalidDates || !staff.length}>{busy ? "Saving…" : editing ? "Save changes" : "Add schedule"}</Button></div></div>
    </form>
  </StaffManagementDialog>;
}
