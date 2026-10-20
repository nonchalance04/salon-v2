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

function PortfolioPreview({ file, imageUrl, title }: { file?: File | null; imageUrl: string; title: string }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const source = file ? preview : imageUrl;
  return source ? <img className="staff-portfolio-preview" src={source} alt={title || "Portfolio image preview"} referrerPolicy="no-referrer" /> : null;
}

export function StaffProfileEditor({ staffId, name, initial, busy, onBusy, onSaved, onClose, onRestoreFocus }: {
  onRestoreFocus: () => void;
  staffId: string; name: string; initial: StaffPublicProfile | null; busy: boolean;
  onBusy: (busy: boolean) => void; onSaved: (profile: StaffPublicProfile) => void; onClose: () => void;
}) {
  const [profile, setProfile] = useState<StaffPublicProfile>(() => initial ?? emptyStaffProfile());
  const [languages, setLanguages] = useState(initial?.languages.join(", ") ?? "");
  const [portfolioFiles, setPortfolioFiles] = useState<(File | null)[]>(() => (initial?.portfolio ?? []).map(() => null));
  const [portfolioKeys, setPortfolioKeys] = useState(() => (initial?.portfolio ?? []).map((_, index) => index));
  const nextPortfolioKey = useRef(initial?.portfolio.length ?? 0);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const errorPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorPanel.current?.scrollIntoView({ block: "nearest" }); }, [error]);
  const update = <K extends keyof StaffPublicProfile>(key: K, value: StaffPublicProfile[K]) => setProfile(current => ({ ...current, [key]: value }));
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
  return <StaffManagementDialog title="Edit public profile" description="Shape how clients get to know this professional before booking." name={name} icon={<UserRound size={23} />} busy={busy} onClose={onClose} onRestoreFocus={onRestoreFocus}>
    <form className="staff-management-form staff-profile-editor" onSubmit={save} aria-busy={busy} aria-label={`Edit public profile for ${name}`}>
      <div className="staff-management-body" tabIndex={-1}>
        {error && <div ref={errorPanel} role="alert" className="error">{error}</div>}
        <fieldset disabled={busy} className="staff-profile-fields">
          <section aria-label="Profile details" className="staff-profile-section">
            <div className="profile-section-heading"><span className="profile-section-icon"><UserRound size={18} aria-hidden="true" /></span><div><h3>Profile details</h3><p>Introduce their experience, style, and specialties.</p></div></div>
            <div className="profile-form-grid">
              <label>Professional title<Input required maxLength={100} value={profile.title} onChange={e => update("title", e.target.value)} placeholder="Senior hairstylist" /></label>
              <label>Languages (comma-separated)<Input value={languages} onChange={e => setLanguages(e.target.value)} maxLength={410} placeholder="English, Tagalog" /></label>
              <label className="staff-profile-wide">Profile photo URL<div className="profile-photo-input"><Camera size={16} aria-hidden="true" /><Input type="url" pattern="https://.*" maxLength={2048} value={profile.photoUrl ?? ""} onChange={e => update("photoUrl", e.target.value || null)} placeholder="https://example.com/portrait.jpg" /></div><small>Use an HTTPS image link. Leave blank to use the illustrated avatar.</small></label>
              <label className="staff-profile-wide">About this professional<Textarea rows={3} maxLength={2000} value={profile.bio} onChange={e => update("bio", e.target.value)} placeholder="Share their approach, experience, and what they love about their work." /></label>
            </div>
          </section>
          <section aria-label="Portfolio editor" className="staff-profile-section">
            <div className="profile-section-heading"><span className="profile-section-icon"><Images size={18} aria-hidden="true" /></span><div><h3>Portfolio <span>{profile.portfolio.length}/8</span></h3><p>A selection of their work, shown to clients.</p></div><Button variant="outline" size="sm" type="button" disabled={profile.portfolio.length >= 8} onClick={() => { update("portfolio", [...profile.portfolio, { title: "", imageUrl: "", caption: "" }]); setPortfolioFiles(current => [...current, null]); const key = nextPortfolioKey.current++; setPortfolioKeys(current => [...current, key]); }}><Plus size={14} aria-hidden="true" />Add portfolio item</Button></div>
            {!profile.portfolio.length && <div className="staff-profile-empty"><Images size={24} aria-hidden="true" /><strong>No portfolio items yet</strong><p>Add up to 8 examples to showcase their work.</p></div>}
            {profile.portfolio.map((item, index) => <fieldset className="staff-profile-entry" key={portfolioKeys[index]}><legend>Portfolio item {index + 1}</legend><div className="profile-form-grid">
              <label>Title<Input required maxLength={100} value={item.title} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} placeholder="e.g. Soft balayage" /></label>
              <label>Portfolio photo<Input type="file" accept="image/jpeg,image/png,image/webp" required={!item.imageUrl && !portfolioFiles[index]} onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size)) {
                  setError("Choose a JPEG, PNG, or WebP image no larger than 5 MB."); e.target.value = ""; return;
                }
                setError(""); setPortfolioFiles(current => current.map((value, i) => i === index ? file : value));
              }} /><small>JPEG, PNG, or WebP · Up to 5 MB. Choose a file to add or replace this photo.</small><PortfolioPreview file={portfolioFiles[index]} imageUrl={item.imageUrl} title={item.title} /></label>
              <label className="staff-profile-wide">Caption<Textarea rows={2} maxLength={300} value={item.caption} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, caption: e.target.value } : row))} placeholder="A few details about this look…" /></label></div>
              <Button className="profile-remove" variant="ghost" size="sm" type="button" onClick={() => { update("portfolio", profile.portfolio.filter((_, i) => i !== index)); setPortfolioFiles(current => current.filter((_, i) => i !== index)); setPortfolioKeys(current => current.filter((_, i) => i !== index)); }}>Remove portfolio item {index + 1}</Button></fieldset>)}
          </section>
          <section aria-label="Testimonials editor" className="staff-profile-section">
            <div className="profile-section-heading"><span className="profile-section-icon"><MessageSquareQuote size={18} aria-hidden="true" /></span><div><h3>Client testimonials <span>{profile.reviews.length}/10</span></h3><p>Share client feedback with their permission.</p></div><Button variant="outline" size="sm" type="button" disabled={profile.reviews.length >= 10} onClick={() => update("reviews", [...profile.reviews, { author: "", rating: 5, text: "" }])}><Plus size={14} aria-hidden="true" />Add testimonial</Button></div>
            {!profile.reviews.length && <div className="staff-profile-empty"><MessageSquareQuote size={24} aria-hidden="true" /><strong>No testimonials yet</strong><p>Testimonials are labeled as shared by the salon.</p></div>}
            {profile.reviews.map((review, index) => <fieldset className="staff-profile-entry" key={index}><legend>Testimonial {index + 1}</legend><div className="profile-form-grid"><label>Client display name<Input required maxLength={100} value={review.author} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, author: e.target.value } : row))} placeholder="Client’s preferred name" /></label>
              <label>Rating<NativeSelect value={review.rating} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, rating: Number(e.target.value) } : row))}>{[5,4,3,2,1].map(rating => <NativeSelectOption key={rating} value={rating}>{rating} {rating === 1 ? "star" : "stars"}</NativeSelectOption>)}</NativeSelect></label>
              <label className="staff-profile-wide">Testimonial<Textarea required rows={3} maxLength={1000} value={review.text} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, text: e.target.value } : row))} placeholder="What did the client love about their visit?" /></label></div><Button className="profile-remove" variant="ghost" size="sm" type="button" onClick={() => update("reviews", profile.reviews.filter((_, i) => i !== index))}>Remove testimonial {index + 1}</Button></fieldset>)}
          </section>
        </fieldset>
        <p className="staff-management-note"><ShieldCheck size={16} aria-hidden="true" />Appointments completed and clients served are calculated from completed visits. Use Manage skills to choose qualified services.</p>
      </div>
      <div className="staff-management-footer"><span>Visible to clients in Select Professional</span><div><Button variant="outline" type="button" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving profile…" : "Save public profile"}</Button></div></div>
    </form>
  </StaffManagementDialog>;
}
