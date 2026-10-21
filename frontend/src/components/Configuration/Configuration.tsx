import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { OpeningHours, type OpeningHour } from "../OpeningHours";
import { allDayClosureDate } from "./closure-date";
import { AppointmentSettings } from "../AppointmentSettings";
import type { PolicyRecord } from "../AppointmentSettings/policy-settings";
import { StaffProfileEditor } from "../StaffProfileEditor";
import { StaffSkillsEditor } from "../StaffSkillsEditor";
import { ServiceEditor } from "./ServiceEditor";
import { StaffEditor } from "./StaffEditor";
import { ScheduleEditor } from "./ScheduleEditor";
import { ScheduleList } from "./ScheduleList";
import { Clock3, Pencil, Scissors } from "lucide-react";
import "./Services.css";
import "./Staff.css";
import "./Schedules.css";
import type { StaffPublicProfile } from "../../utils/staff-profile";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { configurationBody, fieldEditValue } from "./configuration-values";
import { api, ApiError } from "../../lib/api";
import { definitions, days, closureIntervalFields, type Section, type Field } from "./Configuration.fields";

type Row = { id: string; [key: string]: unknown };
type Snapshot = { timeZone: string; profile: Row | null; policies: PolicyRecord[]; qualifications: Row[] } & Record<
  Exclude<Section, "profile" | "policies">,
  Row[]
>;
type Conflict = {
  appointmentServiceId: string;
  bookingCode: string;
  startAt: string;
  reservedUntilAt: string;
};
const titleCase = (text: string) =>
  text.charAt(0) + text.slice(1).toLowerCase();

