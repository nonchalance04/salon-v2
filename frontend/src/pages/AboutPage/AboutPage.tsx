import { useOutletContext } from "react-router";
import { SalonAbout } from "../../components/SalonAbout";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

export function AboutPage() {
  const { salon, error, catalogStatus } = useOutletContext<PublicContext>();
  return (
      <>
        <div className="container page-section">
          <p className="eyebrow">WELCOME TO CLIQUE</p>
          <h1 className="section-title">A little about us.</h1>
        </div>
        <SalonAbout salon={salon} />
        {error && <div className="container">{catalogStatus}</div>}
      </>
    );
}
