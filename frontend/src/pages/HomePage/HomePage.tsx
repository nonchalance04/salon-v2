import { Link, useOutletContext } from "react-router";
import { SalonArtwork } from "../../components/SalonArtwork";
import { SalonAbout } from "../../components/SalonAbout";
import { ServiceCards } from "../../components/ServiceCards";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

export function HomePage() {
  const { services, salon, catalogStatus } = useOutletContext<PublicContext>();
  return (
      <>
        <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] hero public:min-h-[495px] public:[background:#ebebe7]
          public:rounded-[22px] public:overflow-hidden public:[&_h1]:text-[clamp(42px,4.2vw,61px)]
          public:[&_h1]:[font-weight:750] public:[&_h1]:tracking-[-2.7px] public:[&_h1]:my-[23px] public:[&_h1]:mx-0
          public:down-1023:[&_h1]:text-[54px] public:down-1023:min-h-0 public:down-639:[&_h1]:text-[44px]
          public:down-639:[&_h1]:tracking-[-2px] public:[&_h1]:leading-[1.16] hero-grid tw:customer:grid
          tw:customer:grid-cols-[.88fr_1.12fr] tw:down-1023:customer:grid-cols-[1fr]">
          <div className="hero-copy tw:customer:flex tw:customer:flex-col tw:customer:items-start tw:customer:justify-center
          public:[padding:52px_45px_52px_48px] public:down-1023:p-10 public:down-639:py-[33px] public:down-639:px-[25px]">
            <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">BEAUTY. CONFIDENCE. YOU.</p>
            <h1>
              Look Good.
              <br />
              <span>Feel Amazing.</span>
            </h1>
            <p className="hero-description public:text-[16px] public:text-[#70716b] public:down-1023:[&_br]:hidden
          public:down-639:text-[15px] public:leading-[1.8]">
              Discover our professional salon services
              <br /> and book your appointment with ease.
            </p>
            <Link className="button public:[border:0] public:rounded-[99px] public:py-3.5 public:px-[23px] public:font-semibold
          public:text-[14px] button--primary public:text-[#24251f] public:hover:[background:#c8a124] hero-cta
          tw:customer:flex tw:customer:justify-center tw:customer:mt-5 public:min-w-[286px] public:down-639:min-w-0
          public:down-639:w-full public:down-639:text-[13px]" to="/booking">
              Book an Appointment
            </Link>
            <Link className="manage-link tw:customer:mt-5 public:text-[12px] public:ml-4 public:text-[#60625a]
          public:[border-bottom:1px_solid_#c6c8be] public:pb-[5px]" to="/manage">
              ▦ Manage Existing Appointment
            </Link>
          </div>
          <SalonArtwork />
        </section>
        <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] services-section public:pt-19 public:pb-20 public:down-639:pt-[49px]
          public:down-639:pb-[45px]">
          <div className="section-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-5 tw:[&_.eyebrow]:mb-2.5
          tw:[&_h2]:text-[30px] tw:down-760:items-start tw:down-760:flex-col
          tw:down-600:[.confirmed-services_&]:items-start tw:down-600:[.confirmed-services_&]:flex-col
          tw:[.admin-scheduling-grid_&]:gap-2.5 tw:[.admin-scheduling-grid_&]:flex-wrap">
            <div>
              <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">MADE FOR YOUR MOMENT</p>
              <h2 className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">Browse Services</h2>
              <p className="muted">Explore our salon services.</p>
            </div>
            <Link className="text-link public:font-semibold public:text-[14px] public:[border-bottom:1px_solid_#b8b9b0] public:pb-[7px]" to="/services">
              View all services
            </Link>
          </div>
          {catalogStatus}
          <ServiceCards services={services.slice(0, 4)} />
        </section>
        <SalonAbout salon={salon} />
      </>
    );
}
