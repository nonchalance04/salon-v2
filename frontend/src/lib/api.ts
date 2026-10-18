export type User = {
  id: string; username: string; email: string; firstName: string; lastName: string;
  role: "ADMIN" | "CASHIER"; isActive: boolean; lastLoginAt: string | null;
};
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
const sessionCheckPaths = ["/auth/login", "/auth/me", "/appointments/otp/session"];

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
