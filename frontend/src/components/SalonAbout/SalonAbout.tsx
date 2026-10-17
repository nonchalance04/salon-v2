import { Link } from "react-router";
import { SalonArtwork } from "../SalonArtwork";
import type { Salon } from "../../types/salon";

export function SalonAbout({ salon }: { salon: Salon | null }) {
  return (
    <section className="container about-section about-grid">
      <SalonArtwork interior />
      <div>
        <p className="eyebrow">A LITTLE ABOUT CLIQUE</p>
        <h2 className="section-title">
          Your beauty.
          <br />
          <span className="gold">Our passion.</span>
        </h2>
        <p className="muted">
          A fresh look. A little care. A moment just for you. Explore our
          services and find a time with our salon professionals.
        </p>
        <div className="values-grid">
          {[
            ["♡", "Quality Service"],
            ["✂", "Salon Professionals"],
            ["☆", "Customer Care"],
          ].map(([icon, title]) => (
            <div key={title}>
              <span className="value-icon gold">{icon}</span>
              <h3>{title}</h3>
            </div>
          ))}
        </div>
        {salon?.profile && (
          <address className="salon-contact">
            <strong>{salon.profile.name}</strong>
            {salon.profile.address && <p>{salon.profile.address}</p>}
            {salon.profile.phone && (
              <p>
                <a href={`tel:${salon.profile.phone}`}>{salon.profile.phone}</a>
              </p>
            )}
            {salon.profile.email && (
              <p>
                <a href={`mailto:${salon.profile.email}`}>
                  {salon.profile.email}
                </a>
              </p>
            )}
          </address>
        )}
        <Link className="text-link" to="/help">
          Opening hours & booking guidance →
        </Link>
      </div>
    </section>
  );
}
