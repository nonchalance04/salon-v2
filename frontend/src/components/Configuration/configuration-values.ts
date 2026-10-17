import { Temporal } from "@js-temporal/polyfill";
import type { Field } from "./Configuration.fields";

type FormValues = Record<string, string | boolean>;

export function fieldEditValue(
  field: Field,
  raw: unknown,
  timeZone: string,
  preserveMilliseconds = false,
): string | boolean {
  if (field.type === "active") return raw === undefined ? true : Boolean(raw);
  if (raw === null || raw === undefined) return field.initial ?? "";

  switch (field.type) {
    case "time":
      return String(raw).slice(11, 19);
    case "date":
      return String(raw).slice(0, 10);
    case "datetime":
      return Temporal.Instant.from(String(raw))
        .toZonedDateTimeISO(timeZone)
        .toPlainDateTime()
        .toString({ smallestUnit: preserveMilliseconds ? "millisecond" : "second" });
    case "percent":
      return String(Number(raw) * 100);
    default:
      return String(raw);
  }
}

function fieldRequestValue(field: Field, value: string | boolean, timeZone: string): unknown {
  if (field.type === "active") return Boolean(value);
  if (value === "" && field.optional) return null;

  switch (field.type) {
    case "number":
      return Number(value);
    case "percent":
      return (Number(value) / 100).toFixed(4);
    case "datetime":
      return Temporal.PlainDateTime.from(String(value))
        .toZonedDateTime(timeZone, { disambiguation: "reject" })
        .toInstant()
        .toString();
    default:
      return String(value);
  }
}

export function configurationBody(fields: Field[], values: FormValues, timeZone: string) {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    body[field.key] = fieldRequestValue(field, values[field.key], timeZone);
  }
  return body;
}
