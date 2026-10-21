// Bring in the tools for the staff availability view so this file can work with the rest of the application.
import { useId, useRef, type KeyboardEvent } from "react";
import { CalendarDays, CalendarOff } from "lucide-react";
import { Configuration } from "../Configuration";
import "./StaffAvailability.css";

// Describe the information used by the staff availability view so different parts of the application agree on its contents.
type AvailabilityTab = "schedules" | "unavailability";
// Keep the shared values for the staff availability view together so later steps use the same definitions.
const tabs = [
  { value: "schedules", label: "Weekly schedules", icon: CalendarDays },
  { value: "unavailability", label: "Time off", icon: CalendarOff },
] as const;

// Show staff availability periods so administrators can review team coverage.
export function StaffAvailability({ tab, onTabChange, onReviewBooking }: {
  tab: AvailabilityTab;
  onTabChange: (tab: AvailabilityTab) => void;
  onReviewBooking?: (code: string) => void;
}) {
  const id = useId();
  // Remember the current choices and screen status so the page can respond as the user works.
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Move the visible schedule period so staff can review another set of dates.
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : null;
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    if (tab !== tabs[next].value) onTabChange(tabs[next].value);
  }
  // Show the prepared content and actions so the user can review the information and continue.
  return <section className="staff-availability" aria-label="Staff availability">
    <div className="availability-tabs tw:inline-flex tw:items-center tw:gap-[5px] tw:max-w-full tw:mb-7 tw:p-[5px]
          tw:[border:1px_solid_#e2dfd4] tw:rounded-[12px] tw:[background:#eaeae5] tw:workspace:[&_button]:inline-flex
          tw:workspace:[&_button]:items-center tw:workspace:[&_button]:justify-center tw:workspace:[&_button]:gap-2
          tw:workspace:[&_button]:min-h-10.5 tw:workspace:[&_button]:py-2.5 tw:workspace:[&_button]:px-4.5
          tw:workspace:[&_button]:[border:1px_solid_transparent] tw:workspace:[&_button]:rounded-[8px]
          tw:workspace:[&_button]:[background:transparent] tw:workspace:[&_button]:text-[#858071]
          tw:workspace:[&_button]:text-[12px] tw:workspace:[&_button]:font-semibold
          tw:workspace:[&_button]:whitespace-nowrap tw:workspace:[&_button[aria-selected=true]]:[border-color:#e6dfc6]
          tw:workspace:[&_button[aria-selected=true]]:[background:#fffdf5]
          tw:workspace:[&_button[aria-selected=true]]:text-[#80691f] tw:workspace:[&_button:hover]:[background:#f7f4e9]
          tw:workspace:[&_button:hover]:text-[#80691f] tw:down-540:flex tw:down-540:w-full tw:down-540:mb-5.5
          tw:down-540:workspace:[&_button]:flex-1 tw:down-540:workspace:[&_button]:py-2.5
          tw:down-540:workspace:[&_button]:px-3 tw:down-540:workspace:[&_button]:text-[11px]" role="tablist" aria-label="Staff availability views">{tabs.map((item, index) => <button
      type="button" role="tab" key={item.value}
      ref={button => { buttons.current[index] = button; }}
      id={`${id}-${item.value}-tab`} aria-controls={`${id}-${item.value}-panel`}
      aria-selected={tab === item.value} tabIndex={tab === item.value ? 0 : -1}
      onKeyDown={event => move(event, index)} onClick={() => { if (tab !== item.value) onTabChange(item.value); }}>
      <item.icon size={17} aria-hidden="true" />{item.label}
    </button>)}</div>
    {tabs.map(item => <div key={item.value} role="tabpanel" hidden={tab !== item.value}
      id={`${id}-${item.value}-panel`} aria-labelledby={`${id}-${item.value}-tab`}>
      {tab === item.value && <Configuration key={item.value} initialSection={item.value} onReviewBooking={onReviewBooking} />}
    </div>)}
  </section>;
}
