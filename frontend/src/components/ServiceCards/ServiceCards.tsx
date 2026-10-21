// Bring in the tools for the service cards view so this file can work with the rest of the application.
import { Link } from "react-router";
import { money } from "../../utils/money";
import type { CatalogService } from "../../types/salon";

// Show the service menu as cards so customers can browse the available offerings.
export function ServiceCards({ services }: { services: CatalogService[] }) {
  return (
    <div className="service-grid tw:customer:grid tw:customer:grid-cols-4 tw:customer:gap-5 tw:down-1023:customer:grid-cols-2
          tw:down-639:customer:grid-cols-[1fr]">
      {services.map((service, i) => (
        <article className="service-card tw:customer:flex tw:customer:flex-col tw:customer:[&_h3]:mt-6 tw:customer:[&_p]:flex-1
          public:[border:1px_solid_#e1e2db] public:rounded-[16px] public:py-[27px] public:px-6 public:[&_p]:text-[14px]
          public:down-639:p-[25px] public:[&_p]:leading-[1.6]" key={service.id}>
          <div
            className={`service-icon tw:customer:text-[36px]  service-icon--${["scissors", "palette", "sparkles", "hand"][i % 4]}`}
            aria-hidden="true"
          >
            {["✂", "◈", "✧", "♡"][i % 4]}
          </div>
          <h3>{service.name}</h3>
          <p className="muted">
            {service.description || "Make a little time for yourself."}
          </p>
          <p className="muted">{service.durationMinutes} min</p>
          <div className="card-actions tw:customer:flex tw:customer:justify-between tw:customer:gap-5 tw:customer:items-baseline
          tw:customer:flex-wrap">
            <strong>{money(service.price)}</strong>
            <Link
              className="text-link public:font-semibold public:text-[14px] public:[border-bottom:1px_solid_#b8b9b0] public:pb-[7px]"
              to={`/booking?service=${encodeURIComponent(service.id)}`}
            >
              Book service
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
