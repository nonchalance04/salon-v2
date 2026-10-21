import {
  Link,
  Navigate,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthProvider";
import { Configuration } from "../../components/Configuration";
import { StaffAvailability } from "../../components/StaffAvailability/StaffAvailability";
import {
  definitions,
  type Section,
} from "../../components/Configuration/Configuration.fields";
import { AdminAppointments } from "../../components/AdminAppointments";
import { SettlementWorkspace } from "../../components/SettlementWorkspace";
import { Reports } from "../../components/Reports";
import { CashierDashboard } from "../../components/CashierDashboard";
import { AdminDashboard } from "../../components/AdminDashboard";
import type { AppointmentFilters } from "../../types/appointment-filters";
import { DashboardClock } from "../../components/DashboardClock";

type Page =
  | "dashboard"
  | "master"
  | "settings"
  | "reports"
  | "overview"
  | "appointments"
  | "payments"
  | "settlement"
  | "accounts"
  | "configuration"
  | "report-detail";
type IconName =
  | "grid"
  | "data"
  | "settings"
  | "chart"
  | "calendar"
  | "receipt"
  | "user"
  | "logout"
  | "scissors"
  | "clock"
  | "check";
const paths: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18M6 15l5-5 4 2 6-7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18M7 15h2m6 0h2m-10 3h2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 7h6M9 11h6M9 15h3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-3c0-7 16-7 16 0v3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 3H4v18h5" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="m8 8 13 13M8 16 21 3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m7 12 3 3 7-7" />
    </>
  ),
};
function Icon({ name }: { name: IconName }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
type Card = {
  title: string;
  description: string;
  icon: IconName;
  page: Page;
  section?: Section;
  kind?: string;
};
const masterCards: Card[] = [
  {
    title: "Services",
    description: "Edit treatments, pricing, and duration",
    icon: "scissors",
    page: "configuration",
    section: "services",
  },
  {
    title: "Staff / Stylists",
    description: "Manage staff, service skills, and commission rates",
    icon: "user",
    page: "configuration",
    section: "staff",
  },
  {
    title: "Staff availability",
    description: "Manage weekly schedules and temporary time off",
    icon: "calendar",
    page: "configuration",
    section: "schedules",
  },
];
const settingsCards: Card[] = [
  {
    title: "Manage Users",
    description: "Manage Admin and Cashier accounts",
    icon: "user",
    page: "accounts",
  },
  {
    title: "General Settings",
    description: "Customize salon details and contact information",
    icon: "settings",
    page: "configuration",
    section: "profile",
  },
  {
    title: "Appointment Settings",
    description: "Manage appointment fees and booking rules",
    icon: "calendar",
    page: "configuration",
    section: "policies",
  },
  {
    title: "Opening hours",
    description: "Set open days and opening and closing times",
    icon: "clock",
    page: "configuration",
    section: "hours",
  },
  {
    title: "Salon closures",
    description: "Manage temporary closures",
    icon: "calendar",
    page: "configuration",
    section: "closures",
  },
];
const reportCards: Card[] = [
  {
    title: "Sales Summary",
    description: "Review collections and payments",
    icon: "chart",
    page: "report-detail",
    kind: "payments",
  },
  {
    title: "Appointment Report",
    description: "Browse completed and upcoming client bookings",
    icon: "calendar",
    page: "report-detail",
    kind: "appointments",
  },
  {
    title: "Staff Commission Report",
    description: "Review finalized staff commissions",
    icon: "user",
    page: "report-detail",
    kind: "commissions",
  },
  {
    title: "Receipts",
    description: "Browse historical service receipts",
    icon: "receipt",
    page: "report-detail",
    kind: "receipts",
  },
];
const overviewCards: Card[] = [
  {
    title: "Appointments",
    description: "View bookings, status, and reschedule appointments",
    icon: "calendar",
    page: "appointments",
  },
  {
    title: "Service outcomes",
    description: "Record service outcomes and close visits with no performed services",
    icon: "check",
    page: "settlement",
  },
];
const adminNav: { page: Page; label: string; icon: IconName }[] = [
  { page: "dashboard", label: "Dashboard", icon: "grid" },
  { page: "master", label: "Salon Management", icon: "data" },
  { page: "settings", label: "Settings", icon: "settings" },
  { page: "reports", label: "Reports", icon: "chart" },
  { page: "overview", label: "Appointments", icon: "calendar" },
  { page: "payments", label: "Payments", icon: "receipt" },
];
const cashierNav: typeof adminNav = [
  { page: "dashboard", label: "Services", icon: "data" },
  { page: "payments", label: "Payments", icon: "receipt" },
];
const headings: Partial<Record<Page, [string, string]>> = {
  payments: ["Payments", "Collect service payments and review receipts"],
  master: ["Salon Management", "Core configurations and salon data"],
  settings: ["Settings", "Configure settings and manage system controls"],
  reports: ["Reports", "Collections and transaction history"],
  overview: ["Appointments", "Appointments and service outcomes"],
  accounts: ["Manage Users", "Workspace accounts and permissions"],
  configuration: [
    "Salon management",
    "Keep your salon’s information up to date",
  ],
  "report-detail": ["Reports", "Historical records and salon activity"],
  appointments: ["Appointments", "Review and manage salon bookings"],
  settlement: [
    "Service outcomes",
    "Record outcomes and close visits with no performed services",
  ],
};
export function WorkspaceLayout({ accounts }: { accounts: ReactNode }) {
  const { user, logout } = useAuth();
  const admin = user?.role === "ADMIN";
  const { page: routePage = "dashboard" } = useParams();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const allowedPages: Page[] = admin
    ? [
        "dashboard",
        "payments",
        "master",
        "settings",
        "reports",
        "overview",
        "appointments",
        "settlement",
        "accounts",
        "configuration",
        "report-detail",
      ]
    : ["dashboard", "payments"];
  const validPage = allowedPages.includes(routePage as Page);
  const page = (validPage ? routePage : "dashboard") as Page;
  const requestedSection = params.get("section") ?? "profile";
  const section: Section = Object.hasOwn(definitions, requestedSection)
    ? (requestedSection as Section)
    : "profile";
  const availabilitySection =
    section === "schedules" || section === "unavailability";
  const kind = params.get("kind") ?? "appointments";
  const bookingCode = params.get("code") || undefined;
  const appointmentFilters: AppointmentFilters = Object.fromEntries(
    ["from", "to", "status", "staffId", "search", "attention"].flatMap((key) =>
      params.has(key) ? [[key, params.get(key)!]] : [],
    ),
  );
  const [cashierNavigation, setCashierNavigation] = useState({
    busy: false,
    dirty: false,
  });
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (cashierNavigation.busy || cashierNavigation.dirty) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (
      !cashierNavigation.busy &&
      window.confirm("Discard unsaved changes and leave this view?")
    )
      blocker.proceed();
    else blocker.reset();
  }, [blocker, cashierNavigation.busy]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menu = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLElement>(null);
  const previousContentLocation = useRef<{
    pathname: string;
    section: string;
  } | null>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menu.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  useEffect(() => {
    if (!bookingCode) setCashierNavigation({ busy: false, dirty: false });
    setOpen(false);
    setSearch("");
    const previous = previousContentLocation.current;
    const switchingAvailabilityTabs =
      page === "configuration" &&
      availabilitySection &&
      previous?.pathname === location.pathname &&
      ["schedules", "unavailability"].includes(previous.section);
    if (!switchingAvailabilityTabs)
      content.current?.focus({ preventScroll: true });
    previousContentLocation.current = { pathname: location.pathname, section };
  }, [location.key]);
  function navigate(
    next: Page,
    code?: string,
    options: Record<string, string> = {},
  ) {
    const search = new URLSearchParams(options);
    if (code) search.set("code", code);
    void routerNavigate({
      pathname: `/staff/${next}`,
      search: search.toString(),
    });
  }
  function openAppointments(filters: AppointmentFilters) {
    navigate(
      "appointments",
      undefined,
      Object.fromEntries(
        Object.entries(filters).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
    );
  }
  function choose(card: Card) {
    navigate(card.page, undefined, {
      ...(card.section ? { section: card.section } : {}),
      ...(card.kind ? { kind: card.kind } : {}),
    });
  }
  const active =
    page === "configuration"
      ? settingsCards.some((c) => c.section === section)
        ? "settings"
        : "master"
      : page === "accounts"
        ? "settings"
        : page === "report-detail"
          ? "reports"
          : admin && ["appointments", "settlement"].includes(page)
            ? "overview"
            : page;
  const cards = admin
    ? page === "master"
      ? masterCards
      : page === "settings"
        ? settingsCards
        : page === "reports"
          ? reportCards
          : page === "overview"
            ? overviewCards
            : null
    : null;
  const heading = !admin
    ? page === "payments"
      ? ["Payments", "Collect service payments and review receipts"]
      : [
          "Services",
          "Manage arrivals, service outcomes and no-show corrections",
        ]
    : page === "configuration" && availabilitySection
      ? [
          "Staff availability",
          "Manage regular working hours and temporary absences",
        ]
      : (headings[page] ?? [
          "CLIQUE SALON AND SPA",
          "Where everything you need meets you at the best time.",
        ]);
  if (!validPage) return <Navigate to="/staff/dashboard" replace />;
  if (
    admin &&
    page === "configuration" &&
    requestedSection === "qualifications"
  ) {
    const updatedParams = new URLSearchParams(params);
    updatedParams.set("section", "staff");
    return (
      <Navigate
        to={{
          pathname: location.pathname,
          search: updatedParams.toString(),
          hash: location.hash,
        }}
        replace
      />
    );
  }
  return (
    <div
      className={`clique-workspace tw:[&_:is(h1,h2,h3,h4,h5,h6,strong,b,th,dt,dd,legend,[data-slot=card-title],[data-slot=dialog-title])]:font-bold! tw:[&_label]:font-semibold! tw:text-[#171717] tw:[font-family:Arial,Helvetica,sans-serif] tw:flex tw:min-h-screen tw:[&_h1]:[font-family:inherit] tw:[&_h2]:[font-family:inherit] tw:[&_h3]:[font-family:inherit] tw:[&_h1]:font-bold tw:[&_h2]:font-bold tw:[&_h3]:font-bold tw:[&_h1]:tracking-[normal] tw:[&_h2]:tracking-[normal] tw:[&_h3]:tracking-[normal] tw:[&_.primary]:text-[#242424] tw:[&_.config-tabs_button[aria-current]]:text-[#242424] tw:[&_.primary:hover]:[background:#c5a02a] tw:[&_:focus-visible]:[outline:3px_solid_#bd941f] tw:[&_:focus-visible]:outline-offset-1 tw:down-760:block tw:leading-[1.5]  ${admin ? "clique-admin" : "clique-cashier"}`}
    >
      <a className="clique-skip tw:fixed tw:top-[-100px] tw:left-5 tw:z-[100] tw:[background:white] tw:p-3 tw:focus:top-2.5" href="#workspace-content">
        Skip to workspace
      </a>
      <button
        ref={menu}
        className="clique-menu-toggle tw:hidden tw:down-760:block tw:down-760:fixed tw:down-760:top-[15px] tw:down-760:left-[15px]
          tw:down-760:z-[40] tw:down-760:[border:1px_solid_#ffffff35]! tw:down-760:[background:#242424]!
          tw:down-760:text-[white]! tw:down-760:py-2 tw:down-760:px-[13px] tw:down-760:text-[22px]
          tw:down-760:leading-[1.2]"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="workspace-navigation"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>
      {open && (
        <button
          className="clique-scrim tw:hidden tw:down-760:block tw:down-760:fixed tw:down-760:[inset:0] tw:down-760:[border:0]
          tw:down-760:[background:#0008]! tw:down-760:rounded-none tw:down-760:z-[30]"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`clique-sidebar tw:w-[292px] tw:[flex:0_0_292px] tw:text-[#f2f2f2] tw:[padding:20px_18px_16px] tw:flex tw:flex-col tw:sticky tw:top-0 tw:h-dvh tw:overflow-y-auto tw:[&_nav]:flex tw:[&_nav]:flex-col tw:[&_nav]:gap-3 tw:[&_nav]:mt-4.5 tw:[&_button_svg]:shrink-0 tw:[&_button:hover]:[background:#333] tw:[&_button:hover]:text-[white] tw:[&_button[aria-current]]:text-[#1b1b1b] tw:down-1100:w-[240px] tw:down-1100:[flex-basis:240px] tw:down-1100:px-3 tw:down-760:fixed tw:down-760:left-0 tw:down-760:top-0 tw:down-760:z-[35] tw:down-760:w-[280px] tw:down-760:h-dvh tw:down-760:invisible tw:down-760:pt-17.5 tw:down-760:[&.is-open]:visible ${open ? " is-open" : ""}`}
      >
        <div className="clique-brand tw:flex tw:items-center tw:gap-3 tw:[padding:8px_8px_18px] tw:mb-3.5 tw:[&_strong]:text-[20px]
          tw:[&_strong]:block tw:[&_strong]:[overflow-wrap:anywhere] tw:[&_small]:block tw:[&_small]:text-[11px]
          tw:[&_small]:text-[#c8c8c8] tw:[&_small]:tracking-[0.06em] tw:[&_small]:mt-[3px]">
          <Link className="clique-logo tw:w-14.5 tw:h-14.5 tw:shrink-0 tw:grid tw:place-items-center tw:rounded-[50%] tw:text-[white]
          tw:no-underline tw:text-[9px] tw:font-bold tw:tracking-[2px] tw:overflow-hidden tw:[&_img]:w-full
          tw:[&_img]:h-full tw:[&_img]:object-cover tw:[&_img]:block" to="/" aria-label="Clique Salon home">
            <img src="/images/logo.jpg" alt="Clique Logo" />
          </Link>
          <div>
            {/* <strong>{user?.firstName}</strong> */}
            <strong>{admin ? "ADMIN ACCOUNT" : "CASHIER ACCOUNT"}</strong>
          </div>
        </div>
        <nav aria-label={admin ? "Admin workspace" : "Cashier workspace"}>
          {(admin ? adminNav : cashierNav).map((item) => (
            <button
              key={item.page}
              aria-current={active === item.page ? "page" : undefined}
              disabled={cashierNavigation.busy}
              onClick={() => navigate(item.page)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="clique-sidebar-footer tw:mt-auto tw:pt-9 tw:grid tw:gap-2">
          {admin ? (
            <button onClick={() => navigate("accounts")}>
              <Icon name="user" />
              Account (admin)
            </button>
          ) : (
            <div className="clique-account tw:flex tw:items-center tw:flex-wrap tw:gap-2.5 tw:p-3 tw:text-[#dedede]
          tw:[&_small]:[flex-basis:100%] tw:[&_small]:pl-[33px] tw:[&_small]:text-[#bbb]">
              <Icon name="user" />
              {/* {user?.firstName} {user?.lastName} */}
              <div>Cashier Account</div>
              {/* <small>Cashier account</small> */}
            </div>
          )}
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await logout();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Unable to sign out.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon name="logout" />
            {busy ? "Signing out…" : "Log Out"}
          </button>
        </div>
      </aside>
      <div className="clique-content tw:flex-1 tw:min-w-0 tw:flex tw:flex-col">
        <header
          className={`clique-topbar tw:text-[white] tw:py-7.5 tw:px-9 tw:min-h-[146px] tw:flex tw:items-center tw:justify-between tw:gap-6 tw:[&_h1]:text-[32px] tw:[&_h1]:m-0 tw:[&_p]:[margin:10px_0_0] tw:[&_p]:text-[13px] tw:[&_p]:text-[#ccc] tw:[&.is-dashboard]:text-[#fff] tw:[&.is-dashboard_h1]:text-[27px] tw:[&.is-dashboard_p]:text-[#ccc] tw:up-1500:px-12 tw:down-1100:py-7 tw:down-1100:px-6 tw:down-1100:[&_h1]:text-[28px] tw:down-760:[padding:76px_22px_24px] tw:down-760:min-h-[170px] tw:down-760:[&_h1]:text-[25px] tw:down-760:[&.is-dashboard_h1]:text-[25px] tw:down-760:flex-wrap tw:down-760:items-start tw:down-760:[&_>_div]:[flex:1_1_240px] tw:[&_h1]:leading-[1.2] ${page === "dashboard" ? " is-dashboard" : ""}`}
        >
          <div>
            <h1>{heading[0]}</h1>
            <p>{heading[1]}</p>
          </div>
          <DashboardClock />
        </header>
        <main
          ref={content}
          id="workspace-content"
          className="clique-main tw:[padding:30px_32px_48px] tw:flex-1 tw:min-w-0 tw:[&_.eyebrow]:text-[#806612]
          tw:[&_.eyebrow]:mb-2.5 tw:[&_th]:[background:#f6f6f6] tw:[&_th]:text-[#757575] tw:[&_th]:tracking-[0.04em]
          tw:[&_td]:[border-color:#e8e8e8] tw:[&_th]:[border-color:#e8e8e8] tw:[&_.config-tabs]:[background:white]
          tw:[&_.config-tabs]:rounded-[12px] tw:[&_.config-tabs]:p-3 tw:[&_.cashier-metrics]:gap-5
          tw:[&_.cashier-metrics]:my-6 tw:[&_.cashier-metrics]:mx-0
          tw:[&_.cashier-metrics_article]:[border:1px_solid_#dedede] tw:[&_.cashier-metrics_article]:rounded-[13px]
          tw:[&_.cashier-metrics_article]:p-6.5 tw:[&_.cashier-metrics_strong]:text-[34px]
          tw:[&_.cashier-metrics_strong]:text-[#242424] tw:[&_.cashier-collections]:[background:white]
          tw:[&_.cashier-collections]:rounded-[12px] tw:[&_.cashier-search]:[background:white]
          tw:[&_.cashier-search]:rounded-[12px] tw:[&_.section-heading_h2]:mb-2 tw:up-1500:py-9 tw:up-1500:px-12
          tw:down-1100:py-6.5 tw:down-1100:px-6 tw:down-760:[padding:24px_18px_36px]
          tw:down-760:[&_.cashier-metrics]:grid-cols-[1fr] tw:down-760:[&_.cashier-metrics_article]:p-5.5
          tw:[&_.admin-action-card]:flex tw:[&_.admin-action-card]:flex-col tw:[&_.admin-action-card]:items-start
          tw:[&_.admin-action-card]:gap-3 tw:[&_.admin-action-card]:p-6 tw:[&_.admin-action-card]:text-left
          tw:[&_.admin-action-card]:[background:#fff] tw:[&_.admin-action-card]:[border:1px_solid_#ddd]
          tw:[&_.admin-action-card]:rounded-[13px] tw:[&_.admin-action-card]:[border-top:4px_solid_#d9b437]
          tw:[&_.admin-commission]:flex tw:[&_.admin-commission]:items-center tw:[&_.admin-commission]:gap-4.5
          tw:[&_.admin-commission]:w-full tw:[&_.admin-commission]:p-4.5 tw:[&_.admin-commission]:text-left
          tw:[&_.admin-commission]:[background:#f6f6f6] tw:[&_.admin-commission]:[border:1px_solid_#e3e3e3]
          tw:[&_.admin-commission]:rounded-[10px] tw:[&_.actions]:flex-wrap tw:[&_.admin-loading]:p-10
          tw:[&_.admin-loading]:[border:1px_solid_#ddd] tw:[&_.admin-loading]:rounded-[12px]
          tw:[&_.admin-loading]:[background:white]"
          tabIndex={-1}
        >
          {error && (
            <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
              {error}
            </p>
          )}
          {cards ? (
            <>
              {/* <label className="clique-search tw:flex tw:items-center tw:flex-row tw:gap-3 tw:max-w-[866px] tw:py-1.5 tw:px-5
          tw:[background:white] tw:[border:1px_solid_#dedede] tw:rounded-[999px] tw:mb-7.5 tw:text-[#6f6f6f]
          tw:[&_input]:[border:0] tw:[&_input]:[background:transparent] tw:[&_input]:py-3 tw:[&_input]:px-0
          tw:[&_input]:font-normal tw:[&_input]:text-[14px]">
                <span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Search {heading[0]}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="7" />
                  <path d="m15 15 6 6" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${heading[0].toLowerCase()}`}
                />
                input
              </label> */}
              <h2 className="clique-section-label tw:text-[18px]! tw:[margin:0_0_18px]">
                {page === "master"
                  ? "Core configurations"
                  : "Explore your workspace"}
              </h2>
              <div
                className={`clique-cards tw:grid tw:gap-4.5 tw:[&.is-grid]:grid-cols-2 tw:[&.is-list]:max-w-[1000px] tw:down-1100:[&.is-grid]:grid-cols-[1fr] tw:down-760:[&.is-grid]:grid-cols-[1fr]  ${page === "master" ? "is-grid" : "is-list"}`}
              >
                {cards
                  .filter((card) =>
                    `${card.title} ${card.description}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((card) => (
                    <button
                      className="clique-card tw:flex tw:items-center tw:gap-5.5 tw:[background:white] tw:p-7 tw:rounded-[14px] tw:min-h-[124px]
          tw:text-left tw:down-1100:gap-3.5 tw:down-1100:p-5.5 tw:down-760:p-5 tw:down-760:min-h-[110px]"
                      key={card.title}
                      onClick={() => choose(card)}
                    >
                      <span className="clique-card-icon tw:text-[#b18c1c] tw:[background:#faf5e2] tw:w-14.5 tw:h-14.5 tw:shrink-0 tw:rounded-[12px]
          tw:grid tw:place-items-center tw:[&_svg]:w-7.5 tw:[&_svg]:h-7.5">
                        <Icon name={card.icon} />
                      </span>
                      <span className="clique-card-copy tw:flex-1 tw:min-w-0 tw:[&_strong]:block tw:[&_strong]:text-[20px] tw:[&_strong]:mb-1.5
          tw:[&_strong]:font-bold tw:down-1100:[&_strong]:text-[18px]">
                        <strong>{card.title}</strong>
                        <small>{card.description}</small>
                      </span>

                    </button>
                  ))}
              </div>
              {!cards.some((card) =>
                `${card.title} ${card.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              ) && (
                <p role="status" className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">
                  No options match your search.
                </p>
              )}
            </>
          ) : (
            <>
              {admin && page !== "dashboard" && page !== "payments" && (
                <button
                  className="clique-back tw:mb-6 tw:[border:0]! tw:[background:transparent] tw:p-0 tw:text-[#75601e]! tw:text-[13px]"
                  onClick={() => navigate(active as Page)}
                >
                   Back to{" "}
                  {adminNav
                    .find((item) => item.page === active)
                    ?.label.replace("\n", " ")}
                </button>
              )}
              {page === "dashboard" && admin ? (
                <AdminDashboard
                  onAppointments={openAppointments}
                />
              ) : !admin || page === "payments" ? (
                <CashierDashboard
                  admin={admin}
                  mode={page === "payments" ? "payments" : "services"}
                  bookingCode={bookingCode}
                  onNavigate={(view, code) =>
                    navigate(
                      view === "payments"
                        ? "payments"
                        : admin
                          ? "settlement"
                          : "dashboard",
                      code,
                    )
                  }
                  onNavigationStateChange={setCashierNavigation}
                />
              ) : page === "configuration" && admin ? (
                availabilitySection ? (
                  <StaffAvailability
                    tab={section}
                    onTabChange={(next) =>
                      setParams((previous) => {
                        const updated = new URLSearchParams(previous);
                        updated.set("section", next);
                        return updated;
                      })
                    }
                    onReviewBooking={(code) =>
                      openAppointments({ search: code })
                    }
                  />
                ) : (
                  <Configuration
                    key={section}
                    initialSection={section}
                    onReviewBooking={(code) =>
                      openAppointments({ search: code })
                    }
                  />
                )
              ) : page === "accounts" && admin ? (
                accounts
              ) : page === "appointments" && admin ? (
                <AdminAppointments
                  key={JSON.stringify(appointmentFilters)}
                  initialFilters={appointmentFilters}
                />
              ) : page === "settlement" ? (
                <SettlementWorkspace
                  key={bookingCode ?? "settlement"}
                  admin={admin}
                  mode="services"
                  initialCode={bookingCode}
                  onNavigationStateChange={setCashierNavigation}
                  onBack={
                    bookingCode
                      ? () =>
                          setParams((previous) => {
                            previous.delete("code");
                            return previous;
                          })
                      : undefined
                  }
                />
              ) : (
                <Reports key={kind} admin={admin} initialKind={kind} />
              )}
            </>
          )}
        </main>
        <footer className="clique-content-footer tw:py-5 tw:px-8 tw:text-[#737373] tw:down-760:py-5 tw:down-760:px-4.5">
          Clique Salon · {admin ? "Admin" : "Cashier"} workspace
        </footer>
      </div>
    </div>
  );
}
