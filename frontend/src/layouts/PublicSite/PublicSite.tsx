// Bring in the tools for the public site view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import "./PublicSite.css";
import "../../components/PublicBooking/PublicBooking.css";
import "../../components/AppointmentView/AppointmentView.css";
import "../../components/PhoneInput/PhoneInput.css";
import "../../components/ProfessionalPicker/ProfessionalPicker.css";
import { Link, Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { ChatbotWidget } from "../../components/ChatbotWidget";
import { SiteLogo } from "../../components/SiteLogo";
import { SiteHeader } from "../../components/SiteHeader";
import type { CatalogService, Salon } from "../../types/salon";
import type { PublicContext } from "./PublicSite.context";

// Choose a readable error message so the screen can explain what went wrong.
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

// Load shared salon information and frame the public pages so visitors have consistent navigation and content.
export function PublicSite() {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [services, setServices] = useState<CatalogService[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Load the saved information so the screen can show current salon records.
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [catalog, profile] = await Promise.all([
        api<{ services: CatalogService[] }>("/services"),
        api<Salon>("/salon"),
      ]);
      setServices(catalog.services);
      setSalon(profile);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => {
    void load();
  }, []);
  const { pathname: path } = useLocation();
  const catalogStatus = (
    <>
      {loading && <p role="status">Loading salon services…</p>}
      {error && (
        <p className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]" role="alert">
          {error} <Button variant="outline" onClick={() => void load()}>Retry</Button>
        </p>
      )}
      {!loading && !error && !services.length && (
        <p className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">
          No services are available for online booking yet.
        </p>
      )}
    </>
  );
  return (
    <div className="customer-site tw:[&_:is(h1,h2,h3,h4,h5,h6,strong,b,th,dt,dd,legend,[data-slot=card-title],[data-slot=dialog-title])]:font-bold! tw:[&_label]:font-semibold! tw:[&_.reservation-status--confirmed]:[background:#e9f1e8]
          tw:[&_.reservation-status--completed]:[background:#e9f1e8]
          tw:[&_.reservation-status--confirmed]:[border-color:#d1e0cf]
          tw:[&_.reservation-status--completed]:[border-color:#d1e0cf]
          tw:[&_.reservation-status--confirmed]:text-[#3e6245] tw:[&_.reservation-status--completed]:text-[#3e6245]
          tw:[&_.reservation-status--expired]:[background:#f1eeeb]
          tw:[&_.reservation-status--cancelled]:[background:#f1eeeb]
          tw:[&_.reservation-status--no_show]:[background:#f1eeeb]
          tw:[&_.reservation-status--expired]:[border-color:#e2dbd6]
          tw:[&_.reservation-status--cancelled]:[border-color:#e2dbd6]
          tw:[&_.reservation-status--no_show]:[border-color:#e2dbd6] tw:[&_.reservation-status--expired]:text-[#755b53]
          tw:[&_.reservation-status--cancelled]:text-[#755b53] tw:[&_.reservation-status--no_show]:text-[#755b53]
          tw:[&_.reservation-access_label]:block tw:[&_.reservation-access_label]:text-[12px]
          tw:[&_.reservation-access_label]:font-semibold tw:[&_.reservation-access_label]:mt-5
          tw:[&_.reservation-access_input]:block tw:[&_.reservation-access_input]:w-full
          tw:[&_.reservation-access_input]:min-w-0 tw:[&_.reservation-access_input]:[margin:8px_0_0]
          tw:[&_.reservation-access_input]:p-3 tw:[&_.reservation-access_input]:[background:#f8f8f5]
          tw:[&_.reservation-access_input]:text-[12px] tw:[&_.reservation-access_input]:font-normal
          tw:[&_.reservation-management_p]:text-[13px] tw:[&_.reservation-management_p]:text-[#73756f]
          tw:[&_.reservation-management_button]:text-[12px] tw:[&_.reservation-management_button]:rounded-[9px]
          tw:[&_.reservation-management_button]:[margin:4px_8px_4px_0]
          tw:[&_.reservation-management_fieldset]:[border:1px_solid_#e0e0d7]
          tw:[&_.reservation-management_fieldset]:rounded-[10px] tw:[&_.reservation-management_fieldset]:my-4
          tw:[&_.reservation-management_fieldset]:mx-0 tw:[&_.reservation-management_fieldset]:p-4
          tw:[&_.reservation-management_fieldset]:min-w-0 tw:[&_.reservation-management_legend]:text-[12px]
          tw:[&_.reservation-management_legend]:font-semibold tw:[&_.reservation-management_legend]:py-0
          tw:[&_.reservation-management_legend]:px-1.5 tw:[&_.reservation-management_label]:text-[12px]
          tw:[&_.reservation-management_textarea]:max-w-full tw:[&_.reservation-management_select]:max-w-full
          tw:[&_.reservation-management_input]:max-w-full tw:[&_.reservation-management_textarea]:w-full
          tw:[&_.reservation-management_select]:w-full tw:[&_.reservation-management_input]:w-full
          tw:[&_.reservation-management_textarea]:[background:white]
          tw:[&_.reservation-management_select]:[background:white]
          tw:[&_.reservation-management_input]:[background:white] tw:[&_.reservation-management_textarea]:p-2.5
          tw:[&_.reservation-management_select]:p-2.5 tw:[&_.reservation-management_input]:p-2.5 tw:min-h-screen
          tw:[background:#f3f3f1] tw:text-[#292a28] tw:font-sans tw:[&_h1]:[font-family:inherit]
          tw:[&_h2]:[font-family:inherit] tw:[&_h3]:[font-family:inherit] tw:[&_h1]:font-bold tw:[&_h2]:font-bold
          tw:[&_h3]:font-bold tw:[&_h1]:tracking-[-.03em] tw:[&_h2]:tracking-[-.03em] tw:[&_h3]:tracking-[-.03em]
          tw:[&_h3]:text-[20px] tw:[&_h3]:mb-3 tw:[&_.primary]:[background:#d3ae30] tw:[&_.primary]:text-[#292a28]
          tw:[&_.primary]:[border-color:#d3ae30] tw:[&_.primary]:rounded-[99px]
          tw:[&_.primary:hover]:[background:#c8a124] tw:[&_.account-form]:[background:white]
          tw:[&_.account-form]:[border:1px_solid_#ddddd7] tw:[&_.account-form]:rounded-[20px]
          tw:down-760:[&_.section-heading]:flex-col tw:down-760:[&_.section-heading]:items-start
          tw:[&_.portrait-tone-1]:[background:#e6ddd1] tw:[&_.portrait-tone-1]:text-[#655b52]
          tw:[&_.portrait-tone-2]:[background:#e1e7e1] tw:[&_.portrait-tone-2]:text-[#46594d]
          tw:[&_.portrait-tone-3]:[background:#eee2d9] tw:[&_.portrait-tone-3]:text-[#74594d]
          tw:[&_.sample-profile-label]:inline-block tw:[&_.sample-profile-label]:[background:#f5f0df]
          tw:[&_.sample-profile-label]:text-[#85702f] tw:[&_.sample-profile-label]:text-[10px]
          tw:[&_.sample-profile-label]:font-semibold tw:[&_.sample-profile-label]:py-1
          tw:[&_.sample-profile-label]:px-2.5 tw:[&_.sample-profile-label]:rounded-[20px]
          tw:[&_.portfolio-art-1]:[background:#e0e6dd] tw:[&_.portfolio-art-1]:text-[#6b7c62]
          tw:[&_.portfolio-art-2]:[background:#eddfd6] tw:[&_.portfolio-art-2]:text-[#9b7562]
          tw:[&_.profile-sample-note]:text-[10px] tw:[&_.profile-sample-note]:text-[#73756f]
          tw:[&_.profile-sample-note]:[border-top:1px_solid_#e9e9e2] tw:[&_.profile-sample-note]:[margin:24px_0_18px]
          tw:[&_.profile-sample-note]:pt-4 tw:leading-[1.5] tw:[&_.profile-sample-note]:leading-[1.7]">
      <a className="skip-link public:fixed public:top-[-100px] public:left-5 public:[background:#fff] public:p-3.5 public:z-[50]
          public:focus:top-2.5" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main"><Outlet context={{ salon, services, loading, error, catalogStatus } satisfies PublicContext} /></main>
      {/* Show the closing information and links so visitors can find the remaining salon details. */}
      <footer className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] site-footer public:[border-top:1px_solid_#d4d5ce] public:py-7
          public:[&_p]:text-[12px] public:[&_>_a]:text-[12px] public:down-639:py-[25px] footer-row tw:customer:flex
          tw:customer:items-center tw:customer:justify-between tw:customer:gap-5 tw:customer:[&_>_div]:flex
          tw:customer:[&_>_div]:gap-6 tw:down-639:customer:flex-col">
        <SiteLogo />
        <p>
          © {new Date().getFullYear()} {salon?.profile?.name || "Clique Salon"}
        </p>
        <div>
          <Link to="/help">Salon guide </Link>
          <Link to="/staff">Staff sign in </Link>
        </div>
      </footer>
      {path !== "/help" && <ChatbotWidget />}
    </div>
  );
}
