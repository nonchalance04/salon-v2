import { readGuestCredentials } from "../../utils/guest-credentials";
import { Link, useLocation, useNavigate } from "react-router";
import { AppointmentOtp } from "../AppointmentOtp";
import { useEffect, useRef, useState } from "react";
import { CheckoutReturn } from "../CheckoutReturn";
import { api, ApiError } from "../../lib/api";
import type { Salon } from "../../types/salon";
import { AppointmentView } from "../AppointmentView";
import type { Appointment } from "../../types/booking";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function GuestAppointment({
  embedded = false,
  salon = null,
  checkoutReturn = false,
}: { embedded?: boolean; salon?: Salon | null; checkoutReturn?: boolean } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState(() =>
    readGuestCredentials(location),
  );
  const firstLocation = useRef(true);
  const [restoring, setRestoring] = useState(!credentials.token);
  const [restoreError, setRestoreError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [checkoutResolved, setCheckoutResolved] = useState(false);
  const [result, setResult] = useState<Appointment | null>(null);
  const [token, setToken] = useState(credentials.token);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestGeneration = useRef(0);
  useEffect(() => {
    const expired = () => {
      requestGeneration.current++;
      setResult(null);
      setCheckoutResolved(false);
      setRestoreError("");
      setToken("");
      setCredentials({ bookingCode: "", token: "" });
      setError(
        "Your session expired. Verify your email or phone number again.",
      );
    };
    window.addEventListener("guest-session-expired", expired);
    return () => window.removeEventListener("guest-session-expired", expired);
  }, []);
  async function retrieve(bookingCode: string, accessToken: string) {
    const generation = ++requestGeneration.current;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await api<{ appointment: Appointment }>(
        bookingCode ? "/appointments/access" : "/appointments/link",
        {
          method: "POST",
          body: JSON.stringify(
            bookingCode
              ? { bookingCode, token: accessToken }
              : { token: accessToken },
          ),
        },
      );
      if (generation === requestGeneration.current) {
        setToken(accessToken);
        setResult(response.appointment);
      }
    } catch (err) {
      if (generation === requestGeneration.current) setError(message(err));
    } finally {
      if (generation === requestGeneration.current) setBusy(false);
    }
  }
  useEffect(() => {
    const initial = firstLocation.current;
    firstLocation.current = false;
    const next = readGuestCredentials(location);
    if (!next.token && !new URLSearchParams(location.hash.slice(1)).has("code"))
      return;
    requestGeneration.current++;
    setResult(null);
    setCheckoutResolved(false);
    setToken("");
    setError("");
    setBusy(false);
    if (!initial) setCredentials(next);
    // Keep private tokens in memory and remove the fragment before API use.
    navigate("/appointment", { replace: true });
  }, [location.pathname, location.hash, navigate]);
  useEffect(
    () => () => {
      requestGeneration.current++;
    },
    [],
  );
  useEffect(() => {
    if (credentials.token)
      void retrieve(credentials.bookingCode, credentials.token);
  }, [credentials]);
  useEffect(() => {
    if (credentials.token) {
      setRestoring(false);
      return;
    }
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    setRestoring(true);
    setRestoreError("");
    void api<{ appointment: Appointment }>("/appointments/otp/session", { signal: controller.signal })
      .then(({ appointment }) => {
        if (generation !== requestGeneration.current) return;
        setToken("");
        setResult(appointment);
        setError("");
      })
      .catch(err => {
        if (controller.signal.aborted || generation !== requestGeneration.current) return;
        if (!(err instanceof ApiError && err.status === 401)) {
          setRestoreError("We couldn’t restore your appointment. Please try again or verify your booking details.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && generation === requestGeneration.current) setRestoring(false);
      });
    return () => { controller.abort(); };
  }, [credentials, restoreAttempt]);

  if (restoring || restoreError) return (
    <section className={embedded ? "guest-appointment container page-section" : "workspace-main availability-page"} aria-labelledby="appointment-restore-title">
      <p className="eyebrow">YOUR VISIT</p>
      <h1 id="appointment-restore-title" className="section-title">
        {checkoutReturn ? "Checking your payment…" : "Loading your appointment…"}
      </h1>
      {restoreError ? <>
        <p className="error" role="alert">{restoreError}</p>
        <div className="actions">
          <button type="button" onClick={() => setRestoreAttempt(value => value + 1)}>Try again</button>
          <button type="button" onClick={() => setRestoreError("")}>Verify booking details</button>
        </div>
      </> : <p role="status">Please wait while we restore your appointment securely.</p>}
    </section>
  );

  return (
    <div
      className={
        embedded ? "guest-appointment container page-section" : "workspace"
      }
    >
      {!embedded && (
        <header>
          <Link className="wordmark" to="/availability">
            CLIQUE<span>SALON</span>
          </Link>
          <Link to="/availability">Find a salon time</Link>
          <Link to="/help">Salon help</Link>
        </header>
      )}
      <section
        className={
          embedded
            ? `manage-panel${result ? " reservation-page" : ""}`
            : "workspace-main availability-page"
        }
      >
        {!result && (
          <>
            <p className="eyebrow">YOUR VISIT</p>
            <h1 className="section-title">Your appointment</h1>
          </>
        )}
        {result ? (
          <>
            {checkoutReturn && result.status === "PENDING_PAYMENT" && !checkoutResolved ? (
              <CheckoutReturn
                key={result.bookingCode}
                appointment={result}
                token={token}
                onResolved={appointment => { setResult(appointment); setCheckoutResolved(true); }}
              />
            ) : <AppointmentView
              key={result.bookingCode}
              initial={result}
              token={token}
              salon={salon}
            />}
            {!token && (
              <button
                type="button"
                onClick={() => {
                  void api("/appointments/otp/logout", { method: "POST" })
                    .then(() => {
                      navigate("/");
                    })
                    .catch((err) => setError(message(err)));
                }}
              >
                Back to home
              </button>
            )}
          </>
        ) : (
          <>
            {(!credentials.token || Boolean(error)) && (
              <AppointmentOtp
                restoreSession={Boolean(credentials.token)}
                onVerified={(appointment) => {
                  requestGeneration.current++;
                  setToken("");
                  setResult(appointment);
                  setError("");
                }}
              />
            )}
            {busy && <p role="status">Loading your appointment…</p>}
            <p className="muted">
              After PayMongo checkout, your appointment restores automatically
              on this browser. If your session has expired, verify your email or
              phone number above.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
