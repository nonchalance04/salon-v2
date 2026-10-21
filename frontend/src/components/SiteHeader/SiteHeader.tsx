// Bring in the tools for the site header view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { SiteLogo } from "../SiteLogo";

// Show public navigation so visitors can move between the salon pages.
export function SiteHeader() {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => setOpen(false), [location]);
  return (
    <header className="site-header public:[padding:36px_0_39px] public:down-1023:py-6.5 public:down-1023:px-0">
      <div className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] header-row tw:customer:flex tw:customer:items-center
          tw:customer:justify-between tw:customer:gap-5">
        <SiteLogo />
        {/* Group the page links so the user can find the next area to open. */}
        <nav
          className={`main-nav tw:customer:flex tw:customer:items-center tw:customer:justify-between tw:customer:gap-9 tw:down-639:customer:hidden public:[&_a]:text-[14px] public:[&_a]:font-semibold public:[&_a]:relative public:[&_a]:py-3.5 public:[&_a]:px-0 public:[&_a.active]:text-[#a58620] public:[&_a.active:after]:h-0.5 public:[&_a.active:after]:absolute public:[&_a.active:after]:bottom-0 public:[&_a.active:after]:left-0 public:[&_a.active:after]:right-0 public:down-639:hidden public:down-639:absolute public:down-639:top-22.5 public:down-639:left-4.5 public:down-639:right-4.5 public:down-639:[background:#fff] public:down-639:p-4.5 public:down-639:z-[20] public:down-639:rounded-[16px] public:down-639:[&.nav-open]:flex public:down-639:[&.nav-open]:justify-around public:down-639:[&.nav-open]:gap-[15px]  ${open ? "nav-open" : ""}`}
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
        {/* Group the entry fields and submit action so the user can complete this step in one place. */}
        <form action="/services" className="search-box tw:customer:flex tw:customer:items-center tw:customer:[&_input]:p-0
          tw:customer:[&_button]:[border:0] tw:customer:[&_button]:py-0 tw:customer:[&_button]:px-1
          tw:customer:[&_button]:[background:transparent] tw:down-1023:customer:hidden public:[background:white]
          public:[border:1px_solid_#e8e8e3] public:rounded-[99px] public:py-[11px] public:px-[17px] public:text-[#8b8c86]
          public:[&_input]:[background:transparent] public:[&_input]:[border:0] public:[&_input]:[outline:none]
          public:[&_input]:text-[12px] public:[&_input]:w-[182px]" onSubmit={(event) => {
          event.preventDefault();
          const query = new FormData(event.currentTarget).get("q")?.toString() ?? "";
          navigate(`/services?${new URLSearchParams({ q: query })}`);
        }}>
          <Input
            name="q"
            aria-label="Search services"
            placeholder="Searching for something?"
          />
          <Button variant="outline" type="submit" aria-label="Search">
            ⌕
          </Button>
        </form>
        <Button variant="outline"
          className="icon-button public:inline-flex public:items-center public:justify-center public:w-9.5 public:h-9.5
          public:rounded-[50%] public:[background:#fff] mobile-menu public:hidden! public:down-639:inline-flex!"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "×" : "☰"}
        </Button>
      </div>
    </header>
  );
}
