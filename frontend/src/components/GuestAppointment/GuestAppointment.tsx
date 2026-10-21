import { Button } from "@/components/ui/Button";
import { readGuestCredentials } from "../../utils/guest-credentials";
import { Link, useLocation, useNavigate } from "react-router";
import { AppointmentOtp } from "../AppointmentOtp";
import { useEffect, useRef, useState } from "react";
import { CheckoutReturn } from "../CheckoutReturn";
import { PaymentReturnIndicator } from "../CheckoutReturn/PaymentReturnIndicator";
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
  const [showReturnAnimation, setShowReturnAnimation] = useState(checkoutReturn);
  useEffect(() => {
    if (!checkoutReturn) {
      setShowReturnAnimation(false);
      return;
    }
    setShowReturnAnimation(true);
    const timer = window.setTimeout(() => setShowReturnAnimation(false), 1_000);
    return () => window.clearTimeout(timer);
  }, [checkoutReturn]);
  const [result, setResult] = useState<Appointment | null>(null);
  const [token, setToken] = useState(credentials.token);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestGeneration = useRef(0);
  function returnHome() {
    void api("/appointments/otp/logout", { method: "POST" })
      .then(() => navigate("/"))
      .catch((err) => setError(message(err)));
  }
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

  if (checkoutReturn && showReturnAnimation) return <PaymentReturnIndicator />;

  if (restoring || restoreError) return (
    <section className={embedded ? "guest-appointment container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)] public:down-639:w-[calc(100%_-_36px)]  page-section public:pt-7.5 public:pb-20 public:min-h-[65vh] public:down-639:pb-[45px] " : "workspace-main tw:max-w-[1200px] tw:m-auto tw:[padding:60px_32px_80px] tw:[&>h1]:text-[46px] tw:[&>h1]:mb-2 tw:down-760:py-9.5 tw:down-760:px-5 tw:down-760:[&>h1]:text-[38px]  availability-page tw:max-w-[1000px] "} aria-labelledby="appointment-restore-title">
      <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">YOUR VISIT</p>
      <h1 id="appointment-restore-title" className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">
        {checkoutReturn ? "Checking your payment…" : "Loading your appointment…"}
      </h1>
      {restoreError ? <>
        <p className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]" role="alert">{restoreError}</p>
        <div className="actions tw:flex tw:gap-3">
          <Button variant="outline" type="button" onClick={() => setRestoreAttempt(value => value + 1)}>Try again</Button>
          <Button variant="outline" type="button" onClick={() => setRestoreError("")}>Verify booking details</Button>
        </div>
      </> : <p role="status">Please wait while we restore your appointment securely.</p>}
    </section>
  );

  return (
    <div
      className={
        embedded ? "guest-appointment container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)] public:down-639:w-[calc(100%_-_36px)]  page-section public:pt-7.5 public:pb-20 public:min-h-[65vh] public:down-639:pb-[45px] " : "workspace tw:[&_header]:py-6 tw:[&_header]:px-[5vw] tw:[&_header]:[border-bottom:1px_solid_#dce0d8] tw:[&_header]:flex tw:[&_header]:justify-between tw:[&_header]:items-center tw:[&_header]:[background:#fff] tw:[&_header_.wordmark]:text-[23px] tw:down-760:[&_header]:p-5 "
      }
    >
      {!embedded && (
        <header>
          <Link className="wordmark tw:text-[27px] tw:tracking-[.16em] tw:no-underline tw:font-semibold tw:inline-flex tw:flex-col
          tw:[&_span]:text-[10px] tw:[&_span]:tracking-[.5em] tw:[&_span]:mt-1.5 tw:[.intro_&]:self-start
          tw:leading-[1.2]" to="/availability">
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
            : "workspace-main tw:max-w-[1200px] tw:m-auto tw:[padding:60px_32px_80px] tw:[&>h1]:text-[46px] tw:[&>h1]:mb-2 tw:down-760:py-9.5 tw:down-760:px-5 tw:down-760:[&>h1]:text-[38px]  availability-page tw:max-w-[1000px] "
        }
      >
        {!result && (
          <>
            <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">YOUR VISIT</p>
            <h1 className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">Your appointment</h1>
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
              onBackHome={!token ? returnHome : undefined}
            />}
            {!token && result.status !== "CONFIRMED" && (
              <Button variant="outline"
                type="button"
                onClick={returnHome}
              >
                Back to home
              </Button>
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
            {busy && <>
              <p role="status">{checkoutReturn ? "Checking your payment…" : "Loading your appointment…"}</p>
            </>}
            <p className="muted">
              After PayMongo checkout, your appointment restores automatically
              on this browser. If your session has expired, verify your email or
              phone number above.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
