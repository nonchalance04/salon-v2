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
import type { StaffPublicProfile } from "../../utils/staff-profile";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { configurationBody, fieldEditValue } from "./configuration-values";
import { api, ApiError } from "../../lib/api";
import { definitions, days, closureIntervalFields, type Section, type Field } from "./Configuration.fields";

type Row = { id: string; [key: string]: unknown };
type Snapshot = { timeZone: string; profile: Row | null; policies: PolicyRecord[] } & Record<
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
    if (!edit || !data) return;
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
          : "Period removed. Its previous values remain in the audit history.",
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
    <section aria-label="Salon configuration" className="configuration">
      {/* <nav className="config-tabs" aria-label="Configuration sections">
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
      <div className="section-heading">
        <div>
          <p className="eyebrow">SALON MANAGEMENT</p>
          <h2>{definition.title}</h2>
          <p className="muted">{definition.description}</p>
        </div>
        {data && section !== "hours" && (
          <Button variant="default"
            className="primary"
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
      {data && (
        <p className="timezone-note">
          All dates and times use {data.timeZone}.
        </p>
      )}
      {error && (
        <div ref={errorPanel} role="alert" className="error">
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
        <p role="status" className="success">
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
      {edit && (
        <form ref={form} tabIndex={-1} className="account-form" onSubmit={save}>
          <h3>
            {edit.id ? "Edit" : "New"} {definition.singular}
          </h3>
          {section === "closures" && <p className="muted">
            {edit.customHours
              ? "This existing closure uses custom hours. Its time range is preserved."
              : `The salon will be closed all day on the selected date (${data!.timeZone}).`}
          </p>}
          {section === "staff" && <p className="muted">
            Staff ID: {edit.id
              ? String(data?.staff.find(row => row.id === edit.id)?.staffCode ?? "—")
              : "Generated automatically when saved (e.g. STF-1)."}
          </p>}
          <div className="form-grid">
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
                  <label className="checkbox" key={field.key}>
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
                    required={!field.optional && !locked && !(edit.id && section === "staff" && field.key === "lastName")}
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
          <div className="actions">
            <Button variant="default" className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="outline" type="button" disabled={busy} onClick={() => setEdit(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {data && section !== "hours" &&
        (rows.length === 0 ? (
          <p className="empty-state">
            No {definition.title.toLowerCase()} configured yet.
          </p>
        ) : (
          <div className="config-records">
            {rows.map((row) => (
              <Card asChild key={row.id} className="block"><article className="config-record">
                <div className="record-heading">
                  <h3>
                    {section === "staff"
                        ? `${row.firstName} ${row.lastName}`
                        : section === "qualifications"
                          ? `${staffName(row.staffId)} · ${serviceName(row.serviceId)}`
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
                    <div className="actions">
                      <Button variant="outline" disabled={busy} onClick={() => open(row)}>
                        Edit
                      </Button>
                      {section === "staff" && (
                        <>
                          <Button variant="outline"
                            disabled={busy}
                            onClick={() => {
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
                  {section === "staff" && <div>
                    <dt>Staff ID</dt>
                    <dd>{String(row.staffCode ?? "—")}</dd>
                  </div>}
                  {recordFields(row).map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>{display(field, section === "closures" && field.key === "date" ? closureDate(row) : row[field.key])}{section === "closures" && field.key === "date" && " · Closed all day"}</dd>
                    </div>
                  ))}
                </dl>
                {section === "staff" && (
                  <div className="staff-skill-summary">
                    <strong>Qualified services</strong>
                    <p>
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
                          return `${service.name} (${service.category ?? "Other"})`;
                        })
                        .join(", ") ||
                        "No active services assigned. Use Manage skills to enable booking."}
                    </p>
                  </div>
                )}
              </article></Card>
            ))}
          </div>
        ))}
    </section>
  );
}
