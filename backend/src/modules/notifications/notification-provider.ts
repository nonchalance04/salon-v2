// Describe the information used by customer notifications so different parts of the application agree on its contents.
export type NotificationMessage = {
  id: string;
  channel: "EMAIL" | "SMS";
  recipient: string;
  subject: string;
  text: string;
  html?: string;
};

export interface NotificationProvider {
  send(message: NotificationMessage, signal: AbortSignal): Promise<void>;
}

// Only controlled codes are persisted. Provider responses can contain contact data
// and credentials and must never be copied to queue errors or operational logs.
export class NotificationFailure extends Error {
  // function Object() { [native code] }
  constructor(public readonly code: string, public readonly retryable = true) {
    super(code);
  }
}

// Provide a controllable message sender so notification behavior can be checked without live delivery.
export function createTestNotificationProvider(onSend: (message: NotificationMessage) => void = () => {}): NotificationProvider {
  return { async send(message) { onSend(message); } };
}

// Normalize the SMS destination so the message provider receives a supported phone number.
export function smsRecipient(value: string) {
  const normalized = value.replace(/[\s()-]/g, "");
  const international = /^09\d{9}$/.test(normalized) ? `+63${normalized.slice(1)}` : normalized;
  if (!/^\+[1-9]\d{7,14}$/.test(international)) throw new NotificationFailure("INVALID_RECIPIENT", false);
  return international;
}

// Prepare the TextBee message sender so queued salon texts can reach customer phones.
export function createTextBeeProvider(apiKey: string, deviceId: string, request: typeof fetch = fetch): NotificationProvider {
  return { async send(message, signal) {
    if (message.channel !== "SMS") throw new NotificationFailure("CHANNEL_MISMATCH", false);
    let response: Response;
    try {
      response = await request("https://api.textbee.dev/api/v1/gateway/send-sms", {
        method: "POST", signal, redirect: "error",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ deviceId, recipients: [smsRecipient(message.recipient)], message: message.text }),
      });
    } catch (error) {
      if (error instanceof NotificationFailure) throw error;
      throw new NotificationFailure("PROVIDER_UNAVAILABLE");
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new NotificationFailure(`PROVIDER_HTTP_${response.status}`, response.status === 408 || response.status === 429 || response.status >= 500);
    }
    const body = await response.json().catch(() => null);
    if (body?.data?.success !== true || typeof body.data.smsBatchId !== "string" || !body.data.smsBatchId) {
      throw new NotificationFailure("INVALID_PROVIDER_RESPONSE");
    }
    // Queue acceptance is not handset delivery. Do not automatically retry OTP
    // sends: an ambiguous timeout may already have queued the original code.
  } };
}
