// Read the saved booking access details so the browser can reopen the customer appointment.
export function readGuestCredentials(location: { pathname: string; hash: string }) {
  if (location.pathname === "/a" && /^[A-Za-z0-9_-]{43}$/.test(location.hash.slice(1))) {
    return { bookingCode: "", token: location.hash.slice(1) };
  }
  const params = new URLSearchParams(location.hash.slice(1));
  return { bookingCode: params.get("code") ?? "", token: params.get("token") ?? "" };
}
