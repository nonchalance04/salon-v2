// Bring in the tools for the about page view so this file can work with the rest of the application.
import { useOutletContext } from "react-router";
import { SalonAbout } from "../../components/SalonAbout";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

// Show the salon information page so visitors can learn about the business.
export function AboutPage() {
  const { salon, error, catalogStatus } = useOutletContext<PublicContext>();
  return (
      <>
        <div className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] page-section public:pt-7.5 public:pb-20 public:min-h-[65vh]
          public:down-639:pb-[45px]">
          <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">WELCOME TO CLIQUE</p>
          <h1 className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">A little about us.</h1>
        </div>
        <SalonAbout salon={salon} />
        {error && <div className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)]">{catalogStatus}</div>}
      </>
    );
}
