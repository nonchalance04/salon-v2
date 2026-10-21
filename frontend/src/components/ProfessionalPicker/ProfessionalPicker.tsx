// Bring in the tools for the professional picker view so this file can work with the rest of the application.
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import type { StaffPublicProfile } from "../../utils/staff-profile";
import type { CatalogService } from "../../types/salon";

// Describe the information used by the professional picker view so different parts of the application agree on its contents.
export type BookingStaff = { id: string; firstName: string; lastName: string; serviceIds: string[]; publicProfile?: StaffPublicProfile | null; statistics?: { appointmentsCompleted: number; clientsServed: number } };
type Selection = { key: number; serviceId: string; staffId: string };
// Keep the shared values for the professional picker view together so later steps use the same definitions.
const tabs = ["Profile", "Portfolio"] as const;

// Show the staff portrait or its fallback so the professional still has a recognizable profile.
function Portrait({ person, large = false }: { person: BookingStaff; large?: boolean }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  if (person.publicProfile?.photoUrl && failedPhoto !== person.publicProfile.photoUrl) return <img className={`professional-portrait tw:customer:relative tw:customer:block tw:customer:w-14.5 tw:customer:h-14.5 tw:customer:shrink-0 tw:customer:rounded-[50%] tw:customer:[background:#e9e8df] tw:customer:text-[#484b47] tw:customer:overflow-hidden tw:customer:[&_svg]:block tw:customer:[&_svg]:w-full tw:customer:[&_svg]:h-full tw:customer:[&>span]:absolute tw:customer:[&>span]:bottom-[3px] tw:customer:[&>span]:left-0 tw:customer:[&>span]:w-full tw:customer:[&>span]:text-center tw:customer:[&>span]:text-[9px] tw:customer:[&>span]:tracking-[.1em] tw:customer:[&>span]:text-[white] tw:customer:[&>span]:font-semibold tw:down-480:customer:w-11.5 tw:down-480:customer:h-11.5 tw:customer:[img&]:object-cover ${large ? " portrait-large tw:customer:w-[116px] tw:customer:h-[116px] tw:customer:[margin:0_auto_18px] tw:customer:[&>span]:text-[14px] tw:customer:[&>span]:bottom-[9px] tw:down-480:customer:w-[104px] tw:down-480:customer:h-[104px] " : ""}`} src={person.publicProfile.photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(person.publicProfile!.photoUrl)} />;
  const hue = Array.from(person.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  // Show the prepared content and actions so the user can review the information and continue.
  return <span className={`professional-portrait tw:customer:relative tw:customer:block tw:customer:w-14.5 tw:customer:h-14.5 tw:customer:shrink-0 tw:customer:rounded-[50%] tw:customer:[background:#e9e8df] tw:customer:text-[#484b47] tw:customer:overflow-hidden tw:customer:[&_svg]:block tw:customer:[&_svg]:w-full tw:customer:[&_svg]:h-full tw:customer:[&>span]:absolute tw:customer:[&>span]:bottom-[3px] tw:customer:[&>span]:left-0 tw:customer:[&>span]:w-full tw:customer:[&>span]:text-center tw:customer:[&>span]:text-[9px] tw:customer:[&>span]:tracking-[.1em] tw:customer:[&>span]:text-[white] tw:customer:[&>span]:font-semibold tw:down-480:customer:w-11.5 tw:down-480:customer:h-11.5 tw:customer:[img&]:object-cover  portrait-tone-${hue}${large ? " portrait-large tw:customer:w-[116px] tw:customer:h-[116px] tw:customer:[margin:0_auto_18px] tw:customer:[&>span]:text-[14px] tw:customer:[&>span]:bottom-[9px] tw:down-480:customer:w-[104px] tw:down-480:customer:h-[104px] " : ""}`} aria-hidden="true">
    <svg viewBox="0 0 80 80" fill="none"><path d="M10 80c0-21 12-32 30-32s30 11 30 32" fill="currentColor"/><ellipse cx="40" cy="32" rx="16" ry="19" fill="#e8c7ac"/><path d="M23 31c-3-17 6-23 17-23 14 0 21 11 17 26l-7-16c-7 8-15 8-27 13Z" fill="#35332f"/><path d="M34 47h12v10l-6 6-6-6" fill="#e8c7ac"/></svg>
    <span>{person.firstName[0]}{person.lastName[0]}</span>
  </span>;
}

// Show a portfolio photo with a fallback so an unavailable picture does not break the profile.
function PortfolioImage({ url, title }: { url: string; title: string }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return failedUrl === url ? <div className="portfolio-art tw:customer:grid tw:customer:place-items-center tw:customer:[aspect-ratio:1]
          tw:customer:[background:#e9dfcb] tw:customer:text-[#8b7241] portfolio-unavailable tw:customer:text-[11px]
          tw:customer:text-center tw:customer:p-3 tw:customer:rounded-[12px]">Image unavailable</div> : <img className="portfolio-photo tw:customer:w-full tw:customer:[aspect-ratio:1] tw:customer:object-cover tw:customer:block
          tw:customer:rounded-[12px]" src={url} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />;
}

// Show the selected professional details so the customer can review their background and work.
function Profile({ person, services, trigger, onClose, onSelect }: { person: BookingStaff; services: CatalogService[]; trigger: HTMLButtonElement; onClose: () => void; onSelect: () => void }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");
  const profile = person.publicProfile;
  const qualified = services.filter(service => person.serviceIds.includes(service.id));
  // Show the prepared content and actions so the user can review the information and continue.
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="professional-dialog tw:customer:fixed tw:customer:[inset:auto] tw:customer:top-[50%] tw:customer:left-[50%]
          tw:customer:m-0 tw:customer:w-[min(500px,calc(100%_-_32px))] tw:customer:max-h-[calc(100dvh_-_48px)]
          tw:customer:p-0 tw:customer:[border:1px_solid_#e0e0d7] tw:customer:rounded-[20px] tw:customer:text-[#292a28]
          tw:customer:[background:#fff] tw:customer:overflow-auto tw:customer:[&_h3]:text-[15px]
          tw:customer:[&_h3]:[margin:0_0_12px] tw:down-480:customer:max-h-[calc(100dvh_-_32px)]" showCloseButton={false} aria-describedby={undefined}
      onCloseAutoFocus={event => { event.preventDefault(); trigger.focus(); }}>
    <div className="professional-modal-content tw:customer:relative tw:customer:p-9 tw:down-480:customer:[padding:30px_22px_24px]"><Button variant="outline" type="button" className="profile-close tw:customer:absolute tw:customer:top-4 tw:customer:right-4 tw:customer:w-9 tw:customer:h-9
          tw:customer:p-0 tw:customer:[border:0] tw:customer:rounded-[50%] tw:customer:[background:#f0f0eb]
          tw:customer:grid tw:customer:place-items-center tw:customer:text-[25px] tw:customer:font-normal" aria-label="Close profile" onClick={onClose} autoFocus>×</Button>
      {/* Show the page heading and its main controls so the current task is easy to identify. */}
      <header className="professional-profile-header tw:customer:text-center tw:customer:pt-2.5 tw:customer:[&_h2]:text-[24px]
          tw:customer:[&_h2]:[margin:0_0_6px] tw:customer:[&_p]:text-[14px] tw:customer:[&_p]:text-[#73756f]
          tw:customer:[&_p]:[margin:0_0_12px] tw:down-480:customer:[&_h2]:text-[22px]"><Portrait person={person} large /><DialogTitle asChild><h2>{person.firstName} {person.lastName}</h2></DialogTitle><p>{profile?.title || "Salon professional"}</p></header>
      <div className="profile-tabs tw:customer:flex tw:customer:justify-between tw:customer:gap-2.5 tw:customer:[margin:28px_0_24px]
          tw:customer:[&_button]:flex-1 tw:customer:[&_button]:[border:1px_solid_#d5d5cd]
          tw:customer:[&_button]:rounded-[99px] tw:customer:[&_button]:[background:white] tw:customer:[&_button]:py-2
          tw:customer:[&_button]:px-3 tw:customer:[&_button]:text-[12px] tw:customer:[&_button]:font-normal
          tw:customer:[&_[aria-selected=true]]:[background:#292a28]
          tw:customer:[&_[aria-selected=true]]:[border-color:#292a28] tw:customer:[&_[aria-selected=true]]:text-[white]
          tw:customer:[&_[aria-selected=true]]:font-semibold" role="tablist" aria-label="Professional details">{tabs.map((name, i) => <Button variant="outline" type="button" key={name} id={`profile-tab-${name}`} role="tab" aria-selected={tab === name} aria-controls="professional-tab-panel" tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={event => {
        const next = event.key === "ArrowRight" ? (i + 1) % tabs.length : event.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (next >= 0) { event.preventDefault(); setTab(tabs[next]!); document.getElementById(`profile-tab-${tabs[next]}`)?.focus(); }
      }}>{name}</Button>)}</div>
      <div id="professional-tab-panel" className="professional-tab-panel tw:customer:min-h-[220px] tw:customer:text-[13px] tw:customer:leading-[1.7]" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} tabIndex={0}>
        {tab === "Profile" && <><p className="profile-bio tw:customer:text-[#73756f] tw:customer:text-[13px] tw:customer:mb-5.5
          tw:customer:whitespace-pre-wrap tw:customer:[overflow-wrap:anywhere]">{profile?.bio || "Meet your salon professional. Choose from their bookable services below."}</p><dl className="professional-facts tw:customer:[margin:0_0_24px] tw:customer:[&>div]:flex tw:customer:[&>div]:justify-between
          tw:customer:[&>div]:gap-5 tw:customer:[&>div]:py-2.5 tw:customer:[&>div]:px-0
          tw:customer:[&>div]:[border-bottom:1px_solid_#eeeeea] tw:customer:[&_dd]:m-0 tw:customer:[&_dd]:text-right
          tw:customer:[&_small]:text-[9px] tw:customer:[&_small]:text-[#8b7950] tw:customer:[&_small]:ml-1
          tw:down-480:customer:[&>div]:gap-3"><div><dt>Appointments completed</dt><dd>{person.statistics?.appointmentsCompleted ?? 0}</dd></div><div><dt>Clients served</dt><dd>{person.statistics?.clientsServed ?? 0}</dd></div><div><dt>Languages</dt><dd>{profile?.languages.length ? profile.languages.join(", ") : "Not listed"}</dd></div></dl><h3>Bookable services</h3><div className="professional-specialties tw:customer:flex tw:customer:flex-wrap tw:customer:gap-[7px]
          tw:customer:[&>span]:[border:1px_solid_#e4dfcf] tw:customer:[&>span]:[background:#fbf9f2]
          tw:customer:[&>span]:rounded-[20px] tw:customer:[&>span]:py-[5px] tw:customer:[&>span]:px-2.5
          tw:customer:[&>span]:text-[11px]">{qualified.map(service => <span key={service.id}>{service.name}</span>)}</div></>}
        {tab === "Portfolio" && <><h3>A little inspiration</h3>{profile?.portfolio.length ? <div className="professional-portfolio tw:customer:grid tw:customer:grid-cols-3 tw:customer:gap-2.5 tw:customer:mt-5
          tw:customer:[&_h4]:text-[11px] tw:customer:[&_h4]:[margin:10px_0_4px] tw:customer:[&_p]:text-[10px]
          tw:customer:[&_p]:text-[#73756f] tw:customer:[&_p]:m-0">{profile.portfolio.map((item, i) => <article key={i}><PortfolioImage url={item.imageUrl} title={item.title} /><h4>{item.title}</h4>{item.caption && <p>{item.caption}</p>}</article>)}</div> : <p className="muted">Portfolio photos haven’t been added yet.</p>}</>}

      </div>

      <Button variant="outline" type="button" className="profile-select tw:customer:flex tw:customer:justify-between tw:customer:items-center tw:customer:w-full
          tw:customer:py-[13px] tw:customer:px-4.5 tw:customer:[background:#292a28] tw:customer:text-[white]
          tw:customer:[border:0] tw:customer:rounded-[99px] tw:customer:text-[13px]" onClick={onSelect}>Choose {person.firstName} </Button>
    </div>
  </DialogContent></Dialog>;
}

// Show eligible professionals so the customer can choose who will provide the service.
export function ProfessionalPicker({ selections, staff, services, onSelect }: { selections: Selection[]; staff: BookingStaff[]; services: CatalogService[]; onSelect: (key: number, staffId: string) => void }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [profile, setProfile] = useState<{ person: BookingStaff; rowKey: number; trigger: HTMLButtonElement } | null>(null);
  // Show the prepared content and actions so the user can review the information and continue.
  return <div className="professional-picker"><p className="professional-guidance tw:customer:text-[13px] tw:customer:text-[#73756f] tw:customer:mb-6
          tw:customer:leading-[1.7]">Choose a professional for each service, or keep your options open with any available professional.</p>
    {selections.map((row, i) => {
      const people = staff.filter(person => person.serviceIds.includes(row.serviceId));
      const service = services.find(service => service.id === row.serviceId);
      // Show the prepared content and actions so the user can review the information and continue.
      return <section className="professional-service-group" aria-label={`Professional for service ${i + 1}: ${service?.name}`} key={row.key}>
        <div className="professional-service-title tw:customer:flex tw:customer:justify-between tw:customer:items-baseline
          tw:customer:gap-3 tw:customer:mb-3.5 tw:customer:[&_h2]:text-[16px] tw:customer:[&_h2]:m-0
          tw:customer:[&>span]:text-[11px] tw:customer:[&>span]:text-[#73756f] tw:customer:[&>span]:whitespace-nowrap
          tw:down-480:customer:[align-items:start] tw:down-480:customer:[&_h2]:text-[14px]
          tw:down-480:customer:[&>span]:text-[10px]"><h2>{selections.length > 1 ? `${i + 1}. ` : ""}{service?.name}</h2><span>{people.length} {people.length === 1 ? "professional" : "professionals"}</span></div>
        <div className={`professional-card tw:customer:flex tw:customer:items-center tw:customer:gap-4.5 tw:customer:p-5.5 tw:customer:[background:white] tw:customer:[border:1px_solid_#d9d9d2] tw:customer:rounded-[14px] tw:customer:mb-3 tw:customer:hover:[border-color:#b6a059] tw:down-480:customer:gap-3 tw:down-480:customer:py-[17px] tw:down-480:customer:px-3.5  professional-any${row.staffId === "" ? " is-selected" : ""}`}><div className="professional-card-copy tw:customer:flex-1 tw:customer:min-w-0 tw:customer:[&_h3]:text-[15px]
          tw:customer:[&_h3]:[margin:0_0_4px] tw:customer:[&_h3]:tracking-[-.02em]
          tw:customer:[&_h3]:[overflow-wrap:anywhere] tw:customer:[&_p]:text-[12px] tw:customer:[&_p]:text-[#73756f]
          tw:customer:[&_p]:m-0 tw:customer:[&_p]:font-normal tw:down-480:customer:[&_h3]:text-[13px]
          tw:down-480:customer:[&_p]:text-[10px]"><h3>Any professional</h3><p>More flexibility for your visit</p></div><Button variant="outline" type="button" className="professional-select tw:customer:[border:0] tw:customer:rounded-[99px] tw:customer:py-[9px] tw:customer:px-5
          tw:customer:text-[11px] tw:customer:min-w-22 tw:customer:[background:white] tw:customer:shrink-0
          tw:down-480:customer:py-[9px] tw:down-480:customer:px-3 tw:down-480:customer:min-w-18
          tw:down-480:customer:text-[10px]" aria-label={`Any available professional for service ${i + 1}`} aria-pressed={!row.staffId} onClick={() => onSelect(row.key, "")}>{!row.staffId ? "Selected" : "Select"}</Button></div>
        {people.map(person => <article className={`professional-card tw:customer:flex tw:customer:items-center tw:customer:gap-4.5 tw:customer:p-5.5 tw:customer:[background:white] tw:customer:[border:1px_solid_#d9d9d2] tw:customer:rounded-[14px] tw:customer:mb-3 tw:customer:hover:[border-color:#b6a059] tw:down-480:customer:gap-3 tw:down-480:customer:py-[17px] tw:down-480:customer:px-3.5 ${row.staffId === person.id ? " is-selected" : ""}`} key={person.id}><Portrait person={person}/><div className="professional-card-copy tw:customer:flex-1 tw:customer:min-w-0 tw:customer:[&_h3]:text-[15px]
          tw:customer:[&_h3]:[margin:0_0_4px] tw:customer:[&_h3]:tracking-[-.02em]
          tw:customer:[&_h3]:[overflow-wrap:anywhere] tw:customer:[&_p]:text-[12px] tw:customer:[&_p]:text-[#73756f]
          tw:customer:[&_p]:m-0 tw:customer:[&_p]:font-normal tw:down-480:customer:[&_h3]:text-[13px]
          tw:down-480:customer:[&_p]:text-[10px]"><h3>{person.firstName} {person.lastName}</h3><p>{person.publicProfile?.title || "Salon professional"}</p><Button variant="outline" type="button" className="professional-view-profile tw:customer:[border:0] tw:customer:[background:transparent] tw:customer:p-0
          tw:customer:mt-3 tw:customer:text-[11px] tw:customer:font-normal tw:customer:text-[#292a28]
          tw:customer:underline tw:customer:underline-offset-[3px]" aria-label={`View profile of ${person.firstName} ${person.lastName} for service ${i + 1}`} onClick={event => setProfile({person, rowKey: row.key, trigger: event.currentTarget})}>View profile </Button></div><Button variant="outline" type="button" className="professional-select tw:customer:[border:0] tw:customer:rounded-[99px] tw:customer:py-[9px] tw:customer:px-5
          tw:customer:text-[11px] tw:customer:min-w-22 tw:customer:[background:white] tw:customer:shrink-0
          tw:down-480:customer:py-[9px] tw:down-480:customer:px-3 tw:down-480:customer:min-w-18
          tw:down-480:customer:text-[10px]" aria-label={`Select ${person.firstName} ${person.lastName} for service ${i + 1}`} aria-pressed={row.staffId === person.id} onClick={() => onSelect(row.key, person.id)}>{row.staffId === person.id ? "Selected" : "Select"}</Button></article>)}
        {!people.length && <p className="professional-empty tw:customer:text-[12px] tw:customer:text-[#73756f] tw:customer:p-3 tw:customer:leading-[1.7]">No specific professionals are listed for this service. We’ll check staff availability when you choose your time.</p>}
      </section>;
    })}
    {profile && <Profile key={`${profile.person.id}-${profile.rowKey}`} person={profile.person} services={services} trigger={profile.trigger} onClose={() => setProfile(null)} onSelect={() => { onSelect(profile.rowKey, profile.person.id); setProfile(null); }}/>}
  </div>;
}
