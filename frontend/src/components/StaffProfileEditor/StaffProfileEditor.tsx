import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { emptyStaffProfile, type StaffPublicProfile } from "../../utils/staff-profile";

import "./StaffProfileEditor.css";

export function StaffProfileEditor({ staffId, name, initial, busy, onBusy, onSaved, onClose }: {
  staffId: string; name: string; initial: StaffPublicProfile | null; busy: boolean;
  onBusy: (busy: boolean) => void; onSaved: (profile: StaffPublicProfile) => void; onClose: () => void;
}) {
  const [profile, setProfile] = useState<StaffPublicProfile>(() => initial ?? emptyStaffProfile());
  const [languages, setLanguages] = useState(initial?.languages.join(", ") ?? "");
  const [error, setError] = useState("");
  const sending = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { form.current?.focus(); form.current?.scrollIntoView({ block: "start" }); }, []);
  const update = <K extends keyof StaffPublicProfile>(key: K, value: StaffPublicProfile[K]) => setProfile(current => ({ ...current, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault(); if (sending.current) return;
    sending.current = true; onBusy(true); setError("");
    try {
      const body = { ...profile, title: profile.title.trim(), bio: profile.bio.trim(), photoUrl: profile.photoUrl?.trim() || null,
        languages: [...new Set(languages.split(",").map(value => value.trim()).filter(Boolean))] };
      const result = await api<{ record: { publicProfile: StaffPublicProfile } }>(`/configuration/staff/${staffId}/profile`, { method: "PUT", body: JSON.stringify(body) });
      onSaved(result.record.publicProfile);
    } catch (err) { setError(err instanceof Error ? err.message : "The profile could not be saved."); }
    finally { sending.current = false; onBusy(false); }
  }
  return <form ref={form} tabIndex={-1} className="account-form staff-profile-editor" onSubmit={save} aria-label={`Edit public profile for ${name}`}>
    <div className="section-heading"><div><p className="eyebrow">CUSTOMER BOOKING PROFILE</p><h3>{name}</h3><p className="muted">Saved details appear in Select Professional. Use public image links for the portrait and portfolio.</p></div></div>
    <fieldset disabled={busy}>
      <div className="form-grid"><label>Professional title<Input required maxLength={100} value={profile.title} onChange={e => update("title", e.target.value)} placeholder="Senior hairstylist" /></label>
        <label>Languages (comma-separated)<Input value={languages} onChange={e => setLanguages(e.target.value)} maxLength={410} placeholder="English, Tagalog" /></label>
        <label className="staff-profile-wide">Profile photo URL<Input type="url" pattern="https://.*" maxLength={2048} value={profile.photoUrl ?? ""} onChange={e => update("photoUrl", e.target.value || null)} placeholder="https://example.com/portrait.jpg" /><small>HTTPS image link. Leave blank to use the illustrated avatar.</small></label>
        <label className="staff-profile-wide">About this professional<Textarea rows={4} maxLength={2000} value={profile.bio} onChange={e => update("bio", e.target.value)} placeholder="Introduce their approach, experience, and specialties." /></label></div>
      <p className="staff-profile-note">Appointments completed and clients served are calculated from completed visits with performed services. Qualified services are managed in Qualifications.</p>
      <section aria-label="Portfolio editor"><div className="section-heading"><div><h4>Portfolio</h4><p className="muted">Show up to 8 examples of this professional’s work.</p></div><Button variant="outline" type="button" disabled={profile.portfolio.length >= 8} onClick={() => update("portfolio", [...profile.portfolio, { title: "", imageUrl: "", caption: "" }])}>+ Add portfolio item</Button></div>
        {!profile.portfolio.length && <p className="staff-profile-empty">No portfolio items yet.</p>}
        {profile.portfolio.map((item, index) => <fieldset className="staff-profile-entry" key={index}><legend>Portfolio item {index + 1}</legend><div className="form-grid">
          <label>Title<Input required maxLength={100} value={item.title} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} /></label>
          <label>Image URL<Input required type="url" pattern="https://.*" maxLength={2048} value={item.imageUrl} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, imageUrl: e.target.value } : row))} /></label>
          <label className="staff-profile-wide">Caption<Textarea rows={2} maxLength={300} value={item.caption} onChange={e => update("portfolio", profile.portfolio.map((row, i) => i === index ? { ...row, caption: e.target.value } : row))} /></label></div>
          <Button variant="outline" type="button" onClick={() => update("portfolio", profile.portfolio.filter((_, i) => i !== index))}>Remove portfolio item {index + 1}</Button></fieldset>)}
      </section>
      <section aria-label="Testimonials editor"><div className="section-heading"><div><h4>Client testimonials</h4><p className="muted">Publish up to 10 client testimonials with permission. These are labeled as shared by the salon.</p></div><Button variant="outline" type="button" disabled={profile.reviews.length >= 10} onClick={() => update("reviews", [...profile.reviews, { author: "", rating: 5, text: "" }])}>+ Add testimonial</Button></div>
        {!profile.reviews.length && <p className="staff-profile-empty">No testimonials yet.</p>}
        {profile.reviews.map((review, index) => <fieldset className="staff-profile-entry" key={index}><legend>Testimonial {index + 1}</legend><div className="form-grid"><label>Client display name<Input required maxLength={100} value={review.author} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, author: e.target.value } : row))} /></label>
          <label>Rating<NativeSelect value={review.rating} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, rating: Number(e.target.value) } : row))}>{[5,4,3,2,1].map(rating => <NativeSelectOption key={rating} value={rating}>{rating} {rating === 1 ? "star" : "stars"}</NativeSelectOption>)}</NativeSelect></label>
          <label className="staff-profile-wide">Testimonial<Textarea required rows={3} maxLength={1000} value={review.text} onChange={e => update("reviews", profile.reviews.map((row, i) => i === index ? { ...row, text: e.target.value } : row))} /></label></div><Button variant="outline" type="button" onClick={() => update("reviews", profile.reviews.filter((_, i) => i !== index))}>Remove testimonial {index + 1}</Button></fieldset>)}
      </section>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions"><Button variant="default" className="primary" disabled={busy}>{busy ? "Saving profile…" : "Save public profile"}</Button><Button variant="outline" type="button" onClick={onClose}>Cancel</Button></div>
    </fieldset>
  </form>;
}
