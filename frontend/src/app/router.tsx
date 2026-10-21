// Bring in the tools for page navigation so this file can work with the rest of the application.
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

// Check staff access before showing the workspace so protected pages require the appropriate account.
function StaffRoute() {
  // Show the prepared content and actions so the user can review the information and continue.
  return <AuthProvider><StaffApp /></AuthProvider>;
}
// Respond to page navigation so focus and scrolling follow the newly opened page.
function NavigationEffects() {
  const { pathname } = useLocation();
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  // Show the prepared content and actions so the user can review the information and continue.
  return <Outlet />;
}

// Map page addresses to screens so visitors and staff can open the appropriate part of the salon website.
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
