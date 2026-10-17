import { Link } from "react-router";

export function NotFoundPage() {
  return (
      <section className="container page-section">
        <h1 className="section-title">Page not found</h1>
        <Link className="text-link" to="/">
          Return home
        </Link>
      </section>
    );
}
