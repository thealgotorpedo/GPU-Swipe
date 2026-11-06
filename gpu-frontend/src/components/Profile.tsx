import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../utils/api";
import LoggedInName from "./LoggedInName";
import ListingList, { type ListingData } from "./ListingList";
export interface PublicProfile {
  id: string; login: string; displayName: string; bio: string;
  contactEmail: string; contactPhone: string;
  sellerRating: { average: number | null; count: number };
}
export function ratingText(rating: PublicProfile["sellerRating"]) {
  return rating.count ? `${rating.average?.toFixed(1)} / 5 (${rating.count} ratings)` : "No ratings yet";
}
export default function Profile() {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    apiFetch<PublicProfile>("api/profile").then(res => {
      if (!active) return;
      if (res.ok) setProfile(res.data); else setMessage(res.error || "Could not load profile.");
    }).catch(() => { if (active) setMessage("Could not load profile."); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    apiFetch<ListingData[]>(`api/listings?mine=true&page=${page}`).then(res => {
      if (!active) return;
      if (res.ok) setListings(res.data); else setMessage(res.error || "Could not load your listings.");
    }).catch(() => { if (active) setMessage("Could not load your listings."); });
    return () => { active = false; };
  }, [page]);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const res = await apiFetch<PublicProfile>("api/profile", { method: "PATCH", body: profile });
      if (res.ok) { setProfile(res.data); setMessage("Public profile saved."); }
      else setMessage(res.error || "Could not save profile.");
    } catch { setMessage("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section>
    <LoggedInName />
    <h2 className="h4">My public profile</h2>
    <p>Your account email stays private. Contact details entered here are visible to signed-in buyers.</p>
    {message && <p role="status">{message}</p>}
    {profile ? <form onSubmit={save} className="card p-4 mb-4">
      <p>Seller rating: {ratingText(profile.sellerRating)}</p>
      {([['displayName', 'Display name', 100], ['bio', 'About you', 1000], ['contactEmail', 'Public contact email', 254], ['contactPhone', 'Public contact phone', 40]] as const).map(([key, label, max]) => <div className="mb-3" key={key}>
        <label className="form-label" htmlFor={key}>{label}</label>
        <input className="form-control" id={key} type={key === 'contactEmail' ? 'email' : 'text'} maxLength={max} value={profile[key]} onChange={e => setProfile({ ...profile, [key]: e.target.value })} />
      </div>)}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save public profile"}</button>
    </form> : <p>Loading profile…</p>}
    <h2 className="h4">Your listings</h2><ListingList listings={listings} />
    <div className="d-flex gap-3 mt-3">
      <button className="btn btn-outline-primary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button className="btn btn-outline-primary" disabled={listings.length < 24} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </section>;
}
