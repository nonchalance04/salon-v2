// Bring in the tools for the booking calendar view so this file can work with the rest of the application.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { BookingPlan } from "../../types/booking";

// Describe the information used by the booking calendar view so different parts of the application agree on its contents.
type CalendarResult = {
  month: string;
  dates: { date: string; available: boolean }[];
};
type State = { key: string; data?: CalendarResult; error?: string };

// Load available calendar days as the visit choices change so the date picker stays current.
export function useCalendarAvailability(month: string, services: BookingPlan["services"], enabled: boolean) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const body = JSON.stringify({ month, services });
  const key = `${body}:${attempt}`;
  const active = enabled && Boolean(month) && services.length > 0;

  // Reload the calendar when visit choices change so available days match the current selection.
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setState({ key });
    void api<CalendarResult>("/availability/calendar", { method: "POST", body, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch(error => {
        if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Please try again." });
      });
    return () => controller.abort();
  }, [active, body, key]);

  const current = active && state?.key === key ? state : null;
  const data = current?.data;
  const availableDates = useMemo(() => new Set(data?.dates.filter(day => day.available).map(day => day.date) ?? []), [data]);
  const markUnavailable = useCallback((date: string) => {
    setState(previous => previous?.key === key && previous.data ? {
      ...previous,
      data: { ...previous.data, dates: previous.data.dates.map(day => day.date === date ? { ...day, available: false } : day) },
    } : previous);
  }, [key]);
  return {
    status: !active ? "idle" : current?.error ? "error" : data ? "ready" : "loading",
    availableDates,
    error: current?.error,
    retry: () => setAttempt(value => value + 1),
    markUnavailable,
  };
}
