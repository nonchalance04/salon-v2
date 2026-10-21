// Bring in the tools for the booking page view so this file can work with the rest of the application.
import { useLocation, useOutletContext } from "react-router";
import { PublicBooking } from "../../components/PublicBooking";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

// Show the booking flow so a visitor can reserve a salon appointment.
export function BookingPage() {
  const { salon } = useOutletContext<PublicContext>();
  const location = useLocation();
  // Show the prepared content and actions so the user can review the information and continue.
  return <PublicBooking key={location.pathname + location.search} salon={salon} />;
}
