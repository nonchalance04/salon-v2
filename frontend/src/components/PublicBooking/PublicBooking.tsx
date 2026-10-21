// Bring in the tools for the public booking view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BookingCalendar } from "../BookingCalendar";
import { useCalendarAvailability } from "../BookingCalendar/use-calendar-availability";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { api } from "../../lib/api";
import { selectService } from "../../utils/service-selection";
import {
  menuCategories,
  serviceMenuCategory,
} from "../../utils/service-categories";
import { groupServiceVariants } from "../../utils/service-variants";
import { ServiceFamilyOption } from "../ServiceFamilyOption";
import { ServiceCategoryPicker } from "../ServiceCategoryPicker";
import { AppointmentView } from "../AppointmentView";
import { BookingForm } from "../BookingForm";
import type { BookingPlan } from "../../types/booking";
import { money } from "../../utils/money";
import type { CatalogService, Salon } from "../../types/salon";
import {
  ProfessionalPicker,
  type BookingStaff as Staff,
} from "../ProfessionalPicker";

// Describe the information used by the public booking view so different parts of the application agree on its contents.
type Selection = { key: number; serviceId: string; staffId: string };
type Slot = {
  startAt: string;
  endAt: string;
  services: {
    sequenceNo: number;
    serviceName: string;
    staffName: string;
    startAt: string;
    endAt: string;
  }[];
};
type Result = { timeZone: string; slots: Slot[] };
// Keep the shared values for the public booking view together so later steps use the same definitions.
const steps = ["Services", "Professional", "Date & Time", "Information"];
// Choose a readable error message so the screen can explain what went wrong.
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

