// Bring in the tools for the site logo view so this file can work with the rest of the application.
import { Link } from "react-router";
import type { Salon } from "../../types/salon";

// Show the salon logo and its link so visitors can recognize the business and return home.
export function SiteLogo() {
  return (
    <Link className="logo public:inline-flex public:flex-col public:shrink-0 public:[&_span]:text-[43px]
          public:[&_span]:[font-weight:950] public:[&_span]:tracking-[-2.8px] public:[&_small]:text-[18px]
          public:[&_small]:font-bold public:[&_small]:tracking-[-0.55px] public:[&_small]:mt-[7px]
          public:[.site-footer_&_span]:text-[30px] public:[.site-footer_&_small]:text-[13px]
          public:down-639:[&_span]:text-[34px] public:down-639:[&_small]:text-[14px] public:leading-[0.87]" to="/" aria-label="Clique Salon home">
      <span>CLIQUE</span>
      <small>salon and spa</small>
    </Link>
  );
}
