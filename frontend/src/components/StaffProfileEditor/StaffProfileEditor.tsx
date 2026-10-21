// Bring in the tools for the staff profile editor view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Images, MessageSquareQuote, Plus, ShieldCheck, UserRound } from "lucide-react";
import { StaffManagementDialog } from "../StaffManagementDialog/StaffManagementDialog";
import { api } from "../../lib/api";
import { emptyStaffProfile, type StaffPublicProfile } from "../../utils/staff-profile";

import "./StaffProfileEditor.css";

// Show the selected portfolio picture so the administrator can review it before saving.
function PortfolioPreview({ file, imageUrl, title }: { file?: File | null; imageUrl: string; title: string }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [preview, setPreview] = useState("");
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const source = file ? preview : imageUrl;
  return source ? <img className="staff-portfolio-preview tw:[.staff-profile-editor_&]:block tw:[.staff-profile-editor_&]:w-full
          tw:[.staff-profile-editor_&]:max-w-[240px] tw:[.staff-profile-editor_&]:h-[150px]
          tw:[.staff-profile-editor_&]:mt-3 tw:[.staff-profile-editor_&]:object-cover
          tw:[.staff-profile-editor_&]:rounded-[10px] tw:[.staff-profile-editor_&]:[border:1px_solid_#e4e1d6]" src={source} alt={title || "Portfolio image preview"} referrerPolicy="no-referrer" /> : null;
}

// Show public profile and portfolio fields so administrators can maintain the staff booking profile.
export function StaffProfileEditor({ staffId, name, initial, busy, onBusy, onSaved, onClose, onRestoreFocus }: {
  onRestoreFocus: () => void;
  staffId: string; name: string; initial: StaffPublicProfile | null; busy: boolean;
  onBusy: (busy: boolean) => void; onSaved: (profile: StaffPublicProfile) => void; onClose: () => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [profile, setProfile] = useState<StaffPublicProfile>(() => initial ?? emptyStaffProfile());
  const [languages, setLanguages] = useState(initial?.languages.join(", ") ?? "");
  const [portfolioFiles, setPortfolioFiles] = useState<(File | null)[]>(() => (initial?.portfolio ?? []).map(() => null));
  const [portfolioKeys, setPortfolioKeys] = useState(() => (initial?.portfolio ?? []).map((_, index) => index));
  const nextPortfolioKey = useRef(initial?.portfolio.length ?? 0);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const errorPanel = useRef<HTMLDivElement>(null);
  // Bring the relevant content into view so the user can find the new information or error.
  useEffect(() => { if (error) errorPanel.current?.scrollIntoView({ block: "nearest" }); }, [error]);
  // Update the edited selection so the screen reflects the latest choices.
  const update = <K extends keyof StaffPublicProfile>(key: K, value: StaffPublicProfile[K]) => setProfile(current => ({ ...current, [key]: value }));
  // Check and submit the edited details so the saved record matches the form.
  async function save(event: FormEvent) {
    event.preventDefault(); if (sending.current) return;
    sending.current = true; onBusy(true); setError("");
    try {
      const portfolio = [...profile.portfolio];
      for (const [index, file] of portfolioFiles.entries()) {
        if (!file || !portfolio[index]) continue;
        const uploaded = await api<{ imageUrl: string }>(`/configuration/staff/${staffId}/portfolio-images`, {
          method: "POST", headers: { "Content-Type": file.type }, body: file,
        });
        portfolio[index] = { ...portfolio[index], imageUrl: uploaded.imageUrl };
        setProfile(current => ({ ...current, portfolio: current.portfolio.map((item, i) => i === index ? { ...item, imageUrl: uploaded.imageUrl } : item) }));
        setPortfolioFiles(current => current.map((item, i) => i === index ? null : item));
      }
      const body = { ...profile, portfolio, title: profile.title.trim(), bio: profile.bio.trim(), photoUrl: profile.photoUrl?.trim() || null,
        languages: [...new Set(languages.split(",").map(value => value.trim()).filter(Boolean))] };
      const result = await api<{ record: { publicProfile: StaffPublicProfile } }>(`/configuration/staff/${staffId}/profile`, { method: "PUT", body: JSON.stringify(body) });
      onSaved(result.record.publicProfile);
    } catch (err) { setError(err instanceof Error ? err.message : "The profile could not be saved."); }
    finally { sending.current = false; onBusy(false); }
  }
  // Show the prepared content and actions so the user can review the information and continue.
  return <StaffManagementDialog title="Edit public profile" description="Shape how clients get to know this professional before booking." name={name} icon={<UserRound size={23} />} busy={busy} onClose={onClose} onRestoreFocus={onRestoreFocus}>
    {/* Group the entry fields and submit action so the user can complete this step in one place. */}
    <form className="staff-management-form tw:flex tw:flex-col tw:min-h-0 staff-profile-editor tw:[&_label_>_small]:block
          tw:[&_label_>_small]:text-[#97907e] tw:[&_label_>_small]:text-[10px] tw:[&_label_>_small]:font-normal
          tw:[&_label_>_small]:leading-[1.6]" onSubmit={save} aria-busy={busy} aria-label={`Edit public profile for ${name}`}>
      <div className="staff-management-body tw:py-6 tw:px-7 tw:overflow-y-auto tw:min-h-0 tw:down-540:py-5.5 tw:down-540:px-5" tabIndex={-1}>
        {error && <div ref={errorPanel} role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</div>}
        <fieldset disabled={busy} className="staff-profile-fields tw:[.staff-profile-editor_&]:[border:0] tw:[.staff-profile-editor_&]:p-0
          tw:[.staff-profile-editor_&]:m-0">
          <section aria-label="Profile details" className="staff-profile-section">
            <div className="profile-section-heading tw:flex tw:items-center tw:gap-2.5 tw:mb-5 tw:[&_>_div]:flex-1 tw:[&_>_div]:min-w-0
          tw:[.staff-profile-editor_&_h3]:text-[13px] tw:[.staff-profile-editor_&_h3]:font-bold
          tw:[.staff-profile-editor_&_h3]:[margin:0_0_5px] tw:[&_h3_>_span]:text-[#a1967a] tw:[&_h3_>_span]:text-[10px]
          tw:[&_h3_>_span]:font-normal tw:[&_h3_>_span]:ml-[5px] tw:[&_p]:m-0 tw:[&_p]:text-[#96907f]
          tw:[&_p]:text-[11px] tw:[&_>_button]:text-[11px] tw:down-540:flex-wrap
          tw:down-540:[&_>_div]:[flex-basis:calc(100%_-_50px)] tw:down-540:[&_>_button]:ml-11.5 tw:[&_p]:leading-[1.6]"><span className="profile-section-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-9 tw:h-9 tw:rounded-[10px]
          tw:text-[#9a873c] tw:[background:#f8f5e9]"><UserRound size={18} aria-hidden="true" /></span><div><h3>Profile details</h3><p>Introduce their experience, style, and specialties.</p></div></div>
            <div className="profile-form-grid tw:[.staff-profile-editor_&]:grid tw:[.staff-profile-editor_&]:grid-cols-[1fr_1fr]
          tw:[.staff-profile-editor_&]:gap-4.5 tw:down-540:[.staff-profile-editor_&]:grid-cols-[1fr]
          tw:down-540:[.staff-profile-editor_&]:gap-4">
              <label>Professional title<Input required maxLength={100} value={profile.title} onChange={e => update("title", e.target.value)} placeholder="Senior hairstylist" /></label>
              <label>Languages (comma-separated)<Input value={languages} onChange={e => setLanguages(e.target.value)} maxLength={410} placeholder="English, Tagalog" /></label>
              <label className="staff-profile-wide tw:[.staff-profile-editor_&]:[grid-column:1_/_-1]">Profile photo URL<div className="profile-photo-input tw:relative tw:[&_>_svg]:absolute tw:[&_>_svg]:top-[50%] tw:[&_>_svg]:left-[13px]
          tw:[&_>_svg]:text-[#a0957a] tw:[&_>_svg]:pointer-events-none tw:[&_input]:pl-9"><Camera size={16} aria-hidden="true" /><Input type="url" pattern="https://.*" maxLength={2048} value={profile.photoUrl ?? ""} onChange={e => update("photoUrl", e.target.value || null)} placeholder="https://example.com/portrait.jpg" /></div><small>Use an HTTPS image link. Leave blank to use the illustrated avatar.</small></label>
              <label className="staff-profile-wide tw:[.staff-profile-editor_&]:[grid-column:1_/_-1]">About this professional<Textarea rows={3} maxLength={2000} value={profile.bio} onChange={e => update("bio", e.target.value)} placeholder="Share their approach, experience, and what they love about their work." /></label>
            </div>
          </section>
          <section aria-label="Portfolio editor" className="staff-profile-section">
            <div className="profile-section-heading tw:flex tw:items-center tw:gap-2.5 tw:mb-5 tw:[&_>_div]:flex-1 tw:[&_>_div]:min-w-0
          tw:[.staff-profile-editor_&_h3]:text-[13px] tw:[.staff-profile-editor_&_h3]:font-bold
          tw:[.staff-profile-editor_&_h3]:[margin:0_0_5px] tw:[&_h3_>_span]:text-[#a1967a] tw:[&_h3_>_span]:text-[10px]
          tw:[&_h3_>_span]:font-normal tw:[&_h3_>_span]:ml-[5px] tw:[&_p]:m-0 tw:[&_p]:text-[#96907f]
          tw:[&_p]:text-[11px] tw:[&_>_button]:text-[11px] tw:down-540:flex-wrap
          tw:down-540:[&_>_div]:[flex-basis:calc(100%_-_50px)] tw:down-540:[&_>_button]:ml-11.5 tw:[&_p]:leading-[1.6]"><span className="profile-section-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-9 tw:h-9 tw:rounded-[10px]
          tw:text-[#9a873c] tw:[background:#f8f5e9]"><Images size={18} aria-hidden="true" /></span><div><h3>Portfolio <span>{profile.portfolio.length}/8</span></h3><p>A selection of their work, shown to clients.</p></div><Button variant="outline" size="sm" type="button" disabled={profile.portfolio.length >= 8} onClick={() => { update("portfolio", [...profile.portfolio, { title: "", imageUrl: "", caption: "" }]); setPortfolioFiles(current => [...current, null]); const key = nextPortfolioKey.current++; setPortfolioKeys(current => [...current, key]); }}><Plus size={14} aria-hidden="true" />Add portfolio item</Button></div>
            {!profile.portfolio.length && <div className="staff-profile-empty tw:grid tw:[justify-items:center] tw:gap-2.5 tw:py-6.5 tw:px-5
          tw:[border:1px_dashed_#dedace] tw:rounded-[12px] tw:[background:#fdfcf9] tw:text-[#afa17b] tw:text-center
          tw:[&_strong]:text-[12px] tw:[&_strong]:font-medium tw:[&_strong]:text-[#7d7561] tw:[&_p]:m-0
          tw:[&_p]:text-[#a09987] tw:[&_p]:text-[11px] tw:[&_p]:leading-[1.6]"><Images size={24} aria-hidden="true" /><strong>No portfolio items yet</strong><p>Add up to 8 examples to showcase their work.</p></div>}
            {profile.portfolio.map((item, index) => <fieldset className="staff-profile-entry tw:[.staff-profile-editor_&]:p-4.5 tw:[.staff-profile-editor_&]:[margin:16px_0_0]
          tw:[.staff-profile-editor_&]:[border:1px_solid_#e4e1d6] tw:[.staff-profile-editor_&]:rounded-[12px]
          tw:[&_legend]:py-0 tw:[&_legend]:px-2 tw:[&_legend]:text-[11px] tw:[&_legend]:font-semibold
          tw:[&_legend]:text-[#8f8261] tw:down-540:[.staff-profile-editor_&]:p-3.5" key={portfolioKeys[index]}><legend>Portfolio item {index + 1}</legend><div className="profile-form-grid tw:[.staff-profile-editor_&]:grid tw:[.staff-profile-editor_&]:grid-cols-[1fr_1fr]
          tw:[.staff-profile-editor_&]:gap-4.5 tw:down-540:[.staff-profile-editor_&]:grid-cols-[1fr]
          tw:down-540:[.staff-profile-editor_&]:gap-4">
              <label>Title<Input required maxLength={100} value={item.title} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} placeholder="e.g. Soft balayage" /></label>
              <label>Portfolio photo<Input type="file" accept="image/jpeg,image/png,image/webp" required={!item.imageUrl && !portfolioFiles[index]} onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size)) {
                  setError("Choose a JPEG, PNG, or WebP image no larger than 5 MB."); e.target.value = ""; return;
                }
                setError(""); setPortfolioFiles(current => current.map((value, i) => i === index ? file : value));
              }} /><small>JPEG, PNG, or WebP · Up to 5 MB. Choose a file to add or replace this photo.</small><PortfolioPreview file={portfolioFiles[index]} imageUrl={item.imageUrl} title={item.title} /></label>
              <label className="staff-profile-wide tw:[.staff-profile-editor_&]:[grid-column:1_/_-1]">Caption<Textarea rows={2} maxLength={300} value={item.caption} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, caption: e.target.value } : row))} placeholder="A few details about this look…" /></label></div>
              <Button className="profile-remove tw:[.staff-profile-editor_&]:mt-3 tw:[.staff-profile-editor_&]:text-[#a35d50]
          tw:[.staff-profile-editor_&]:text-[11px]" variant="ghost" size="sm" type="button" onClick={() => { update("portfolio", profile.portfolio.filter((_, i) => i !== index)); setPortfolioFiles(current => current.filter((_, i) => i !== index)); setPortfolioKeys(current => current.filter((_, i) => i !== index)); }}>Remove portfolio item {index + 1}</Button></fieldset>)}
          </section>
          <section aria-label="Testimonials editor" className="staff-profile-section">
            <div className="profile-section-heading tw:flex tw:items-center tw:gap-2.5 tw:mb-5 tw:[&_>_div]:flex-1 tw:[&_>_div]:min-w-0
          tw:[.staff-profile-editor_&_h3]:text-[13px] tw:[.staff-profile-editor_&_h3]:font-bold
          tw:[.staff-profile-editor_&_h3]:[margin:0_0_5px] tw:[&_h3_>_span]:text-[#a1967a] tw:[&_h3_>_span]:text-[10px]
          tw:[&_h3_>_span]:font-normal tw:[&_h3_>_span]:ml-[5px] tw:[&_p]:m-0 tw:[&_p]:text-[#96907f]
          tw:[&_p]:text-[11px] tw:[&_>_button]:text-[11px] tw:down-540:flex-wrap
          tw:down-540:[&_>_div]:[flex-basis:calc(100%_-_50px)] tw:down-540:[&_>_button]:ml-11.5 tw:[&_p]:leading-[1.6]"><span className="profile-section-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-9 tw:h-9 tw:rounded-[10px]
          tw:text-[#9a873c] tw:[background:#f8f5e9]"><MessageSquareQuote size={18} aria-hidden="true" /></span><div><h3>Client testimonials <span>{profile.reviews.length}/10</span></h3><p>Share client feedback with their permission.</p></div><Button variant="outline" size="sm" type="button" disabled={profile.reviews.length >= 10} onClick={() => update("reviews", [...profile.reviews, { author: "", rating: 5, text: "" }])}><Plus size={14} aria-hidden="true" />Add testimonial</Button></div>
            {!profile.reviews.length && <div className="staff-profile-empty tw:grid tw:[justify-items:center] tw:gap-2.5 tw:py-6.5 tw:px-5
          tw:[border:1px_dashed_#dedace] tw:rounded-[12px] tw:[background:#fdfcf9] tw:text-[#afa17b] tw:text-center
          tw:[&_strong]:text-[12px] tw:[&_strong]:font-medium tw:[&_strong]:text-[#7d7561] tw:[&_p]:m-0
          tw:[&_p]:text-[#a09987] tw:[&_p]:text-[11px] tw:[&_p]:leading-[1.6]"><MessageSquareQuote size={24} aria-hidden="true" /><strong>No testimonials yet</strong><p>Testimonials are labeled as shared by the salon.</p></div>}
            {profile.reviews.map((review, index) => <fieldset className="staff-profile-entry tw:[.staff-profile-editor_&]:p-4.5 tw:[.staff-profile-editor_&]:[margin:16px_0_0]
          tw:[.staff-profile-editor_&]:[border:1px_solid_#e4e1d6] tw:[.staff-profile-editor_&]:rounded-[12px]
          tw:[&_legend]:py-0 tw:[&_legend]:px-2 tw:[&_legend]:text-[11px] tw:[&_legend]:font-semibold
          tw:[&_legend]:text-[#8f8261] tw:down-540:[.staff-profile-editor_&]:p-3.5" key={index}><legend>Testimonial {index + 1}</legend><div className="profile-form-grid tw:[.staff-profile-editor_&]:grid tw:[.staff-profile-editor_&]:grid-cols-[1fr_1fr]
          tw:[.staff-profile-editor_&]:gap-4.5 tw:down-540:[.staff-profile-editor_&]:grid-cols-[1fr]
          tw:down-540:[.staff-profile-editor_&]:gap-4"><label>Client display name<Input required maxLength={100} value={review.author} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, author: e.target.value } : row))} placeholder="Client’s preferred name" /></label>
              <label>Rating<NativeSelect value={review.rating} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, rating: Number(e.target.value) } : row))}>{[5,4,3,2,1].map(rating => <NativeSelectOption key={rating} value={rating}>{rating} {rating === 1 ? "star" : "stars"}</NativeSelectOption>)}</NativeSelect></label>
              <label className="staff-profile-wide tw:[.staff-profile-editor_&]:[grid-column:1_/_-1]">Testimonial<Textarea required rows={3} maxLength={1000} value={review.text} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, text: e.target.value } : row))} placeholder="What did the client love about their visit?" /></label></div><Button className="profile-remove tw:[.staff-profile-editor_&]:mt-3 tw:[.staff-profile-editor_&]:text-[#a35d50]
          tw:[.staff-profile-editor_&]:text-[11px]" variant="ghost" size="sm" type="button" onClick={() => update("reviews", profile.reviews.filter((_, i) => i !== index))}>Remove testimonial {index + 1}</Button></fieldset>)}
          </section>
        </fieldset>
        <p className="staff-management-note tw:flex tw:items-start tw:gap-2 tw:py-3.5 tw:px-4 tw:[margin:20px_0_0]
          tw:[background:#faf8ef] tw:rounded-[10px] tw:text-[#8a805f] tw:text-[11px] tw:[&_svg]:shrink-0
          tw:[&_svg]:mt-[1px] tw:leading-[1.6]"><ShieldCheck size={16} aria-hidden="true" />Appointments completed and clients served are calculated from completed visits. Use Manage skills to choose qualified services.</p>
      </div>
      <div className="staff-management-footer tw:flex tw:items-center tw:justify-between tw:shrink-0 tw:gap-3.5 tw:py-4.5 tw:px-7
          tw:[background:#fcfcfa] tw:[border-top:1px_solid_#eceae3] tw:[&_>_span]:text-[#979181]
          tw:[&_>_span]:text-[10px] tw:[&_>_div]:flex tw:[&_>_div]:gap-2.5 tw:[&_button]:min-w-[100px]
          tw:[&_button]:text-[12px] tw:down-540:py-4 tw:down-540:px-5 tw:down-540:[&_>_span]:hidden
          tw:down-540:[&_>_div]:w-full tw:down-540:[&_button]:flex-1 tw:down-540:[&_button]:min-w-0"><span>Visible to clients in Select Professional</span><div><Button variant="outline" type="button" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving profile…" : "Save public profile"}</Button></div></div>
    </form>
  </StaffManagementDialog>;
}