// Guide the customer through services, staff and time choices so a complete visit can be reserved.
export function PublicBooking({ salon }: { salon: Salon | null }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Remember the current choices and screen status so the page can respond as the user works.
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [timeZone, setTimeZone] = useState("");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<
    Parameters<typeof AppointmentView>[0] | null
  >(null);
  const generation = useRef(0);
  const key = useRef(0);
  const bookingServices = useMemo<BookingPlan["services"]>(
    () =>
      selections.map((selection) =>
        selection.staffId
          ? {
              serviceId: selection.serviceId,
              assignmentMode: "SPECIFIC",
              staffId: selection.staffId,
            }
          : { serviceId: selection.serviceId, assignmentMode: "ANY_AVAILABLE" },
      ),
    [selections],
  );
  const today = timeZone
    ? Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate().toString()
    : "";
  const calendar = useCalendarAvailability(month, bookingServices, step === 2);
  const dateAvailable =
    calendar.status === "ready" &&
    date >= today &&
    calendar.availableDates.has(date);

  // Load the saved information so the screen can show current salon records.
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [catalog, people] = await Promise.all([
        api<{ services: CatalogService[] }>("/services"),
        api<{ timeZone: string; staff: Staff[] }>("/availability/staff"),
      ]);
      setServices(catalog.services);
      setStaff(people.staff);
      setTimeZone(people.timeZone);
      const today = Temporal.Now.zonedDateTimeISO(people.timeZone)
        .toPlainDate()
        .toString();
      setDate("");
      setMonth(today.slice(0, 7));
      const serviceId = params.get("service");
      const initialService =
        catalog.services.find((s) => s.id === serviceId) ?? catalog.services[0];
      setActiveCategory(
        initialService ? serviceMenuCategory(initialService) : "",
      );
      setSelections(
        catalog.services.some((s) => s.id === serviceId)
          ? [{ key: key.current++, serviceId: serviceId!, staffId: "" }]
          : [],
      );
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, []);
  // Move keyboard focus to the active control so the user can continue without searching through the page.
  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);
  // Clear results that depend on earlier choices so an outdated visit cannot be selected.
  function invalidate() {
    generation.current++;
    setResult(null);
    setSlot(null);
    setBusy(false);
    setError("");
  }
  // Build the service choices for the visit so availability uses the selected offerings and professionals.
  const planServices = () => bookingServices;
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    if (
      step === 2 &&
      date &&
      calendar.status === "ready" &&
      (date < today || !calendar.availableDates.has(date))
    ) {
      invalidate();
      setDate("");
      setError("That date has no available times. Choose an enabled date.");
    }
  }, [step, date, today, calendar.status, calendar.availableDates]);
  // Format the visit time for display so the schedule can be read in the salon time zone.
  const format = (instant: string) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(instant));
  // Find the matching choices so the person using this feature can review the available results.
  async function search() {
    if (!dateAvailable) return;
    const attempt = ++generation.current;
    setBusy(true);
    setError("");
    setResult(null);
    setSlot(null);
    try {
      const response = await api<Result>("/availability", {
        method: "POST",
        body: JSON.stringify({ date, services: planServices() }),
      });
      if (attempt !== generation.current) return;
      setResult(response);
      if (!response.slots.length) calendar.markUnavailable(date);
    } catch (err) {
      if (attempt === generation.current) setError(message(err));
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  }
  const total =
    selections.reduce(
      (sum, row) =>
        sum +
        Math.round(
          Number(services.find((s) => s.id === row.serviceId)?.price || 0) *
            100,
        ),
      0,
    ) / 100;
  const duration = selections.reduce(
    (sum, row) =>
      sum +
      (services.find((s) => s.id === row.serviceId)?.durationMinutes || 0),
    0,
  );
  const availableCategories = [...new Set(services.map(serviceMenuCategory))];
  const categories = [
    ...menuCategories.filter((category) =>
      availableCategories.includes(category),
    ),
    ...availableCategories.filter(
      (category) => !menuCategories.some((label) => label === category),
    ),
  ];
  const serviceFamilies = groupServiceVariants(
    services.filter(
      (service) => serviceMenuCategory(service) === activeCategory,
    ),
  );
  const visibleFamilies = serviceFamilies.filter((family) =>
    `${family.name} ${family.options.map(({ service }) => `${service.name} ${service.description || ""}`).join(" ")}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  if (booked)
    return (
      <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] page-section public:pt-7.5 public:pb-20 public:min-h-[65vh]
          public:down-639:pb-[45px] confirmation tw:customer:max-w-[1180px] tw:down-760:customer:w-[calc(100%_-_36px)]
          public:max-w-[940px]">
        <AppointmentView
          initial={booked.initial}
          token={booked.token}
          salon={salon}
        />
      </section>
    );
  return (
    <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] booking-shell public:pt-3 public:pb-20 public:down-639:pb-[45px]
          tw:customer:max-w-[1180px] tw:customer:pt-6 tw:customer:pb-22 tw:customer:[&_label]:text-[13px]
          tw:down-820:customer:max-w-[640px] tw:down-480:customer:w-[calc(100%_-_36px)] tw:down-480:customer:pt-3">
      <div className="booking-top tw:customer:flex tw:customer:items-center tw:customer:justify-between tw:customer:gap-5
          tw:customer:[&_>_button]:[border:0] tw:customer:[&_>_button]:[background:transparent]
          tw:customer:[&_>_button]:pl-0 tw:customer:mb-7 tw:customer:text-[13px]">
        <Button variant="outline"
          onClick={() => (step ? setStep(step - 1) : navigate("/"))}
          disabled={bookingBusy}
        >
           Back
        </Button>
        <Link className="icon-button public:inline-flex public:items-center public:justify-center public:w-9.5 public:h-9.5
          public:rounded-[50%] public:[background:#fff]" to="/" aria-label="Close booking">
          ×
        </Link>
      </div>
      {loading ? (
        <p role="status">Loading salon services…</p>
      ) : !timeZone ? (
        <>
          <p className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]" role="alert">
            {error}
          </p>
          <Button variant="outline" onClick={() => void load()}>Retry</Button>
        </>
      ) : !services.length ? (
        <p className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">No services are available yet.</p>
      ) : (
        <fieldset
          disabled={bookingBusy}
          className="booking-selection tw:[border:0] tw:p-0 tw:m-0 tw:min-w-0 booking-grid tw:customer:grid
          tw:customer:[align-items:start] tw:customer:grid-cols-[minmax(0,1fr)_370px] tw:customer:gap-13
          tw:down-1023:customer:grid-cols-[minmax(0,1fr)_320px] tw:down-1023:customer:gap-7
          tw:down-820:customer:grid-cols-[minmax(0,1fr)] tw:down-820:customer:gap-8"
        >
          <div className="booking-main tw:customer:min-w-0">
            {/* Group the page links so the user can find the next area to open. */}
            <nav className="booking-steps tw:customer:flex-wrap tw:customer:[&_button]:p-0 tw:customer:[&_button]:[border:0]
          tw:customer:[&_button]:[background:transparent] tw:customer:[&_button]:text-[inherit]
          tw:customer:[&_button]:font-normal public:text-[#888a83] public:text-[13px] public:[&_.current]:text-[#8a6f1c]
          public:[&_.current]:font-bold public:[&_button:disabled]:opacity-[1] public:down-639:text-[11px]
          tw:customer:grid tw:customer:grid-cols-[repeat(4,1fr)] tw:customer:gap-0 tw:customer:pb-[25px] tw:customer:mb-8
          tw:customer:[border-bottom:1px_solid_#ddddd7] tw:customer:[&_button]:relative tw:customer:[&_button]:flex
          tw:customer:[&_button]:flex-col tw:customer:[&_button]:items-start tw:customer:[&_button]:gap-[9px]
          tw:customer:[&_button]:text-[12px] tw:customer:[&_button]:text-left tw:down-480:customer:mb-6.5
          tw:down-480:customer:[&_button]:text-[10px]" aria-label="Booking progress">
              {steps.map((label, i) => (
                <Button variant="outline"
                  key={label}
                  disabled={i > step}
                  aria-current={i === step ? "step" : undefined}
                  className={
                    step === i ? "current" : i < step ? "complete" : ""
                  }
                  onClick={() => setStep(i)}
                >
                  <span className="step-number tw:customer:grid tw:customer:place-items-center tw:customer:w-[33px] tw:customer:h-[33px]
          tw:customer:[border:1px_solid_#d6d7cf] tw:customer:rounded-[50%] tw:customer:[background:#f3f3f1]
          tw:customer:text-[#73756f] tw:customer:text-[12px]" aria-hidden="true">
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span>{label}</span>
                </Button>
              ))}
            </nav>
            <p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">
              A LITTLE TIME FOR YOU · STEP {step + 1} OF 4
            </p>
            <h1 ref={titleRef} tabIndex={-1} className="booking-title public:text-[38px] public:tracking-[-1.5px] public:[font-weight:750] public:[margin:23px_0_29px]
          public:down-639:text-[30px] tw:customer:text-[clamp(28px,3vw,38px)] tw:customer:[margin:0_0_12px]
          tw:customer:tracking-[-.045em] tw:customer:focus:[outline:none] public:leading-[1.15]">
              {
                [
                  "Select Services",
                  "Select Professional",
                  "Select Date and Time",
                  "Customer Information",
                ][step]
              }
            </h1>
            <p className="booking-intro tw:customer:text-[#73756f] tw:customer:text-[14px] tw:customer:max-w-[470px] tw:customer:mb-6.5
          tw:customer:leading-[1.7]">
              {
                [
                  "Choose up to one service per category. Combine a haircut, hair color, and a hair treatment in one visit.",
                  "A familiar face or someone new. Choose who takes care of you.",
                  "Make room for a little self-care. Find a time that works for you.",
                  "Just a few details and you’re ready to reserve your visit.",
                ][step]
              }
            </p>
            {error && (
              <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
                {error}
              </p>
            )}
            {step === 0 && (
              <>
                <ServiceCategoryPicker
                  categories={categories}
                  active={activeCategory}
                  onSelect={setActiveCategory}
                />
                <label className="booking-search tw:customer:block tw:customer:[margin:0_0_28px] tw:customer:[&>span]:block
          tw:customer:[&>span]:text-[12px] tw:customer:[&>span]:mb-2 tw:customer:[&>span]:font-semibold
          tw:customer:[&_input]:block tw:customer:[&_input]:w-full tw:customer:[&_input]:m-0
          tw:customer:[&_input]:[background:#fff] tw:customer:[&_input]:py-3.5 tw:customer:[&_input]:px-4
          tw:customer:[&_input]:[border:1px_solid_#ddddd7] tw:customer:[&_input]:rounded-[12px]
          tw:customer:[&_input]:text-[13px]">
                  <span>Search services</span>
                  <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find your next feel-good service…"
                  />
                </label>
                <div className="service-list-heading tw:customer:flex tw:customer:justify-between tw:customer:items-center tw:customer:mb-3.5
          tw:customer:[&_h2]:text-[17px] tw:customer:[&_h2]:tracking-[-.02em] tw:customer:[&_h2]:m-0
          tw:customer:[&>span]:text-[11px] tw:customer:[&>span]:text-[#73756f]">
                  <h2>{activeCategory}</h2>
                  <span>{visibleFamilies.length} services</span>
                </div>
                <div className="picker-list tw:customer:grid tw:customer:gap-3.5">
                  {visibleFamilies.map((family) => (
                    <ServiceFamilyOption
                      key={family.key}
                      family={family}
                      selectedIds={selections.map((row) => row.serviceId)}
                      onRemove={(service) => {
                        invalidate();
                        setSelections((rows) =>
                          rows.filter((row) => row.serviceId !== service.id),
                        );
                      }}
                      onSelect={(service) => {
                        invalidate();
                        const selectionKey = key.current++;
                        setSelections((rows) =>
                          selectService(rows, service, services, selectionKey),
                        );
                      }}
                    />
                  ))}
                </div>
                {!visibleFamilies.length && (
                  <p className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">
                    No services match “{query}” in {activeCategory}. Try another
                    search or category.
                  </p>
                )}
                <p className="booking-tip tw:customer:text-[12px] tw:customer:text-[#73756f] tw:customer:mt-[17px]">
                  Selecting another service in the same category replaces your
                  previous choice. Use the minus (-) button or Remove in your
                  summary to clear a selection.
                </p>
              </>
            )}
            {step === 1 && (
              <ProfessionalPicker
                selections={selections}
                staff={staff}
                services={services}
                onSelect={(rowKey, staffId) => {
                  invalidate();
                  setSelections((rows) =>
                    rows.map((row) =>
                      row.key === rowKey ? { ...row, staffId } : row,
                    ),
                  );
                }}
              />
            )}
            {step === 2 && (
              <>
                <p className="timezone-note tw:text-[12px] tw:text-[#64736b] tw:mb-6">
                  All dates and times are in {timeZone}.
                </p>
                {/* Show the available booking days so the customer can choose a date for the visit. */}
                <BookingCalendar
                  month={month}
                  today={today}
                  date={date}
                  availableDates={calendar.availableDates}
                  status={calendar.status}
                  error={calendar.error}
                  onRetry={calendar.retry}
                  onMonthChange={(next) => {
                    invalidate();
                    setDate("");
                    setMonth(next);
                  }}
                  onSelect={(day) => {
                    invalidate();
                    setDate(day);
                  }}
                />
                <Button variant="outline"
                  className="button public:[border:0] public:rounded-[99px] public:py-3.5 public:px-[23px] public:font-semibold
          public:text-[14px] button--dark tw:customer:text-[white] public:text-[white] public:hover:text-[white] mt-5"
                  disabled={busy || !dateAvailable}
                  onClick={() => void search()}
                >
                  {busy ? "Finding times…" : "Find available times"}
                </Button>
                {result && (
                  <section className="availability-results tw:mt-8 tw:[&_>_label]:max-w-[320px]">
                    <h2>Available times</h2>
                    <p className="muted">
                      Availability is checked again when you reserve your visit.
                    </p>
                    {!result.slots.length ? (
                      <p role="status">
                        No times match this visit. Try another date or
                        professional.
                      </p>
                    ) : (
                      <div
                        className="time-options tw:customer:grid tw:customer:grid-cols-3 tw:flex tw:flex-wrap tw:gap-2 tw:my-5 tw:mx-0
          tw:[&_button[aria-pressed=true]]:[background:#315949] tw:[&_button[aria-pressed=true]]:text-[white]
          tw:[&_button[aria-pressed=true]]:[border-color:#315949]"
                        role="group"
                        aria-label="Available appointment times"
                      >
                        {result.slots.map((s) => (
                          <Button variant="outline"
                            type="button"
                            className={`time-slot public:[&.selected]:font-bold public:py-[13px] public:px-2 public:[background:white] public:rounded-[10px] public:text-[14px] public:[&_small]:block public:[&_small]:text-[10px] public:[&_small]:mt-1  ${slot?.startAt === s.startAt ? "selected" : ""}`}
                            key={s.startAt}
                            aria-pressed={slot?.startAt === s.startAt}
                            onClick={() => setSlot(s)}
                          >
                            {format(s.startAt)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
            {step === 3 && slot && (
              <>
                <p className="muted">
                  Your appointment begins with a temporary hold. Pay the
                  appointment fee to confirm it.
                </p>
                {/* Collect customer contact details so the selected visit can be reserved and linked to its customer. */}
                <BookingForm
                  plan={{
                    date,
                    startAt: slot.startAt,
                    services: planServices(),
                  }}
                  onBusy={setBookingBusy}
                  onBooked={(response) =>
                    setBooked({
                      initial: response.appointment,
                      token: response.guestToken,
                    })
                  }
                />
              </>
            )}
          </div>
          {/* Keep the supporting information beside the main task so it stays available while the user works. */}
          <aside className="booking-summary tw:customer:[&_>_button]:w-full tw:customer:[&_>_button]:justify-center tw:customer:[&_>_button]:text-center public:sticky public:top-6 public:[background:#fff]
          public:[border:1px_solid_#d7d9d1] public:rounded-[22px] public:p-7 public:min-h-[540px] public:down-1023:static
          public:down-1023:min-h-[300px] public:down-639:p-5.5" aria-label="Appointment summary">
            <div className="summary-brand tw:customer:flex tw:customer:items-center tw:customer:gap-3.5 tw:customer:pb-5.5
          tw:customer:[border-bottom:1px_solid_#e8e8e1] tw:customer:[&_h2]:text-[19px] tw:customer:[&_h2]:m-0">
              <span className="summary-monogram tw:customer:w-13 tw:customer:h-14.5 tw:customer:grid tw:customer:place-items-center
          tw:customer:[background:#eeeadc] tw:customer:[border:1px_solid_#e3dcc6] tw:customer:rounded-[28px_28px_8px_8px]
          tw:customer:text-[#85702f] tw:customer:shrink-0" aria-hidden="true">
                C
              </span>
              <div>
                <p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">YOUR APPOINTMENT</p>
                <h2>{salon?.profile?.name || "Clique Salon"}</h2>
              </div>
            </div>
            {salon?.profile?.address && (
              <p className="muted">⌖ {salon.profile.address}</p>
            )}
            <div className="summary-items tw:customer:my-6 tw:customer:mx-0">
              {!selections.length && (
                <div className="summary-empty tw:customer:text-center tw:customer:py-6 tw:customer:px-2.5 tw:customer:[&>span]:text-[40px]
          tw:customer:[&>span]:text-[#b49a48] tw:customer:[&_h3]:text-[16px] tw:customer:[&_h3]:my-2.5
          tw:customer:[&_h3]:mx-0 tw:customer:[&_p]:text-[12px] tw:customer:[&_p]:m-0 tw:customer:[&_p]:leading-[1.8]">
                  <span aria-hidden="true">✧</span>
                  <h3>A moment, just for you.</h3>
                  <p className="muted">
                    Choose your services to start building your perfect visit.
                  </p>
                </div>
              )}
              {selections.map((row, i) => {
                const service = services.find((s) => s.id === row.serviceId);
                const person = staff.find((s) => s.id === row.staffId);
                return (
                  <div className="summary-item tw:customer:[border-bottom:1px_solid_#e8e8e3] tw:customer:pb-4.5 tw:customer:text-[14px]
          tw:customer:[&_p]:text-[12px] tw:customer:[&_p]:my-2 tw:customer:[&_p]:mx-0 public:mb-[23px]" key={row.key}>
                    <div className="card-actions tw:customer:flex tw:customer:justify-between tw:customer:gap-5 tw:customer:items-baseline
          tw:customer:flex-wrap">
                      <strong>
                        {i + 1}. {service?.name}
                      </strong>
                      <span>{money(service?.price || "0")}</span>
                    </div>
                    <p className="muted">
                      {service?.durationMinutes} min ·{" "}
                      {person
                        ? `${person.firstName} ${person.lastName}`
                        : "Any available professional"}
                    </p>
                    {step === 0 && (
                      <div className="summary-actions tw:customer:flex tw:customer:gap-2 tw:customer:[&_button]:text-[11px]
          tw:customer:[&_button]:rounded-[99px] tw:customer:[&_button]:[background:transparent]
          tw:customer:[&_button]:[border:0] tw:customer:[&_button]:underline tw:customer:[&_button]:text-[#73756f]
          tw:customer:[&_button]:py-[5px] tw:customer:[&_button]:px-0 tw:customer:[&_button]:mr-2.5">
                        <Button variant="outline"
                          aria-label={`Remove service ${i + 1}`}
                          onClick={() => {
                            invalidate();
                            setSelections((rows) =>
                              rows.filter((s) => s.key !== row.key),
                            );
                          }}
                        >
                          Remove
                        </Button>
                        <Button variant="outline"
                          disabled={i === 0}
                          aria-label={`Move service ${i + 1} earlier`}
                          onClick={() => {
                            invalidate();
                            setSelections((rows) => {
                              const next = [...rows];
                              [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                              return next;
                            });
                          }}
                        >
                          Move earlier
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {step >= 2 && date && (
              <div className="summary-schedule public:text-[13px] public:[background:#f5f4ee] public:rounded-[12px] public:p-[15px]
          public:mt-5">
                <p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">YOUR VISIT</p>
                <p>
                  {Temporal.PlainDate.from(date).toLocaleString("en", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <small>{timeZone}</small>
                {slot && (
                  <>
                    <p>
                      {format(slot.startAt)} – {format(slot.endAt)}
                    </p>
                    <ol>
                      {slot.services.map((s) => (
                        <li key={s.sequenceNo}>
                          {s.serviceName} · {s.staffName}
                          <br />
                          {format(s.startAt)} – {format(s.endAt)}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}
            <div className="summary-meta tw:customer:flex tw:customer:justify-between tw:customer:text-[12px] tw:customer:text-[#73756f]
          tw:customer:[margin:20px_0_14px]" aria-live="polite">
              <span>
                {selections.length}{" "}
                {selections.length === 1 ? "service" : "services"}
              </span>
              <span>{duration} min total</span>
            </div>
            <div className="card-actions tw:customer:flex tw:customer:justify-between tw:customer:gap-5 tw:customer:items-baseline
          tw:customer:flex-wrap summary-total tw:customer:py-5.5 tw:customer:px-0
          tw:customer:[border-top:1px_solid_#ddddd7]">
              <strong>Service total</strong>
              <strong>{money(total)}</strong>
            </div>
            <p className="muted">
              The appointment fee is separate from service charges. Final prices
              and assignments are confirmed when the hold is created.
            </p>
            {step < 3 && (
              <Button variant="outline"
                className="button public:[border:0] public:rounded-[99px] public:py-3.5 public:px-[23px] public:font-semibold
          public:text-[14px] button--dark tw:customer:text-[white] public:text-[white] public:hover:text-[white]"
                disabled={
                  !selections.length ||
                  (step === 2 && (!slot || !dateAvailable))
                }
                onClick={() => setStep(step + 1)}
              >
                {
                  [
                    "Choose professional",
                    "Choose date & time",
                    "Enter your details",
                  ][step]
                }{" "}

              </Button>
            )}
            {!selections.length && (
              <p className="summary-hint tw:customer:text-center tw:customer:text-[#73756f] tw:customer:text-[11px]
          tw:customer:[margin:10px_0_0]">Select a service to continue</p>
            )}
            <Link className="booking-help tw:customer:block tw:customer:text-center tw:customer:text-[11px] tw:customer:text-[#73756f]
          tw:customer:mt-5.5 tw:customer:pt-4.5 tw:customer:[border-top:1px_solid_#e8e8e1]" to="/help">
              Need a hand? Visit the salon guide
            </Link>
          </aside>
        </fieldset>
      )}
    </section>
  );
}
