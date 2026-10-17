import { createBrowserRouter, Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { AuthProvider } from "../contexts/AuthProvider";
import { StaffApp } from "../pages/StaffApp";
import { HomePage } from "../pages/HomePage";
import { ServicesPage } from "../pages/ServicesPage";
import { AboutPage } from "../pages/AboutPage";
import { BookingPage } from "../pages/BookingPage";
import { AppointmentPage } from "../pages/AppointmentPage";
import { HelpPage } from "../pages/HelpPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PublicSite } from "../layouts/PublicSite";

function StaffRoute() {
  return <AuthProvider><StaffApp /></AuthProvider>;
}
function NavigationEffects() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <NavigationEffects />,
    children: [
      { path: "/staff/:page?", element: <StaffRoute /> },
      { path: "/admin", element: <StaffRoute /> },
      { path: "/login", element: <StaffRoute /> },
      {
        element: <PublicSite />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "services", element: <ServicesPage /> },
          { path: "about", element: <AboutPage /> },
          ...["booking", "availability"].map(path => ({ path, element: <BookingPage /> })),
          ...["a", "appointment", "booking-confirmed", "manage", "payment", "confirmation/:reference"].map(path => ({ path, element: <AppointmentPage /> })),
          { path: "help", element: <HelpPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
