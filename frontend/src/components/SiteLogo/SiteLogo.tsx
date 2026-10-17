import { Link } from "react-router";
import type { Salon } from "../../types/salon";

export function SiteLogo() {
  return (
    <Link className="logo" to="/" aria-label="Clique Salon home">
      <span>CLIQUE</span>
      <small>salon and spa</small>
    </Link>
  );
}
