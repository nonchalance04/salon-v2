import { useId, useRef, type KeyboardEvent } from "react";
import { CalendarDays, CalendarOff } from "lucide-react";
import { Configuration } from "../Configuration";
import "./StaffAvailability.css";

type AvailabilityTab = "schedules" | "unavailability";
const tabs = [
  { value: "schedules", label: "Weekly schedules", icon: CalendarDays },
  { value: "unavailability", label: "Time off", icon: CalendarOff },
] as const;

export function StaffAvailability({ tab, onTabChange, onReviewBooking }: {
  tab: AvailabilityTab;
  onTabChange: (tab: AvailabilityTab) => void;
  onReviewBooking?: (code: string) => void;
}) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : null;
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    if (tab !== tabs[next].value) onTabChange(tabs[next].value);
  }
  return <section className="staff-availability" aria-label="Staff availability">
    <div className="availability-tabs" role="tablist" aria-label="Staff availability views">{tabs.map((item, index) => <button
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
