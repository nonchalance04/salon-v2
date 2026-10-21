import { NotificationFailure } from "./notification-provider.js";

// Deliberately use only GSM-7 characters that take one septet each.
const singleSeptetText = /^[A-Za-z0-9 \n.,:;!?/&()'"-]+$/;

export function singleSegmentSms(bookingCode: string, details: string, compactDetails = details): string {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(bookingCode))
    throw new NotificationFailure("INVALID_PAYLOAD", false);
  const prefix = `Clique Salon ${bookingCode}\n`;
  for (const body of [details, compactDetails]) {
    const text = prefix + body;
    if (text.length <= 160 && singleSeptetText.test(text)) return text;
  }
  // Never silently truncate the reference, schedule, or financial meaning.
  throw new NotificationFailure("SMS_SEGMENT_LIMIT", false);
}

export function smsSchedule(startAt: Date, timeZone: string, endAt?: Date): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(startAt).map(part => [part.type, part.value]));
  const start = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  if (!endAt) return start;
  const end = Object.fromEntries(formatter.formatToParts(endAt).map(part => [part.type, part.value]));
  return `${start}-${end.hour}:${end.minute}`;
}
