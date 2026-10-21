// Bring in the tools for the service category picker view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Show service categories and their menu so customers can narrow down the offerings.
export function ServiceCategoryPicker({ categories, active, onSelect }: {
  categories: string[]; active: string; onSelect: (category: string) => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const categoryKey = JSON.stringify(categories);
  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const pills = Array.from(tabs.querySelectorAll<HTMLButtonElement>("button"));
    // Measure the category control so its open menu can be positioned beside it.
    function measure() {
      const available = tabs!.clientWidth;
      const gap = Number.parseFloat(getComputedStyle(tabs!).columnGap) || 0;
      let used = 0;
      let count = 0;
      for (const pill of pills) {
        const next = used + (count ? gap : 0) + pill.getBoundingClientRect().width;
        if (next > available) break;
        used = next;
        count++;
      }
      setVisibleCount(count);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    pills.forEach(pill => observer.observe(pill));
    return () => observer.disconnect();
  }, [categoryKey]);
  // Listen for relevant browser actions while this view is open so it responds when the user returns or interacts.
  useEffect(() => {
    if (!open) return;
    activeRef.current?.focus();
    // Close the category menu when appropriate so it does not remain open after the user moves away.
    function dismiss(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  // Show the prepared content and actions so the user can review the information and continue.
  return <nav className="service-categories tw:customer:flex tw:customer:items-center tw:customer:gap-3 tw:customer:[margin:0_0_26px]
          tw:customer:relative tw:customer:z-[2] tw:customer:min-w-0
          tw:customer:[&_button:focus-visible]:[outline:2px_solid_#85702f]
          tw:customer:[&_button:focus-visible]:outline-offset-[3px]" aria-label="Service categories">
    <div className="service-category-tabs tw:customer:flex-1 tw:customer:flex tw:customer:items-center tw:customer:gap-2.5
          tw:customer:min-w-0 tw:customer:relative tw:down-480:customer:gap-2" ref={tabsRef}>{categories.map((category, index) => <Button variant="outline"
      key={category} type="button" className={`service-category-pill tw:customer:flex-none tw:customer:flex tw:customer:items-center tw:customer:justify-center tw:customer:w-max tw:customer:min-h-11 tw:customer:whitespace-nowrap tw:customer:text-center tw:customer:[border:1px_solid_#bdbeb7] tw:customer:rounded-[999px] tw:customer:[background:transparent] tw:customer:text-[#292a28] tw:customer:py-2.5 tw:customer:px-5 tw:customer:text-[13px] tw:customer:font-semibold tw:down-480:customer:py-2.5 tw:down-480:customer:px-4 tw:down-480:customer:text-[12px] tw:customer:leading-[1.4]  ${category === active ? "active" : ""} ${index >= visibleCount ? "overflowed" : ""}`}
      aria-hidden={index >= visibleCount || undefined} tabIndex={index >= visibleCount ? -1 : undefined}
      aria-pressed={category === active} onClick={() => onSelect(category)}
    >{category}</Button>)}</div>
    <div className="service-category-menu tw:customer:flex-none" ref={menuRef} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    }}>
      <Button variant="outline" ref={triggerRef} type="button" className="service-category-toggle tw:customer:w-11 tw:customer:h-11 tw:customer:grid tw:customer:place-items-center
          tw:customer:p-0 tw:customer:[border:1px_solid_#e0e0d9] tw:customer:rounded-[50%] tw:customer:[background:#fff]
          tw:customer:text-[#292a28]" aria-label="All service categories"
        aria-expanded={open} aria-controls="service-category-options" onClick={() => setOpen(value => !value)}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 5h12M9 12h12M9 19h12" /><circle cx="3" cy="5" r="1" /><circle cx="3" cy="12" r="1" /><circle cx="3" cy="19" r="1" />
        </svg>
      </Button>
      {open && <div id="service-category-options" className="service-category-popover tw:customer:absolute tw:customer:right-0 tw:customer:top-13.5 tw:customer:grid
          tw:customer:gap-2 tw:customer:w-[min(310px,100%)] tw:customer:max-h-[60dvh] tw:customer:overflow-y-auto
          tw:customer:p-3.5 tw:customer:[border:1px_solid_#e0e0d9] tw:customer:rounded-[16px]
          tw:customer:[background:#fff] tw:customer:[&_button]:min-h-11 tw:customer:[&_button]:whitespace-normal
          tw:customer:[&_button]:[overflow-wrap:anywhere] tw:customer:[&_button]:py-3 tw:customer:[&_button]:px-4
          tw:customer:[&_button]:[border:1px_solid_transparent] tw:customer:[&_button]:rounded-[999px]
          tw:customer:[&_button]:[background:transparent] tw:customer:[&_button]:text-[#292a28]
          tw:customer:[&_button]:text-left tw:customer:[&_button]:text-[14px]
          tw:customer:[&_button:hover]:[background:#f5f5f1] tw:customer:[&_button]:leading-[1.4]" role="group" aria-label="All service categories">
        {categories.map(category => <Button variant="outline" key={category} type="button" ref={category === active ? activeRef : undefined}
          aria-pressed={category === active} className={category === active ? "active" : ""}
          onClick={() => { onSelect(category); setOpen(false); triggerRef.current?.focus(); }}>{category}</Button>)}
      </div>}
    </div>
  </nav>;
}
