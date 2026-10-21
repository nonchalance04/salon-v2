// Bring in the tools for the configuration view so this file can work with the rest of the application.
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { StaffManagementDialog } from "../StaffManagementDialog/StaffManagementDialog";
import { days } from "./Configuration.fields";
import { scheduleTime } from "./ScheduleList";

// Describe the information used by the configuration view so different parts of the application agree on its contents.
export type ScheduleStaff = { id: string; name: string; isActive: boolean };
// Show the schedule fields so an administrator can enter a work period or closure.
export function ScheduleEditor({ editing, values, staff, timeZone, busy, error, errorDetails, onChange, onSubmit, onClose, onRestoreFocus }: {
  editing: boolean; values: Record<string, string | boolean>; staff: ScheduleStaff[]; timeZone: string;
  busy: boolean; error: string; errorDetails?: ReactNode;
  onChange: (key: string, value: string | boolean) => void;
  onSubmit: (event: FormEvent) => void; onClose: () => void; onRestoreFocus: () => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const errorPanel = useRef<HTMLDivElement>(null);
  // Bring the relevant content into view so the user can find the new information or error.
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
  // Show the prepared content and actions so the user can review the information and continue.
  return <StaffManagementDialog title={editing ? "Edit staff schedule" : "Add staff schedule"} description={editing ? "Adjust the shift hours or active status for this schedule." : "Set a recurring weekly shift and when it applies."} name={member?.name ?? "Weekly availability"} icon={<CalendarDays size={23} />} busy={busy} onClose={onClose} onRestoreFocus={onRestoreFocus}>
    {/* Group the entry fields and submit action so the user can complete this step in one place. */}
    <form className="staff-management-form tw:flex tw:flex-col tw:min-h-0 schedule-editor tw:[&_label_>_small]:text-[10px]
          tw:[&_label_>_small]:font-normal tw:[&_label_>_small]:text-[#a19884] tw:[&_label_>_small]:leading-[1.5]" aria-busy={busy} onSubmit={event => { if (invalidTime || invalidDates) event.preventDefault(); else onSubmit(event); }}>
      <div className="staff-management-body tw:py-6 tw:px-7 tw:overflow-y-auto tw:min-h-0 tw:down-540:py-5.5 tw:down-540:px-5" tabIndex={-1}>
        {error && <div ref={errorPanel} role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]"><p>{error}</p>{errorDetails}</div>}
        <div className="schedule-preview tw:flex tw:items-center tw:gap-3 tw:p-4 tw:mb-6 tw:[border:1px_solid_#e9e3cf]
          tw:[background:#fbf9ef] tw:rounded-[12px] tw:[&_>_span]:grid tw:[&_>_span]:place-items-center
          tw:[&_>_span]:text-[#9a812c] tw:[&_>_div]:flex-1 tw:[&_strong]:text-[#6c603b] tw:[&_strong]:text-[13px]
          tw:[&_p]:[margin:4px_0_0] tw:[&_p]:text-[#928870] tw:[&_p]:text-[12px] tw:[&_>_small]:text-[#a29778]
          tw:[&_>_small]:text-[10px] tw:down-540:[&_>_small]:hidden tw:down-540:[&_p]:text-[11px]"><span><CalendarDays size={20} aria-hidden="true" /></span><div><strong>Every {dayName}</strong><p>{start && end ? `${scheduleTime(start)} – ${scheduleTime(end)}` : "Choose the shift hours below"}</p></div><small>{timeZone}</small></div>
        {!editing && <fieldset disabled={busy} className="schedule-fields tw:[.schedule-editor_&]:[border:0] tw:[.schedule-editor_&]:p-0
          tw:[.schedule-editor_&]:[margin:0_0_24px] tw:[&_legend]:w-full tw:[&_legend]:p-0
          tw:[&_legend]:[margin:0_0_14px] tw:[&_legend]:text-[#4b4b45] tw:[&_legend]:text-[13px] tw:[&_legend]:font-bold
          tw:[&_legend_>_span]:ml-[7px] tw:[&_legend_>_span]:text-[#a19988] tw:[&_legend_>_span]:text-[10px]
          tw:[&_legend_>_span]:font-normal"><legend>Staff & recurrence</legend><div className="schedule-form-grid tw:grid tw:grid-cols-2 tw:gap-4.5 tw:down-540:grid-cols-[1fr] tw:down-540:gap-4">
          <label>Staff member<NativeSelect required value={String(values.staffId ?? "")} onChange={e => onChange("staffId", e.target.value)}><NativeSelectOption value="">Select staff member</NativeSelectOption>{staff.map(row => <NativeSelectOption key={row.id} value={row.id}>{row.name}{row.isActive ? "" : " (inactive)"}</NativeSelectOption>)}</NativeSelect></label>
          <label>Day of week<NativeSelect required value={day} onChange={e => onChange("dayOfWeek", e.target.value)}>{days.map(value => <NativeSelectOption key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</NativeSelectOption>)}</NativeSelect></label>
        </div>{!staff.length && <p className="schedule-field-help tw:flex tw:items-center tw:gap-1.5 tw:[margin:10px_0_0] tw:text-[#99917f] tw:text-[11px]
          tw:leading-[1.5]">Add a staff member before creating a schedule.</p>}</fieldset>}
        <fieldset disabled={busy} className="schedule-fields tw:[.schedule-editor_&]:[border:0] tw:[.schedule-editor_&]:p-0
          tw:[.schedule-editor_&]:[margin:0_0_24px] tw:[&_legend]:w-full tw:[&_legend]:p-0
          tw:[&_legend]:[margin:0_0_14px] tw:[&_legend]:text-[#4b4b45] tw:[&_legend]:text-[13px] tw:[&_legend]:font-bold
          tw:[&_legend_>_span]:ml-[7px] tw:[&_legend_>_span]:text-[#a19988] tw:[&_legend_>_span]:text-[10px]
          tw:[&_legend_>_span]:font-normal"><legend>Shift hours</legend><div className="schedule-form-grid tw:grid tw:grid-cols-2 tw:gap-4.5 tw:down-540:grid-cols-[1fr] tw:down-540:gap-4">
          <label>Starts at<Input required type="time" step="1" value={start} onChange={e => onChange("startTime", e.target.value)} /></label>
          <label>Ends at<Input required type="time" step="1" aria-invalid={invalidTime || undefined} aria-describedby={invalidTime ? "schedule-time-error" : undefined} value={end} onChange={e => onChange("endTime", e.target.value)} /></label>
        </div>{invalidTime ? <p id="schedule-time-error" role="alert" className="schedule-validation tw:[margin:10px_0_0] tw:text-[#ac5340] tw:text-[11px]">End time must be later than start time on the same day.</p> : <p className="schedule-field-help tw:flex tw:items-center tw:gap-1.5 tw:[margin:10px_0_0] tw:text-[#99917f] tw:text-[11px]
          tw:leading-[1.5]"><Clock3 size={13} aria-hidden="true" />All shift times use {timeZone}.</p>}</fieldset>
        {!editing && <fieldset disabled={busy} className="schedule-fields tw:[.schedule-editor_&]:[border:0] tw:[.schedule-editor_&]:p-0
          tw:[.schedule-editor_&]:[margin:0_0_24px] tw:[&_legend]:w-full tw:[&_legend]:p-0
          tw:[&_legend]:[margin:0_0_14px] tw:[&_legend]:text-[#4b4b45] tw:[&_legend]:text-[13px] tw:[&_legend]:font-bold
          tw:[&_legend_>_span]:ml-[7px] tw:[&_legend_>_span]:text-[#a19988] tw:[&_legend_>_span]:text-[10px]
          tw:[&_legend_>_span]:font-normal"><legend>Effective dates <span>Optional</span></legend><div className="schedule-form-grid tw:grid tw:grid-cols-2 tw:gap-4.5 tw:down-540:grid-cols-[1fr] tw:down-540:gap-4">
          <label>Effective from<Input type="date" value={from} onChange={e => onChange("effectiveFrom", e.target.value)} /></label>
          <label>Effective through<Input type="date" min={from || undefined} value={through} aria-invalid={invalidDates || undefined} aria-describedby={invalidDates ? "schedule-date-error" : undefined} onChange={e => onChange("effectiveTo", e.target.value)} /></label>
        </div>{invalidDates ? <p id="schedule-date-error" role="alert" className="schedule-validation tw:[margin:10px_0_0] tw:text-[#ac5340] tw:text-[11px]">The end date must be on or after the start date.</p> : <p className="schedule-field-help tw:flex tw:items-center tw:gap-1.5 tw:[margin:10px_0_0] tw:text-[#99917f] tw:text-[11px]
          tw:leading-[1.5]">Both dates are inclusive. Leave either blank for no limit on that side.</p>}</fieldset>}
        <fieldset disabled={busy} className="schedule-availability tw:[.schedule-editor_&]:p-4 tw:[.schedule-editor_&]:m-0
          tw:[.schedule-editor_&]:[border:1px_solid_#e7e5db] tw:[.schedule-editor_&]:rounded-[12px]
          tw:[.schedule-editor_&]:[background:#faf9f5] tw:[&_label]:relative tw:[&_label]:flex-row
          tw:[&_label]:items-center tw:[&_label]:gap-4.5 tw:[&_label]:cursor-pointer tw:[&_strong]:block
          tw:[&_strong]:mb-1 tw:[&_strong]:text-[12px] tw:[&_input[type=checkbox]]:absolute
          tw:[&_input[type=checkbox]]:right-0 tw:[&_input[type=checkbox]]:w-10 tw:[&_input[type=checkbox]]:h-6
          tw:[&_input[type=checkbox]]:m-0 tw:[&_input[type=checkbox]]:opacity-[0]
          tw:[&_input[type=checkbox]]:cursor-pointer tw:disabled:opacity-[.6]"><label><span><strong>Active schedule</strong><small>{values.isActive ? "This shift contributes to staff availability for new bookings." : "This shift is excluded from availability for new bookings."}</small></span><input type="checkbox" aria-label="Active schedule" checked={Boolean(values.isActive)} onChange={e => onChange("isActive", e.target.checked)} /><span className="schedule-toggle tw:w-10 tw:h-6 tw:shrink-0 tw:rounded-[20px] tw:[background:#c9c9c1] tw:pointer-events-none" aria-hidden="true" /></label></fieldset>
        <p className="staff-management-note tw:flex tw:items-start tw:gap-2 tw:py-3.5 tw:px-4 tw:[margin:20px_0_0]
          tw:[background:#faf8ef] tw:rounded-[10px] tw:text-[#8a805f] tw:text-[11px] tw:[&_svg]:shrink-0
          tw:[&_svg]:mt-[1px] tw:leading-[1.6]"><ShieldCheck size={16} aria-hidden="true" />Changes that conflict with existing reservations must be resolved before saving.</p>
      </div>
      <div className="staff-management-footer tw:flex tw:items-center tw:justify-between tw:shrink-0 tw:gap-3.5 tw:py-4.5 tw:px-7
          tw:[background:#fcfcfa] tw:[border-top:1px_solid_#eceae3] tw:[&_>_span]:text-[#979181]
          tw:[&_>_span]:text-[10px] tw:[&_>_div]:flex tw:[&_>_div]:gap-2.5 tw:[&_button]:min-w-[100px]
          tw:[&_button]:text-[12px] tw:down-540:py-4 tw:down-540:px-5 tw:down-540:[&_>_span]:hidden
          tw:down-540:[&_>_div]:w-full tw:down-540:[&_button]:flex-1 tw:down-540:[&_button]:min-w-0"><span>Repeats weekly on {dayName}</span><div><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || invalidTime || invalidDates || !staff.length}>{busy ? "Saving…" : editing ? "Save changes" : "Add schedule"}</Button></div></div>
    </form>
  </StaffManagementDialog>;
}
