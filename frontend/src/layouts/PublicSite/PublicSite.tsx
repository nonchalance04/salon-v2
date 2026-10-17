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

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function PublicSite() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  useEffect(() => {
    void load();
  }, []);
  const { pathname: path } = useLocation();
  const catalogStatus = (
    <>
      {loading && <p role="status">Loading salon services…</p>}
      {error && (
        <p className="error" role="alert">
          {error} <button onClick={() => void load()}>Retry</button>
        </p>
      )}
      {!loading && !error && !services.length && (
        <p className="empty-state">
          No services are available for online booking yet.
        </p>
      )}
    </>
  );
  return (
    <div className="customer-site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main"><Outlet context={{ salon, services, loading, error, catalogStatus } satisfies PublicContext} /></main>
      <footer className="container site-footer footer-row">
        <SiteLogo />
        <p>
          © {new Date().getFullYear()} {salon?.profile?.name || "Clique Salon"}
        </p>
        <div>
          <Link to="/help">Salon guide ↗</Link>
          <Link to="/staff">Staff sign in ↗</Link>
        </div>
      </footer>
      {path !== "/help" && <ChatbotWidget />}
    </div>
  );
}
