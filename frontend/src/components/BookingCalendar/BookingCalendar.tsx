import { Button } from "@/components/ui/Button";
import { Temporal } from "@js-temporal/polyfill";
import "./BookingCalendar.css";

type Props = {
  month: string;
  today: string;
  date: string;
  availableDates: ReadonlySet<string>;
  status: string;
  error?: string;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
  onRetry: () => void;
};

export function BookingCalendar({ month, today, date, availableDates, status, error, onMonthChange, onSelect, onRetry }: Props) {
  const first = Temporal.PlainDate.from(`${month}-01`);
  const ready = status === "ready";
  return (
    <div className="calendar public:[background:#fff] public:rounded-[17px] public:p-6 public:down-639:p-[15px]" aria-busy={status === "loading"}>
      <div className="calendar-heading tw:customer:flex tw:customer:items-center tw:customer:justify-between tw:customer:gap-5
          tw:customer:mb-5 tw:customer:[&_h2]:text-[18px] tw:customer:[&_h2]:m-0 tw:customer:[&_>_div]:flex
          tw:customer:[&_>_div]:gap-2 tw:customer:[&_button]:py-[5px] tw:customer:[&_button]:px-3
          tw:customer:[&_button]:rounded-[99px]">
        <h2>{first.toLocaleString("en", { month: "long", year: "numeric" })}</h2>
        <div>
          <Button variant="outline" type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => onMonthChange(first.subtract({ months: 1 }).toString().slice(0, 7))}>Previous</Button>
          <Button variant="outline" type="button" aria-label="Next month" onClick={() => onMonthChange(first.add({ months: 1 }).toString().slice(0, 7))}>Next</Button>
        </div>
      </div>
      {status === "loading" && <p role="status">Checking available dates…</p>}
      {status === "error" && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">Couldn’t check available dates. {error} <Button variant="outline" type="button" onClick={onRetry}>Retry dates</Button></p>}
      {ready && !availableDates.size && <p role="status">No dates are available this month for this visit. Try another month or professional.</p>}
      <div className="calendar-grid tw:customer:grid tw:customer:grid-cols-7 tw:customer:gap-2 tw:customer:text-center
          tw:customer:[&_>_span]:text-[12px] tw:customer:[&_>_span]:text-[#73756f] tw:customer:[&_>_span]:py-2
          tw:customer:[&_>_span]:px-0 tw:down-639:customer:gap-[3px]" aria-label="Booking dates">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}
        {Array.from({ length: first.dayOfWeek % 7 }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: first.daysInMonth }, (_, index) => {
          const day = first.add({ days: index }).toString();
          const available = ready && day >= today && availableDates.has(day);
          return <Button variant="outline" type="button" key={day} className={`calendar-day tw:customer:disabled:opacity-[.35] tw:customer:disabled:cursor-not-allowed tw:customer:[border:0] tw:customer:p-1.5 tw:customer:[background:transparent] tw:down-639:customer:min-w-0 public:[aspect-ratio:1.25] public:rounded-[9px] public:text-[14px] public:min-h-9 public:[&.selected]:font-bold  ${date === day && available ? "selected" : ""}`} aria-label={day} aria-pressed={date === day && available} disabled={!available} title={available ? "Available for booking" : ready ? "No available booking times" : "Availability not checked yet"} onClick={() => onSelect(day)}>{index + 1}</Button>;
        })}
      </div>
    </div>
  );
}
