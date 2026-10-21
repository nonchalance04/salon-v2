// Describe the information used by salon requests so different parts of the application agree on its contents.
export type User = {
  id: string; username: string; email: string; firstName: string; lastName: string;
  role: "ADMIN" | "CASHIER"; isActive: boolean; lastLoginAt: string | null;
};
// Carry a safe error code and message so request failures can be explained consistently.
export class ApiError extends Error {
  status: number;
  details?: unknown;

  // function Object() { [native code] }
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
// Keep the shared values for salon requests together so later steps use the same definitions.
const sessionCheckPaths = ["/auth/login", "/auth/me", "/appointments/otp/session"];

// Announce expired staff access so the workspace can return the user to sign-in.
function notifyExpiredSession(path: string, status: number, code?: string) {
  if (code === "GUEST_SESSION_EXPIRED") {
    if (path !== "/appointments/otp/session") {
      window.dispatchEvent(new Event("guest-session-expired"));
    }
    return;
  }

  if (status === 401 && !sessionCheckPaths.includes(path)) {
    window.dispatchEvent(new Event("session-expired"));
  }
}

// Send the salon request and interpret its response so screens share the same connection and error handling.
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    notifyExpiredSession(path, response.status, result?.error?.code);
    throw new ApiError(
      response.status,
      result?.error?.message ?? "The request could not be completed.",
      result?.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
