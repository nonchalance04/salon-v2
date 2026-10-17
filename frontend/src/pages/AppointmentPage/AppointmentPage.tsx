import { useLocation, useOutletContext } from "react-router";
import { GuestAppointment } from "../../components/GuestAppointment";
import type { PublicContext } from "../../layouts/PublicSite/PublicSite.context";

export function AppointmentPage() {
  const { salon } = useOutletContext<PublicContext>();
  const { pathname } = useLocation();
  const checkoutReturn = ["/booking-confirmed", "/appointment"].includes(
    pathname.replace(/\/$/, ""),
  );
  return <GuestAppointment embedded salon={salon} checkoutReturn={checkoutReturn} />;
}
