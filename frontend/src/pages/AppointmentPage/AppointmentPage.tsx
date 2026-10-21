// Bring in the tools for the appointment page view so this file can work with the rest of the application.
import { useLocation, useOutletContext } from "react-router";
import { GuestAppointment } from "../../components/GuestAppointment";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

// Show customer appointment access so a visitor can find and manage an existing booking.
export function AppointmentPage() {
  const { salon } = useOutletContext<PublicContext>();
  const { pathname } = useLocation();
  const checkoutReturn = ["/booking-confirmed", "/appointment"].includes(
    pathname.replace(/\/$/, ""),
  );
  // Show the prepared content and actions so the user can review the information and continue.
  return <GuestAppointment embedded salon={salon} checkoutReturn={checkoutReturn} />;
}
