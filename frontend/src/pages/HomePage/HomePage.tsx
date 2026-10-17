import { Link, useOutletContext } from "react-router";
import { SalonArtwork } from "../../components/SalonArtwork";
import { SalonAbout } from "../../components/SalonAbout";
import { ServiceCards } from "../../components/ServiceCards";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

export function HomePage() {
  const { services, salon, catalogStatus } = useOutletContext<PublicContext>();
  return (
      <>
        <section className="container hero hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">BEAUTY. CONFIDENCE. YOU.</p>
            <h1>
              Look Good.
              <br />
              <span>Feel Amazing.</span>
            </h1>
            <p className="hero-description">
              Discover our professional salon services
              <br /> and book your appointment with ease.
            </p>
            <Link className="button button--primary hero-cta" to="/booking">
              Book an Appointment <span>→</span>
            </Link>
            <Link className="manage-link" to="/manage">
              ▦ Manage Existing Appointment
            </Link>
          </div>
          <SalonArtwork />
        </section>
        <section className="container services-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MADE FOR YOUR MOMENT</p>
              <h2 className="section-title">Browse Services</h2>
              <p className="muted">Explore our salon services.</p>
            </div>
            <Link className="text-link" to="/services">
              View all services →
            </Link>
          </div>
          {catalogStatus}
          <ServiceCards services={services.slice(0, 4)} />
        </section>
        <SalonAbout salon={salon} />
      </>
    );
}
