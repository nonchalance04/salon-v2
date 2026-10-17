import { Input } from "@/components/ui/Input";
import { useOutletContext, useSearchParams } from "react-router";
import { ServiceCards } from "../../components/ServiceCards";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

export function ServicesPage() {
  const { services, loading, error, catalogStatus } = useOutletContext<PublicContext>();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const setQuery = (q: string) => setParams(previous => { previous.set("q", q); return previous; }, { replace: true });
  return (
      <section className="container page-section">
        <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
        <h1 className="section-title">Our Services</h1>
        <p className="muted">
          A fresh look. A little care. A moment just for you.
        </p>
        <label className="catalog-search">
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
            <p className="empty-state">
              No matching services. Try another search.
            </p>
          )}
      </section>
    );
}
