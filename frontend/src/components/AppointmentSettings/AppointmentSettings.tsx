import { useEffect, useRef, useState, type FormEvent } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { api } from "../../lib/api";
import { definitions } from "../Configuration/Configuration.fields";
import { policyKeys, policyTimeline, policyValuesEqual, type PolicyKey, type PolicyRecord, type PolicyValues } from "./policy-settings";
import "./AppointmentSettings.css";

const fields = definitions.policies.fields.filter(field => field.key !== "effectiveFrom");
const defaults = Object.fromEntries(fields.map(field => [field.key, String(field.initial ?? "")])) as PolicyValues;

export function AppointmentSettings({ policies, timeZone, loading, loadError, onRetry, onSaved }: {
  policies: PolicyRecord[];
  timeZone?: string;
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  onSaved: (policy: PolicyRecord) => void;
}) {
  const [now, setNow] = useState(Date.now);
  const [draft, setDraft] = useState<PolicyValues | null>(null);
  const [activation, setActivation] = useState("immediate");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const { current, scheduled, history } = policyTimeline(policies, now);

  // Keep scheduled activations accurate while this screen remains open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { if (draft) form.current?.focus(); }, [Boolean(draft)]);

  function effectiveTime() {
    return activation === "later" && startDate && timeZone
      ? Temporal.PlainDateTime.from(startDate).toZonedDateTime(timeZone, { disambiguation: "reject" }).toInstant().toString()
      : null;
  }
  let targetTime: string | null = null;
  let validDate = activation === "immediate";
  try {
    targetTime = effectiveTime();
    validDate ||= Boolean(targetTime && Date.parse(targetTime) > now);
  } catch { /* Invalid or ambiguous salon-local times keep Save disabled. */ }
  const targetPolicy = policyTimeline(policies, targetTime ? Date.parse(targetTime) : now).current;
  const unchanged = Boolean(draft && targetPolicy && policyValuesEqual(draft, targetPolicy));

  const dateTime = (value: string) => new Intl.DateTimeFormat("en-PH", {
    timeZone, dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));

  function open() {
    setNow(Date.now());
    const source = policyTimeline(policies, Date.now()).current;
    setDraft(source ? Object.fromEntries(policyKeys.map(key => [key, String(source[key])])) as PolicyValues : { ...defaults });
    setActivation("immediate");
    setStartDate("");
    setError("");
    setNotice("");
  }
  function close() {
    setDraft(null);
    window.requestAnimationFrame(() => editButton.current?.focus());
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setError("");
    try {
      const effectiveFrom = effectiveTime();
      if (activation === "later" && (!effectiveFrom || Date.parse(effectiveFrom) <= Date.now())) {
        throw new Error("Choose a future start date and time in the salon timezone.");
      }
      const applicable = policyTimeline(policies, effectiveFrom ? Date.parse(effectiveFrom) : Date.now()).current;
      if (applicable && policyValuesEqual(draft, applicable)) {
        setError("No settings have changed. Edit a value before saving.");
        return;
      }
      if (effectiveFrom && policies.some(policy => Date.parse(policy.effectiveFrom) === Date.parse(effectiveFrom))) {
        throw new Error("A settings change is already scheduled for this time. Choose a different start time.");
      }
      setBusy(true);
      const values = Object.fromEntries(policyKeys.map(key => [key,
        key === "appointmentFeeAmount" ? String(draft[key]) : Number(draft[key]),
      ]));
      const result = await api<{ record: PolicyRecord }>("/configuration/policies", {
        method: "POST", body: JSON.stringify({ ...values, appointmentFeeType: "FIXED", effectiveFrom }),
      });
      onSaved(result.record);
      setNow(Date.now());
      close();
      setNotice(effectiveFrom ? `Settings scheduled for ${dateTime(result.record.effectiveFrom)}.` : "Appointment settings saved. New bookings now use these settings.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function values(policy: PolicyRecord) {
    return <dl>{fields.map(field => <div key={field.key}>
      <dt>{field.label}</dt>
      <dd>{field.type === "money"
        ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(policy[field.key]))
        : String(policy[field.key])}</dd>
    </div>)}</dl>;
  }

  return <section aria-label="Appointment settings" className="configuration tw:[&_.section-heading]:items-start appointment-settings tw:[&_fieldset]:[border:0]
          tw:[&_fieldset]:p-0 tw:[&_fieldset]:m-0 tw:[&_fieldset]:min-w-0 tw:[&_.actions]:flex-wrap">
    <div className="section-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-5 tw:[&_.eyebrow]:mb-2.5
          tw:[&_h2]:text-[30px] tw:down-760:items-start tw:down-760:flex-col
          tw:down-600:[.confirmed-services_&]:items-start tw:down-600:[.confirmed-services_&]:flex-col
          tw:[.admin-scheduling-grid_&]:gap-2.5 tw:[.admin-scheduling-grid_&]:flex-wrap">
      <div><p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">SALON MANAGEMENT</p><h2>Appointment Settings</h2>
        <p className="muted">Manage appointment fees and booking rules for new bookings.</p></div>
      {!loading && !loadError && <Button ref={editButton} type="button" onClick={open} disabled={busy || Boolean(draft)}>
        {current ? "Edit settings" : "Set up settings"}
      </Button>}
    </div>
    {timeZone && <p className="timezone-note tw:text-[12px] tw:text-[#64736b] tw:mb-6">All dates and times use {timeZone}.</p>}
    {loadError && <div role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]"><p>{loadError}</p><Button variant="outline" onClick={onRetry}>Retry</Button></div>}
    {loading && !loadError && <p role="status">Loading settings…</p>}
    {notice && <p role="status" className="success tw:[.admin-settlement_>_&]:[grid-column:2] tw:[.admin-settlement_>_&]:m-0 tw:[background:#eaf2e9]
          tw:py-3 tw:px-4 tw:rounded-[6px] tw:[.clique-login-form_&]:text-[#203c34]">{notice}</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
    {!loading && !loadError && <>
      {draft ? <form ref={form} tabIndex={-1} className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5" onSubmit={save}>
        <h3>{current ? "Edit settings" : "Set up appointment settings"}</h3>
        <p className="muted">These changes apply to new bookings. Existing bookings keep their original rules.</p>
        <fieldset disabled={busy}>
          <div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]">{fields.map(field => <label key={field.key}>
            {field.label}
            <Input required type="number" min={field.min ?? 0} step={field.type === "money" ? "0.01" : "1"}
              value={String(draft[field.key as PolicyKey])}
              onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
          </label>)}</div>
          <div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]">
            <label>When to apply these changes
              <NativeSelect value={activation} onChange={event => setActivation(event.target.value)}>
                <NativeSelectOption value="immediate">Apply immediately</NativeSelectOption>
                <NativeSelectOption value="later">Schedule for later</NativeSelectOption>
              </NativeSelect>
            </label>
            {activation === "later" && <label>Start date and time ({timeZone})
              <Input type="datetime-local" required value={startDate} onChange={event => setStartDate(event.target.value)} />
            </label>}
          </div>
        </fieldset>
        {scheduled.length > 0 && <p className="help tw:text-[12px] tw:mt-6">Previously scheduled settings will still take effect at the times listed below.</p>}
        {unchanged && <p className="muted">No changes to save.</p>}
        {activation === "later" && startDate && !validDate && <p className="muted">Choose a valid future time in {timeZone}.</p>}
        <div className="actions tw:flex tw:gap-3">
          <Button type="submit" disabled={busy || unchanged || !validDate}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => { close(); setError(""); }}>Cancel</Button>
        </div>
      </form> : current ? <Card asChild className="config-record tw:p-6 tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px] tw:min-w-0
          tw:[&_dl]:grid tw:[&_dl]:grid-cols-[1fr_1fr] tw:[&_dl]:gap-[14px_18px] tw:[&_dl]:mb-0 tw:[&_dt]:text-[11px]
          tw:[&_dt]:text-[#64736b] tw:[&_dd]:[margin:3px_0_0] tw:[&_dd]:text-[14px] tw:[&_dd]:[overflow-wrap:anywhere]
          tw:down-540:[&_dl]:grid-cols-[1fr] block"><article aria-label="Current settings">
        <h3>Current settings</h3>
        <p className="muted">Applies to new bookings since {dateTime(current.effectiveFrom)}.</p>
        <p className="muted">Existing bookings keep the rules they were booked under.</p>
        {values(current)}
      </article></Card> : <p className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">No settings are currently active. Set up appointment settings to enable new bookings.</p>}

      {scheduled.length > 0 && <section aria-label="Scheduled settings" className="policy-section tw:[.appointment-settings_&]:mt-7">
        <h3>Scheduled settings</h3>
        <p className="muted">Each change applies to bookings created from its start time.</p>
        <div className="config-records tw:[.services-configuration_&]:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]
          tw:[.services-configuration_&]:gap-5
          tw:[.staff-configuration_&]:grid-cols-[repeat(auto-fill,minmax(min(100%,350px),1fr))]
          tw:[.staff-configuration_&]:gap-5 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))]
          tw:gap-4.5">{scheduled.map(policy => <Card asChild key={policy.id} className="config-record tw:p-6 tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px] tw:min-w-0
          tw:[&_dl]:grid tw:[&_dl]:grid-cols-[1fr_1fr] tw:[&_dl]:gap-[14px_18px] tw:[&_dl]:mb-0 tw:[&_dt]:text-[11px]
          tw:[&_dt]:text-[#64736b] tw:[&_dd]:[margin:3px_0_0] tw:[&_dd]:text-[14px] tw:[&_dd]:[overflow-wrap:anywhere]
          tw:down-540:[&_dl]:grid-cols-[1fr] block"><article>
          <h4>Starts {dateTime(policy.effectiveFrom)}</h4>{values(policy)}
        </article></Card>)}</div>
      </section>}
      {history.length > 0 && <details className="policy-section tw:[.appointment-settings_&]:mt-7 policy-history
          tw:[.appointment-settings_&_>_summary]:cursor-pointer tw:[.appointment-settings_&_>_summary]:font-semibold
          tw:[.appointment-settings_&_>_summary]:py-3 tw:[.appointment-settings_&_>_summary]:px-0
          tw:[.appointment-settings_&_>_summary:focus-visible]:outline-offset-[3px]">
        <summary>Settings history ({history.length})</summary>
        <p className="muted">Previous settings are kept for bookings made under those rules.</p>
        <div className="config-records tw:[.services-configuration_&]:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]
          tw:[.services-configuration_&]:gap-5
          tw:[.staff-configuration_&]:grid-cols-[repeat(auto-fill,minmax(min(100%,350px),1fr))]
          tw:[.staff-configuration_&]:gap-5 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))]
          tw:gap-4.5">{history.map(policy => <Card asChild key={policy.id} className="config-record tw:p-6 tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px] tw:min-w-0
          tw:[&_dl]:grid tw:[&_dl]:grid-cols-[1fr_1fr] tw:[&_dl]:gap-[14px_18px] tw:[&_dl]:mb-0 tw:[&_dt]:text-[11px]
          tw:[&_dt]:text-[#64736b] tw:[&_dd]:[margin:3px_0_0] tw:[&_dd]:text-[14px] tw:[&_dd]:[overflow-wrap:anywhere]
          tw:down-540:[&_dl]:grid-cols-[1fr] block"><article>
          <h4>Settings update {policy.version}</h4><p className="muted">Effective from {dateTime(policy.effectiveFrom)}</p>{values(policy)}
        </article></Card>)}</div>
      </details>}
    </>}
  </section>;
}
