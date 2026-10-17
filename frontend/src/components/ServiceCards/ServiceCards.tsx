import { Link } from "react-router";
import { money } from "../../utils/money";
import type { CatalogService } from "../../types/salon";

export function ServiceCards({ services }: { services: CatalogService[] }) {
  return (
    <div className="service-grid">
      {services.map((service, i) => (
        <article className="service-card" key={service.id}>
          <div
            className={`service-icon service-icon--${["scissors", "palette", "sparkles", "hand"][i % 4]}`}
            aria-hidden="true"
          >
            {["✂", "◈", "✧", "♡"][i % 4]}
          </div>
          <h3>{service.name}</h3>
          <p className="muted">
            {service.description || "Make a little time for yourself."}
          </p>
          <p className="muted">{service.durationMinutes} min</p>
          <div className="card-actions">
            <strong>{money(service.price)}</strong>
            <Link
              className="text-link"
              to={`/booking?service=${encodeURIComponent(service.id)}`}
            >
              Book service ↗
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