export function Configuration({
  initialSection = "profile",
  onReviewBooking,
}: {
  initialSection?: Section;
  onReviewBooking?: (code: string) => void;
}) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [section, setSection] = useState<Section>(initialSection);
  const [edit, setEdit] = useState<{
    id?: string;
    customHours?: boolean;
    values: Record<string, string | boolean>;
  } | null>(null);
  const [profileStaff, setProfileStaff] = useState<Row | null>(null);
  const [skillsStaff, setSkillsStaff] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const errorPanel = useRef<HTMLDivElement>(null);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    if (edit) form.current?.focus();
  }, [edit?.id, Boolean(edit)]);
  useEffect(() => {
    if (error) errorPanel.current?.scrollIntoView({ block: "nearest" });
  }, [error]);
  const definition = definitions[section];
  const fields = section === "closures" && edit?.customHours ? closureIntervalFields : definition.fields;
  const closureDate = (row: Row) => allDayClosureDate(String(row.startsAt), String(row.endsAt), data!.timeZone);
  const recordFields = (row: Row) => section === "closures" && !closureDate(row) ? closureIntervalFields : definition.fields;
  async function load() {
    setData(await api<Snapshot>("/configuration"));
  }
  useEffect(() => {
    void load().catch((err) => setError(err.message));
  }, []);
  const staffName = (id: unknown) => {
    const row = data?.staff.find((r) => r.id === id);
    return row ? `${row.firstName} ${row.lastName}` : "Unknown staff";
  };
  const serviceName = (id: unknown) =>
    String(data?.services.find((r) => r.id === id)?.name ?? "Unknown service");
  const dateTime = (value: unknown) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: data!.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(String(value)));
  function display(field: Field, value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (field.type === "active") return value ? "Active" : "Inactive";
    if (field.type === "staff") return staffName(value);
    if (field.type === "service") return serviceName(value);
    if (field.type === "percent") return `${(Number(value) * 100).toFixed(2)}%`;
    if (field.type === "money")
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(Number(value));
    if (field.type === "time") return String(value).slice(11, 19);
    if (field.type === "date") return String(value).slice(0, 10);
    if (field.type === "datetime") return dateTime(value);
    if (field.type === "day") return titleCase(String(value));
    return String(value);
  }
  function open(row?: Row) {
    editorTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setProfileStaff(null);
    setSkillsStaff(null);
    const source = row;
    const day = section === "closures" && source ? closureDate(source) : null;
    const customHours = section === "closures" && Boolean(source) && !day;
    const values: Record<string, string | boolean> = {};
    for (const field of customHours ? closureIntervalFields : definition.fields) {
      const raw = section === "closures" && field.key === "date" ? day : source?.[field.key];
      values[field.key] = fieldEditValue(field, raw, data!.timeZone, customHours);
    }
    setEdit({ id: row?.id, values, customHours });
    setError("");
    setNotice("");
    setConflicts([]);
  }
  function fail(err: unknown) {
    setError(
      err instanceof Error ? err.message : "The change could not be saved.",
    );
    if (
      err instanceof ApiError &&
      err.details &&
      typeof err.details === "object" &&
      "appointments" in err.details &&
      Array.isArray(err.details.appointments)
    )
      setConflicts(err.details.appointments);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!edit || !data || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setConflicts([]);
    try {
      const body = configurationBody(fields, edit.values, data.timeZone);
      const path = `/configuration/${section}${edit.id && section !== "profile" ? `/${edit.id}` : ""}`;
      await api(path, {
        method: edit.id || section === "profile" ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setEdit(null);
      setNotice("Configuration saved.");
      await load();
    } catch (err) {
      fail(err);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (section === "staff" && !window.confirm(
      `Delete ${staffName(id)}? This will mark the staff member inactive and prevent new bookings. Appointment and commission history will be preserved. You can reactivate them using Edit.`,
    )) return;
    setBusy(true);
    setError("");
    setNotice("");
    setConflicts([]);
    try {
      await api(`/configuration/${section}/${id}`, { method: "DELETE" });
      setEdit(null);
      setProfileStaff(null);
      setSkillsStaff(null);
      setNotice(
        section === "staff"
          ? "Staff member deleted (marked inactive). Appointment and commission history has been preserved."
          : "Period removed.",
      );
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }
  if (section === "policies") return <AppointmentSettings
    policies={data?.policies ?? []}
    timeZone={data?.timeZone}
    loading={!data}
    loadError={error}
    onRetry={() => { setError(""); void load().catch(fail); }}
    onSaved={policy => setData(current => current ? {
      ...current, policies: [...current.policies, policy],
    } : current)}
  />;

  const rows = data
    ? section === "profile"
      ? data.profile
        ? [data.profile]
        : []
      : data[section]
    : [];
  return (
    <section aria-label="Salon configuration" className={`configuration tw:[&_.section-heading]:items-start ${section === "services" ? " services-configuration" : section === "staff" ? " staff-configuration" : section === "schedules" ? " schedules-configuration" : ""}`}>
      {/* <nav className="config-tabs tw:[&_button]:text-[12px] tw:[&_button]:py-[9px] tw:[&_button]:px-3" aria-label="Configuration sections">
        {(Object.keys(definitions) as Section[]).map((key) => (
          <button
            key={key}
            disabled={busy}
            aria-current={section === key ? "page" : undefined}
            onClick={() => {
              setSection(key);
              setEdit(null);
              setProfileStaff(null);
              setSkillsStaff(null);
              setError("");
              setNotice("");
              setConflicts([]);
            }}
          >
            {definitions[key].title}
          </button>
        ))}
      </nav> */}
      <div className="section-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-5 tw:[&_.eyebrow]:mb-2.5
          tw:[&_h2]:text-[30px] tw:down-760:items-start tw:down-760:flex-col
          tw:down-600:[.confirmed-services_&]:items-start tw:down-600:[.confirmed-services_&]:flex-col
          tw:[.admin-scheduling-grid_&]:gap-2.5 tw:[.admin-scheduling-grid_&]:flex-wrap">
        <div>
          <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">SALON MANAGEMENT</p>
          <h2>{definition.title}</h2>
          <p className="muted">{definition.description}</p>
        </div>
        {data && section !== "hours" && (
          <Button variant="default"
            className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5"
            disabled={busy}
            onClick={() =>
              open(
                section === "profile" ? (data.profile ?? undefined) : undefined,
              )
            }
          >
            {section === "profile"
              ? "Edit profile"
              : `+ Add ${definition.singular}`}
          </Button>
        )}
      </div>
      {data && !["services", "staff", "schedules"].includes(section) && (
        <p className="timezone-note tw:text-[12px] tw:text-[#64736b] tw:mb-6">
          All dates and times use {data.timeZone}.
        </p>
      )}
      {error && !skillsStaff && !(["services", "staff", "schedules"].includes(section) && edit) && (
        <div ref={errorPanel} role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
          <p>{error}</p>
          {conflicts.length > 0 && (
            <ul>
              {conflicts.map((c) => (
                <li key={c.appointmentServiceId}>
                  <strong>{c.bookingCode}</strong>{" "}
                  {onReviewBooking && (
                    <Button variant="outline"
                      type="button"
                      onClick={() => onReviewBooking(c.bookingCode)}
                    >
                      Review booking
                    </Button>
                  )}{" "}
                  · {dateTime(c.startAt)} – {dateTime(c.reservedUntilAt)}
                </li>
              ))}
            </ul>
          )}
          {!data && (
            <Button variant="outline" onClick={() => void load().catch(fail)}>Retry</Button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="success tw:[.admin-settlement_>_&]:[grid-column:2] tw:[.admin-settlement_>_&]:m-0 tw:[background:#eaf2e9]
          tw:py-3 tw:px-4 tw:rounded-[6px] tw:[.clique-login-form_&]:text-[#203c34]">
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">Loading configuration…</p>}
      {data && section === "hours" && <OpeningHours
        hours={data.hours.map(row => ({ id: row.id, dayOfWeek: String(row.dayOfWeek), openTime: String(row.openTime), closeTime: String(row.closeTime), isActive: Boolean(row.isActive) }) satisfies OpeningHour)}
        busy={busy}
        onBusy={setBusy}
        onStart={() => { setError(""); setNotice(""); setConflicts([]); }}
        onSaved={async day => { await load(); setNotice(`${day} opening hours saved.`); }}
        onError={fail}
      />}
      {skillsStaff && data && (
        <StaffSkillsEditor
          key={skillsStaff.id}
          staffId={skillsStaff.id}
          name={staffName(skillsStaff.id)}
          busy={busy}
          onBusy={setBusy}
          error={error}
          onStart={() => { setError(""); setConflicts([]); }}
          onRestoreFocus={() => editorTrigger.current?.focus()}
          errorDetails={conflicts.length > 0 && <ul>{conflicts.map(conflict => <li key={conflict.appointmentServiceId}>
            <strong>{conflict.bookingCode}</strong> · {dateTime(conflict.startAt)} – {dateTime(conflict.reservedUntilAt)}
            {onReviewBooking && <Button type="button" variant="outline" onClick={() => onReviewBooking(conflict.bookingCode)}>Review booking</Button>}
          </li>)}</ul>}
          services={data.services.map((row) => ({
            id: row.id,
            name: String(row.name),
            category: String(row.category ?? "Other"),
            isActive: Boolean(row.isActive),
          }))}
          qualifications={data.qualifications
            .filter((row) => row.staffId === skillsStaff.id)
            .map((row) => ({
              serviceId: String(row.serviceId),
              commissionRate: String(row.commissionRate),
              isActive: Boolean(row.isActive),
            }))}
          onError={fail}
          onClose={() => {
            setSkillsStaff(null);
            setError("");
            setConflicts([]);
          }}
          onSaved={async () => {
            await load();
            setSkillsStaff(null);
            setError("");
            setConflicts([]);
            setNotice(
              "Staff skills saved. Booking eligibility now follows the selected services.",
            );
          }}
        />
      )}
      {profileStaff && (
        <StaffProfileEditor
          key={profileStaff.id}
          staffId={profileStaff.id}
          name={staffName(profileStaff.id)}
          initial={profileStaff.publicProfile as StaffPublicProfile | null}
          busy={busy}
          onBusy={setBusy}
          onRestoreFocus={() => editorTrigger.current?.focus()}
          onClose={() => setProfileStaff(null)}
          onSaved={(profile) => {
            setData((current) =>
              current
                ? {
                    ...current,
                    staff: current.staff.map((row) =>
                      row.id === profileStaff.id
                        ? { ...row, publicProfile: profile }
                        : row,
                    ),
                  }
                : current,
            );
            setProfileStaff(null);
            setNotice(
              "Public profile saved. Customers will see it when they load the booking page.",
            );
          }}
        />
      )}
      {edit && section === "services" && <ServiceEditor
        editing={Boolean(edit.id)}
        values={edit.values}
        categories={[...new Set(data?.services.map(row => String(row.category ?? "Other")))]}
        busy={busy}
        error={error}
        onChange={(key, value) => setEdit(current => current ? { ...current, values: { ...current.values, [key]: value } } : current)}
        onSubmit={save}
        onClose={() => { setEdit(null); setError(""); }}
        onRestoreFocus={() => editorTrigger.current?.focus()}
      />}
      {edit && section === "staff" && <StaffEditor
        editing={Boolean(edit.id)}
        staffCode={edit.id ? String(data?.staff.find(row => row.id === edit.id)?.staffCode ?? "—") : undefined}
        values={edit.values}
        busy={busy}
        error={error}
        onChange={(key, value) => setEdit(current => current ? { ...current, values: { ...current.values, [key]: value } } : current)}
        onSubmit={save}
        onClose={() => { setEdit(null); setError(""); setConflicts([]); }}
        onRestoreFocus={() => editorTrigger.current?.focus()}
        errorDetails={conflicts.length > 0 && <ul>{conflicts.map(conflict => <li key={conflict.appointmentServiceId}>
          <strong>{conflict.bookingCode}</strong> · {dateTime(conflict.startAt)} – {dateTime(conflict.reservedUntilAt)}
          {onReviewBooking && <Button type="button" variant="outline" onClick={() => onReviewBooking(conflict.bookingCode)}>Review booking</Button>}
        </li>)}</ul>}
      />}
      {edit && section === "schedules" && data && <ScheduleEditor
        editing={Boolean(edit.id)}
        values={edit.values}
        staff={data.staff.map(row => ({ id: row.id, name: staffName(row.id), isActive: Boolean(row.isActive) }))}
        timeZone={data.timeZone}
        busy={busy}
        error={error}
        errorDetails={conflicts.length > 0 && <ul>{conflicts.map(conflict => <li key={conflict.appointmentServiceId}>
          <strong>{conflict.bookingCode}</strong> · {dateTime(conflict.startAt)} – {dateTime(conflict.reservedUntilAt)}
          {onReviewBooking && <Button type="button" variant="outline" onClick={() => onReviewBooking(conflict.bookingCode)}>Review booking</Button>}
        </li>)}</ul>}
        onChange={(key, value) => setEdit(current => current ? { ...current, values: { ...current.values, [key]: value } } : current)}
        onSubmit={save}
        onClose={() => { setEdit(null); setError(""); setConflicts([]); }}
        onRestoreFocus={() => editorTrigger.current?.focus()}
      />}
      {edit && section !== "services" && section !== "staff" && section !== "schedules" && (
        <form ref={form} tabIndex={-1} className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5" onSubmit={save}>
          <h3>
            {edit.id ? "Edit" : "New"} {definition.singular}
          </h3>
          {section === "closures" && <p className="muted">
            {edit.customHours
              ? "This existing closure uses custom hours. Its time range is preserved."
              : `The salon will be closed all day on the selected date (${data!.timeZone}).`}
          </p>}
          <div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]">
            {fields.map((field) => {
              const value = edit.values[field.key] ?? "";
              const update = (next: string | boolean) =>
                setEdit({
                  ...edit,
                  values: { ...edit.values, [field.key]: next },
                });
              const locked = Boolean(
                edit.id && ["staffId", "serviceId"].includes(field.key),
              );
              if (field.type === "active")
                return (
                  <label className="checkbox tw:flex-row tw:items-center tw:[&_input]:w-4.5 tw:[&_input]:h-4.5 tw:[&_input]:[accent-color:#203c34]" key={field.key}>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => update(e.target.checked)}
                    />
                    {field.label}
                  </label>
                );
              if (["day", "staff", "service"].includes(field.type ?? "")) {
                const options =
                  field.type === "day"
                    ? days.map((d) => ({ id: d, name: titleCase(d) }))
                    : field.type === "staff"
                      ? data!.staff.map((s) => ({
                          id: s.id,
                          name: `${staffName(s.id)}${s.isActive ? "" : " (inactive)"}`,
                        }))
                      : data!.services.map((s) => ({
                          id: s.id,
                          name: `${s.name}${s.isActive ? "" : " (inactive)"}`,
                        }));
                return (
                  <label key={field.key}>
                    {field.label}
                    <NativeSelect
                      required
                      disabled={locked}
                      value={String(value)}
                      onChange={(e) => update(e.target.value)}
                    >
                      <NativeSelectOption value="">Select…</NativeSelectOption>
                      {options.map((option) => (
                        <NativeSelectOption value={option.id} key={option.id}>
                          {option.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                );
              }
              const numeric = ["money", "number", "percent"].includes(
                field.type ?? "",
              );
              return (
                <label key={field.key}>
                  {field.label}
                  <Input
                    required={!field.optional && !locked}
                    disabled={locked}
                    value={String(value)}
                    type={
                      numeric
                        ? "number"
                        : field.type === "datetime"
                          ? "datetime-local"
                          : (field.type ?? "text")
                    }
                    min={numeric ? (field.min ?? 0) : undefined}
                    max={field.type === "percent" ? 100 : undefined}
                    step={
                      field.type === "datetime" && edit.customHours
                        ? "any"
                        : field.type === "money" || field.type === "percent"
                        ? "0.01"
                        : field.type === "time" ||
                            field.type === "datetime" ||
                            numeric
                          ? "1"
                          : undefined
                    }
                    onChange={(e) => update(e.target.value)}
                  />
                </label>
              );
            })}
          </div>
          <div className="actions tw:flex tw:gap-3">
            <Button variant="default" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="outline" type="button" disabled={busy} onClick={() => setEdit(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {data && section === "schedules" && <ScheduleList
        schedules={data.schedules.map(row => ({ id: row.id, staffId: String(row.staffId), dayOfWeek: String(row.dayOfWeek), startTime: String(row.startTime), endTime: String(row.endTime), effectiveFrom: row.effectiveFrom ? String(row.effectiveFrom) : null, effectiveTo: row.effectiveTo ? String(row.effectiveTo) : null, isActive: Boolean(row.isActive) }))}
        staff={data.staff.map(row => ({ id: row.id, name: staffName(row.id), isActive: Boolean(row.isActive) }))}
        timeZone={data.timeZone}
        busy={busy}
        onEdit={id => open(data.schedules.find(row => row.id === id))}
      />}
      {data && !["hours", "schedules"].includes(section) &&
        (rows.length === 0 ? (
          <p className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">
            No {definition.title.toLowerCase()} configured yet.
          </p>
        ) : (
          <div className="config-records tw:[.services-configuration_&]:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]
          tw:[.services-configuration_&]:gap-5
          tw:[.staff-configuration_&]:grid-cols-[repeat(auto-fill,minmax(min(100%,350px),1fr))]
          tw:[.staff-configuration_&]:gap-5 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))]
          tw:gap-4.5">
            {rows.map((row) => section === "services" ? (
              <article key={row.id} className="service-menu-card tw:flex tw:flex-col tw:min-w-0 tw:p-6 tw:[border:1px_solid_#e5e3dc] tw:rounded-[16px]
          tw:[background:#fff] tw:[&_h3]:[margin:0_0_8px] tw:[&_h3]:text-[#292a28] tw:[&_h3]:text-[18px]
          tw:[&_h3]:leading-[1.4]">
                <div className="service-menu-heading tw:flex tw:justify-between tw:items-center tw:gap-3 tw:mb-5">
                  <span className="service-menu-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-11 tw:h-11 tw:rounded-[12px]
          tw:[background:#f8f2db] tw:text-[#95771c]"><Scissors size={20} aria-hidden="true" /></span>
                  <span className={`service-menu-status tw:py-1 tw:px-2.5 tw:rounded-[20px] tw:[background:#f0f0ee] tw:text-[#696965] tw:text-[11px] tw:font-semibold tw:[&.is-active]:[background:#eaf3ed] tw:[&.is-active]:text-[#37734c] ${row.isActive ? " is-active" : ""}`}>{row.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="service-menu-copy tw:flex-1 tw:[overflow-wrap:anywhere]">
                  <p className="service-menu-category tw:[margin:0_0_6px] tw:text-[#8d762e] tw:text-[11px] tw:font-semibold tw:tracking-[.05em]">{String(row.category ?? "Other")}</p>
                  <h3>{String(row.name)}</h3>
                  <p className="service-menu-description tw:[display:-webkit-box] tw:overflow-hidden tw:text-[#777772] tw:text-[13px]
          tw:[margin:0_0_22px] tw:leading-[1.6]">{String(row.description || "No description added.")}</p>
                </div>
                <div className="service-menu-metrics tw:flex tw:items-center tw:justify-between tw:gap-3 tw:mb-4.5 tw:[&_strong]:text-[23px]
          tw:[&_strong]:[font-weight:650] tw:[&_strong]:tracking-[-.035em] tw:[&_strong]:text-[#292a28]
          tw:[&_strong]:[overflow-wrap:anywhere] tw:[&_>_span]:flex tw:[&_>_span]:items-center tw:[&_>_span]:gap-1.5
          tw:[&_>_span]:text-[#74746e] tw:[&_>_span]:text-[12px] tw:[&_>_span]:whitespace-nowrap">
                  <strong>{display({ key: "price", label: "Price", type: "money" }, row.price)}</strong>
                  <span><Clock3 size={14} aria-hidden="true" />{String(row.durationMinutes)} min</span>
                </div>
                <div className="service-menu-footer tw:flex tw:items-center tw:justify-between tw:gap-2 tw:[border-top:1px_solid_#efeee9]
          tw:pt-4 tw:[&_>_span]:text-[#85857f] tw:[&_>_span]:text-[11px] tw:[&_button]:text-[12px]
          tw:[&_button]:gap-[7px]">
                  <span>{row.bufferMinutes == null ? "Default buffer" : `${row.bufferMinutes} min buffer`}</span>
                  <Button variant="outline" disabled={busy} aria-label={`Edit ${row.name}`} onClick={() => open(row)}><Pencil size={14} aria-hidden="true" />Edit service</Button>
                </div>
              </article>
            ) : (
              <Card asChild key={row.id} className="block"><article className={`config-record tw:p-6 tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px] tw:min-w-0 tw:[&_dl]:grid tw:[&_dl]:grid-cols-[1fr_1fr] tw:[&_dl]:gap-[14px_18px] tw:[&_dl]:mb-0 tw:[&_dt]:text-[11px] tw:[&_dt]:text-[#64736b] tw:[&_dd]:[margin:3px_0_0] tw:[&_dd]:text-[14px] tw:[&_dd]:[overflow-wrap:anywhere] tw:down-540:[&_dl]:grid-cols-[1fr] ${section === "staff" ? " staff-member-card tw:[.staff-configuration_&]:flex tw:[.staff-configuration_&]:flex-col tw:[.staff-configuration_&]:gap-5 tw:[.staff-configuration_&]:p-6 tw:[.staff-configuration_&]:[border-color:#e5e3dc] tw:[.staff-configuration_&]:rounded-[16px] tw:[&_h3]:flex tw:[&_h3]:items-center tw:[&_h3]:gap-3 tw:[&_h3]:m-0 tw:[&_h3]:[order:0] tw:[&_dl]:[order:1] tw:[&_dl]:m-0 tw:[&_.actions]:grid tw:[&_.actions]:grid-cols-[1fr_1fr] tw:[&_.actions]:gap-2 tw:[&_.actions]:[order:3] tw:[&_.actions]:pt-4.5 tw:[&_.actions]:[border-top:1px_solid_#eeece5] tw:[&_.actions_button]:text-[11px] tw:[&_.actions_button]:min-h-9 tw:[&_.actions_button[aria-label^=Delete]]:text-[#a95045] tw:[&_.actions_button[aria-label^=Delete]]:[border-color:transparent] tw:down-540:[.staff-configuration_&]:p-5 " : ""}`}>
                <div className="record-heading tw:[.staff-member-card_&]:contents tw:flex tw:gap-4 tw:items-start tw:justify-between
          tw:[&_h3]:text-[18px] tw:[&_h3]:mb-3 tw:[&_.actions]:flex-wrap tw:[&_.actions]:justify-end
          tw:[&_button]:text-[12px] tw:[&_button]:py-1.5 tw:[&_button]:px-2.5 tw:down-540:flex-wrap">
                  <h3>
                    {section === "staff"
                        ? <><span className="staff-member-avatar tw:grid tw:place-items-center tw:shrink-0 tw:w-12 tw:h-12 tw:rounded-[14px]
          tw:[background:#f8f2db] tw:text-[#967b25] tw:text-[16px] tw:font-semibold tw:uppercase" aria-hidden="true">{`${String(row.firstName).charAt(0)}${String(row.lastName ?? "").charAt(0)}`}</span><span className="staff-member-identity tw:flex-1 tw:min-w-0 tw:[&_>_span]:block tw:[&_>_span]:text-[17px]
          tw:[&_>_span]:[overflow-wrap:anywhere] tw:[&_small]:block tw:[&_small]:mt-1 tw:[&_small]:text-[#858177]
          tw:[&_small]:text-[11px] tw:[&_small]:font-normal tw:[&_>_span]:leading-[1.4]"><span>{staffName(row.id)}</span><small>{String(row.staffCode ?? "—")}</small></span><span className={`staff-member-status tw:py-1 tw:px-2.5 tw:rounded-[20px] tw:[background:#f0f0ee] tw:text-[#696965] tw:text-[10px] tw:font-semibold tw:[&.is-active]:[background:#eaf3ed] tw:[&.is-active]:text-[#37734c] ${row.isActive ? " is-active" : ""}`}>{row.isActive ? "Active" : "Inactive"}</span></>
                        : section === "schedules" ||
                              section === "unavailability"
                            ? staffName(row.staffId)
                            : String(
                                row.name ??
                                  (row.dayOfWeek
                                    ? titleCase(String(row.dayOfWeek))
                                    : definition.singular),
                              )}
                  </h3>
                    <div className="actions tw:flex tw:gap-3">
                      <Button variant="outline" disabled={busy} aria-label={section === "staff" ? `Edit ${staffName(row.id)}` : undefined} onClick={() => open(row)}>
                        {section === "staff" ? "Edit details" : "Edit"}
                      </Button>
                      {section === "staff" && (
                        <>
                          <Button variant="outline"
                            disabled={busy}
                            onClick={() => {
                              editorTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                              setEdit(null);
                              setProfileStaff(null);
                              setNotice("");
                              setError("");
                              setConflicts([]);
                              setSkillsStaff(row);
                            }}
                          >
                            Manage skills
                          </Button>
                          <Button variant="outline"
                            disabled={busy}
                            onClick={() => {
                              editorTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                              setEdit(null);
                              setSkillsStaff(null);
                              setNotice("");
                              setError("");
                              setConflicts([]);
                              setProfileStaff(row);
                            }}
                          >
                            Edit public profile
                          </Button>
                          {Boolean(row.isActive) && (
                            <Button variant="outline"
                              disabled={busy}
                              aria-label={`Delete ${staffName(row.id)}`}
                              onClick={() => void remove(row.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                      {["closures", "unavailability"].includes(section) && (
                        <Button variant="outline"
                          disabled={busy}
                          onClick={() => void remove(row.id)}
                        >
                          {section === "closures" ? "Remove closure" : "Remove period"}
                        </Button>
                      )}
                    </div>
                </div>
                <dl>
                  {recordFields(row).filter(field => section !== "staff" || field.key === "phone").map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>{display(field, section === "closures" && field.key === "date" ? closureDate(row) : row[field.key])}{section === "closures" && field.key === "date" && " · Closed all day"}</dd>
                    </div>
                  ))}
                </dl>
                {section === "staff" && (
                  <div className="staff-skill-summary tw:[border-top:1px_solid_#e8e8e0] tw:pt-3.5 tw:mt-4.5 tw:text-[13px]
          tw:[.staff-member-card_&]:[order:2] tw:[.staff-member-card_&]:flex-1 tw:[.staff-member-card_&]:[border:0]
          tw:[.staff-member-card_&]:p-0 tw:[.staff-member-card_&]:m-0 tw:[&_>_strong]:text-[#77766f]
          tw:[&_>_strong]:text-[11px] tw:[&_>_strong]:font-medium tw:leading-[1.7]">
                    <strong>Qualified services</strong>
                    <div className="staff-member-skills tw:flex tw:flex-wrap tw:gap-1.5 tw:mt-2.5 tw:[&_p]:m-0 tw:[&_p]:text-[#8b887d]
          tw:[&_p]:text-[12px] tw:[&_p]:leading-[1.6]">
                      {data.qualifications
                        .filter(
                          (q) =>
                            q.staffId === row.id &&
                            q.isActive &&
                            data.services.some(
                              (s) => s.id === q.serviceId && s.isActive,
                            ),
                        )
                        .map((q) => {
                          const service = data.services.find(
                            (s) => s.id === q.serviceId,
                          )!;
                          return <span className="staff-member-skill tw:max-w-full tw:py-[5px] tw:px-[9px] tw:[background:#f7f6f0] tw:[border:1px_solid_#eceae0]
          tw:rounded-[6px] tw:text-[#706747] tw:text-[11px] tw:[overflow-wrap:anywhere]" key={q.id} title={String(service.category ?? "Other")}>{String(service.name)}</span>;
                        })
                        }
                      {!data.qualifications.some(q => q.staffId === row.id && q.isActive && data.services.some(s => s.id === q.serviceId && s.isActive)) && <p>No active services assigned. Use Manage skills to enable booking.</p>}
                    </div>
                  </div>
                )}
              </article></Card>
            ))}
          </div>
        ))}
    </section>
  );
}
