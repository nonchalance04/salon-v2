// Bring in the tools for the services page view so this file can work with the rest of the application.
import { Input } from "@/components/ui/Input";
import { useOutletContext, useSearchParams } from "react-router";
import { ServiceCards } from "../../components/ServiceCards";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

// Show the service catalog and filters so visitors can find an offering they want to book.
export function ServicesPage() {
  const { services, loading, error, catalogStatus } = useOutletContext<PublicContext>();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  // Update the service search in the page address so the selected filter can be revisited.
  const setQuery = (q: string) => setParams(previous => { previous.set("q", q); return previous; }, { replace: true });
  return (
      <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] page-section public:pt-7.5 public:pb-20 public:min-h-[65vh]
          public:down-639:pb-[45px]">
        <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">FIND YOUR NEXT FAVORITE</p>
        <h1 className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">Our Services</h1>
        <p className="muted">
          A fresh look. A little care. A moment just for you.
        </p>
        <label className="catalog-search tw:customer:max-w-[400px] tw:customer:my-7.5 tw:customer:mx-0">
          Search services
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services"
          />
        </label>
        {catalogStatus}
        <ServiceCards
          services={services.filter((s) =>
            s.name.toLowerCase().includes(query.toLowerCase()),
          )}
        />
        {!loading &&
          !error &&
          services.length > 0 &&
          !services.some((s) =>
            s.name.toLowerCase().includes(query.toLowerCase()),
          ) && (
            <p className="empty-state public:py-10 public:px-6.5 public:[border:1px_dashed_#c8cbc0] public:rounded-[15px]
          public:text-center tw:p-7.5 tw:[border:1px_dashed_#bac8bc] tw:rounded-[10px] tw:text-[#64736b]">
              No matching services. Try another search.
            </p>
          )}
      </section>
    );
}
