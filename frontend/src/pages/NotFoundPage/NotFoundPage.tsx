// Bring in the tools for the not found page view so this file can work with the rest of the application.
import { Link } from "react-router";

// Explain that the requested page is unavailable so visitors can return to a working page.
export function NotFoundPage() {
  return (
      <section className="container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)]
          public:down-639:w-[calc(100%_-_36px)] page-section public:pt-7.5 public:pb-20 public:min-h-[65vh]
          public:down-639:pb-[45px]">
        <h1 className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">Page not found</h1>
        <Link className="text-link public:font-semibold public:text-[14px] public:[border-bottom:1px_solid_#b8b9b0] public:pb-[7px]" to="/">
          Return home
        </Link>
      </section>
    );
}
