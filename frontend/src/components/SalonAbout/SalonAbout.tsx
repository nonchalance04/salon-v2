// Bring in the tools for the salon about view so this file can work with the rest of the application.
import { Link } from "react-router";
import { SalonArtwork } from "../SalonArtwork";
import type { Salon } from "../../types/salon";

// Show the salon introduction and contact details so visitors can learn about the business.
export function SalonAbout({ salon }: { salon: Salon | null }) {
  return (
    <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] about-section public:pt-5.5 public:pb-22 public:down-639:pb-[45px]
          about-grid tw:customer:grid tw:customer:grid-cols-[1fr_1fr] tw:customer:gap-17.5 tw:customer:items-center
          tw:down-1023:customer:grid-cols-[1fr]">
      <SalonArtwork interior />
      <div>
        <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">A LITTLE ABOUT CLIQUE</p>
        <h2 className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">
          Your beauty.
          <br />
          <span className="gold">Our passion.</span>
        </h2>
        <p className="muted">
          A fresh look. A little care. A moment just for you. Explore our
          services and find a time with our salon professionals.
        </p>
        <div className="values-grid tw:customer:grid tw:customer:grid-cols-[repeat(3,1fr)] tw:customer:gap-5 tw:customer:my-7.5
          tw:customer:mx-0 tw:customer:[&_h3]:text-[15px] tw:down-639:customer:gap-3">
          {[
            ["♡", "Quality Service"],
            ["✂", "Salon Professionals"],
            ["☆", "Customer Care"],
          ].map(([icon, title]) => (
            <div key={title}>
              <span className="value-icon tw:customer:text-[30px] gold">{icon}</span>
              <h3>{title}</h3>
            </div>
          ))}
        </div>
        {salon?.profile && (
          <address className="salon-contact tw:customer:not-italic tw:customer:my-5 tw:customer:mx-0 tw:customer:[&_p]:my-1.5
          tw:customer:[&_p]:mx-0">
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
        <Link className="text-link public:font-semibold public:text-[14px] public:[border-bottom:1px_solid_#b8b9b0] public:pb-[7px]" to="/help">
          Opening hours & booking guidance
        </Link>
      </div>
    </section>
  );
}
