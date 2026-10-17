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
    <div className="calendar" aria-busy={status === "loading"}>
      <div className="calendar-heading">
        <h2>{first.toLocaleString("en", { month: "long", year: "numeric" })}</h2>
        <div>
          <Button variant="outline" type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => onMonthChange(first.subtract({ months: 1 }).toString().slice(0, 7))}>‹</Button>
          <Button variant="outline" type="button" aria-label="Next month" onClick={() => onMonthChange(first.add({ months: 1 }).toString().slice(0, 7))}>›</Button>
        </div>
      </div>
      {status === "loading" && <p role="status">Checking available dates…</p>}
      {status === "error" && <p role="alert" className="error">Couldn’t check available dates. {error} <Button variant="outline" type="button" onClick={onRetry}>Retry dates</Button></p>}
      {ready && !availableDates.size && <p role="status">No dates are available this month for this visit. Try another month or professional.</p>}
      <div className="calendar-grid" aria-label="Booking dates">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}
        {Array.from({ length: first.dayOfWeek % 7 }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: first.daysInMonth }, (_, index) => {
          const day = first.add({ days: index }).toString();
          const available = ready && day >= today && availableDates.has(day);
          return <Button variant="outline" type="button" key={day} className={`calendar-day ${date === day && available ? "selected" : ""}`} aria-label={day} aria-pressed={date === day && available} disabled={!available} title={available ? "Available for booking" : ready ? "No available booking times" : "Availability not checked yet"} onClick={() => onSelect(day)}>{index + 1}</Button>;
        })}
      </div>
    </div>
  );
}
