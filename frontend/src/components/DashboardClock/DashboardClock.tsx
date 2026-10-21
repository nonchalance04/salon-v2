import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export function DashboardClock() {
  const [now, setNow] = useState(() => new Date());
  const [timeZone, setTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  useEffect(() => {
    const controller = new AbortController();
    void api<{ timeZone: string }>("/salon", { signal: controller.signal })
      .then((salon) => {
        if (!controller.signal.aborted) setTimeZone(salon.timeZone);
      })
      .catch(() => {
        /* Keep the device time zone if salon settings are unavailable. */
      });
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <time className="clique-dashboard-clock tw:flex tw:flex-col tw:items-end tw:gap-[3px] tw:shrink-0 tw:py-3.5 tw:px-5
          tw:rounded-[10px] tw:text-[#fff] tw:text-right tw:tabular-nums tw:[&_>_span]:text-[13px]
          tw:[&_>_strong]:text-[24px] tw:[&_>_strong]:whitespace-nowrap tw:[&_>_small]:text-[11px]
          tw:[&_>_small]:text-[inherit] tw:[&_>_small]:opacity-[0.75] tw:down-760:ml-auto
          tw:down-760:[&_>_strong]:text-[20px] tw:[&_>_strong]:leading-[1.3]" dateTime={now.toISOString()}>
      <span>
        {new Intl.DateTimeFormat("en-PH", {
          timeZone,
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(now)}
      </span>
      <strong>
        {new Intl.DateTimeFormat("en-PH", {
          timeZone,
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now)}
      </strong>
      {/* <small>{timeZone.replaceAll("_", " ")}</small> */}
    </time>
  );
}
