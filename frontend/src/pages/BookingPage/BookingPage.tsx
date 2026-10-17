import { useLocation, useOutletContext } from "react-router";
import { PublicBooking } from "../../components/PublicBooking";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

export function BookingPage() {
  const { salon } = useOutletContext<PublicContext>();
  const location = useLocation();
  return <PublicBooking key={location.pathname + location.search} salon={salon} />;
}
