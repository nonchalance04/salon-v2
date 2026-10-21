import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import {
  weekdays,
  dayHours,
  dayHoursRequest,
  type OpeningHour,
  type DayHours,
  type Period,
  type Weekday,
} from "./opening-hours";

const label = (day: string) => day[0] + day.slice(1).toLowerCase();
const timeValue = (value: string) =>
  value.length === 8 && value.endsWith(":00") ? value.slice(0, 5) : value;
const storedTime = (value: string) =>
  value.length === 5 ? `${value}:00` : value;
const timeStep = (value: string) =>
  value.length === 8 && !value.endsWith(":00") ? "1" : "60";

type Props = {
  hours: OpeningHour[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onStart: () => void;
  onSaved: (day: string) => Promise<void>;
  onError: (error: unknown) => void;
};

export function OpeningHours({
  hours,
  busy,
  onBusy,
  onStart,
  onSaved,
  onError,
}: Props) {
  async function save(day: Weekday, draft: DayHours) {
    onBusy(true);
    onStart();
    try {
      await api(`/configuration/hours/day/${day}`, {
        method: "PUT",
        body: JSON.stringify(dayHoursRequest(draft)),
      });
      await onSaved(label(day));
    } catch (error) {
      onError(error);
    } finally {
      onBusy(false);
    }
  }
  return (
    <div className="opening-hours tw:grid tw:gap-3.5" aria-label="Weekly opening hours">
      {weekdays.map((day) => (
        <OpeningDay
          key={day}
          day={day}
          rows={hours.filter((row) => row.dayOfWeek === day)}
          busy={busy}
          onSave={(draft) => save(day, draft)}
        />
      ))}
      <p className="muted">
        These hours repeat every week. For a holiday or a one-day closure, use
        Salon closures.
      </p>
    </div>
  );
}

function OpeningDay({
  day,
  rows,
  busy,
  onSave,
}: {
  day: Weekday;
  rows: OpeningHour[];
  busy: boolean;
  onSave: (draft: DayHours) => Promise<void>;
}) {
  const version = JSON.stringify(rows);
  const [draft, setDraft] = useState(() => dayHours(rows));
  const [saved, setSaved] = useState(() => JSON.stringify(dayHours(rows)));
  useEffect(() => {
    const initial = dayHours(JSON.parse(version));
    setDraft(initial);
    setSaved(JSON.stringify(initial));
  }, [version]);
  const dirty = JSON.stringify(draft) !== saved;
  function update(index: number, changes: Partial<Period>) {
    setDraft((current) => ({
      ...current,
      periods: current.periods.map((period, i) =>
        i === index ? { ...period, ...changes } : period,
      ),
    }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy && dirty) void onSave(draft);
  }
  return (
    <form
      className="opening-day tw:[border:1px_solid_#dce0d8] tw:rounded-[10px] tw:[background:#fff] tw:p-5
          tw:[&_fieldset]:[border:0] tw:[&_fieldset]:m-0 tw:[&_fieldset]:p-0 tw:[&_fieldset]:min-w-0
          tw:[&_legend]:font-bold tw:[&_legend]:text-[16px] tw:[&_legend]:mb-3.5 tw:[&_legend]:p-0 tw:down-700:p-4.5"
      aria-label={`${label(day)} opening hours`}
      onSubmit={submit}
    >
      <fieldset disabled={busy}>
        <legend>{label(day)}</legend>
        <div className="opening-day-controls tw:grid tw:grid-cols-[95px_minmax(0,1fr)_auto] tw:[align-items:start] tw:gap-5
          tw:down-700:grid-cols-[1fr] tw:down-700:gap-2">
          <label className="opening-day-toggle tw:flex tw:flex-row tw:items-center tw:gap-2 tw:my-3 tw:mx-0 tw:text-[14px]
          tw:[&_input]:w-4.5 tw:[&_input]:h-4.5 tw:[&_input]:[accent-color:#203c34] tw:down-700:m-0">
            <input
              type="checkbox"
              aria-label={`Open on ${label(day)}`}
              checked={draft.isOpen}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isOpen: event.target.checked,
                }))
              }
            />
            {draft.isOpen ? "Open" : "Closed"}
          </label>
          <div className="opening-day-times tw:[&>p]:my-[13px] tw:[&>p]:mx-0">
            {draft.isOpen ? (
              <>
                {draft.periods.map((period, index) => (
                  <div className="opening-time-range tw:flex tw:items-center tw:flex-wrap tw:gap-3 tw:mb-2.5 tw:[&_label]:m-0 tw:[&_label]:flex-1
          tw:[&_label]:min-w-[115px] tw:[&_label]:max-w-[200px] tw:[&>button]:[align-self:end]
          tw:down-700:[&_label]:max-w-none" key={index}>
                    <label>
                      Opens at
                      <Input
                        type="time"
                        step={timeStep(period.openTime)}
                        required
                        aria-label={`${label(day)} opens at${index ? ` (${index + 1})` : ""}`}
                        value={timeValue(period.openTime)}
                        onChange={(event) =>
                          update(index, {
                            openTime: storedTime(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Closes at
                      <Input
                        type="time"
                        step={timeStep(period.closeTime)}
                        required
                        aria-label={`${label(day)} closes at${index ? ` (${index + 1})` : ""}`}
                        value={timeValue(period.closeTime)}
                        onChange={(event) =>
                          update(index, {
                            closeTime: storedTime(event.target.value),
                          })
                        }
                      />
                    </label>
                    {draft.periods.length > 1 && (
                      <Button variant="outline"
                        type="button"
                        aria-label={`Remove time range ${index + 1} on ${label(day)}`}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            periods: current.periods.filter(
                              (_, i) => i !== index,
                            ),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className="muted">Closed all day</p>
            )}
          </div>
          <div className="opening-day-actions tw:flex tw:flex-col tw:gap-2 tw:pt-6 tw:down-700:flex-row tw:down-700:flex-wrap
          tw:down-700:pt-2">
            {/* <button type="submit" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={!dirty}>
              Save {label(day)}
            </button> */}
            <Button variant="default" type="submit" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={!dirty}>
              Save
            </Button>
            {dirty && (
              <Button variant="outline" type="button" onClick={() => setDraft(JSON.parse(saved))}>
                Reset {label(day)}
              </Button>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
