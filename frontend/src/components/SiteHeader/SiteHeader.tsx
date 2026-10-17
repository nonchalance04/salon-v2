import { NavLink, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { SiteLogo } from "../SiteLogo";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [location]);
  return (
    <header className="site-header">
      <div className="container header-row">
        <SiteLogo />
        <nav
          className={`main-nav ${open ? "nav-open" : ""}`}
          aria-label="Main navigation"
        >
          {[
            ["/", "Home"],
            ["/services", "Services"],
            ["/about", "About Us"],
          ].map(([href, label]) => (
            <NavLink
              key={href}
              to={href}
              end
              className={({ isActive }) => isActive ? "active" : ""}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <form action="/services" className="search-box" onSubmit={(event) => {
          event.preventDefault();
          const query = new FormData(event.currentTarget).get("q")?.toString() ?? "";
          navigate(`/services?${new URLSearchParams({ q: query })}`);
        }}>
          <input
            name="q"
            aria-label="Search services"
            placeholder="Searching for something?"
          />
          <button type="submit" aria-label="Search">
            ⌕
          </button>
        </form>
        <button
          className="icon-button mobile-menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "×" : "☰"}
        </button>
      </div>
    </header>
  );
}
