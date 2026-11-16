import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../utils/api";
import LoggedInName from "./LoggedInName";
import ListingList, { type ListingData } from "./ListingList";

export interface PublicProfile {
  id: string;
  login: string;
  displayName: string;
  bio: string;
  contactEmail: string;
  contactPhone: string;
  sellerRating: { average: number | null; count: number };
}

export function ratingText(rating: PublicProfile["sellerRating"]) {
  return rating.count
    ? `${rating.average?.toFixed(1)} / 5 (${rating.count} ratings)`
    : "No ratings yet";
}

export default function Profile() {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<PublicProfile>("api/profile")
      .then((res) => {
        if (!active) return;
        if (res.ok) setProfile(res.data);
        else setMessage(res.error || "Could not load profile.");
      })
      .catch(() => {
        if (active) setMessage("Could not load profile.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<ListingData[]>(`api/listings?mine=true&page=${page}`)
      .then((res) => {
        if (!active) return;
        if (res.ok) setListings(res.data);
        else setMessage(res.error || "Could not load your listings.");
      })
      .catch(() => {
        if (active) setMessage("Could not load your listings.");
      });
    return () => {
      active = false;
    };
  }, [page]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch<PublicProfile>("api/profile", {
        method: "PATCH",
        body: profile,
      });
      if (res.ok) {
        setProfile(res.data);
        setMessage("Public profile saved successfully.");
      } else {
        setMessage(res.error || "Could not save profile.");
      }
    } catch {
      setMessage("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <LoggedInName />

      <div className="card-dark-static p-4 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="h5 fw-bold text-slate-100 mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-person-lines-fill text-emerald"></i> Public Seller Profile
            </h2>
            <p className="small text-muted-custom mb-0">
              Your account email stays private. Details entered here are visible to prospective buyers.
            </p>
          </div>

          {profile && (
            <span className="badge-pill-neon">
              <i className="bi bi-star-fill text-amber me-1"></i>
              {ratingText(profile.sellerRating)}
            </span>
          )}
        </div>

        {message && (
          <div className="alert-custom-info mb-3" role="status">
            <i className="bi bi-info-circle-fill me-2 text-emerald"></i>
            {message}
          </div>
        )}

        {profile ? (
          <form onSubmit={save}>
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="displayName">
                  Display Name
                </label>
                <input
                  className="form-control"
                  id="displayName"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Alex Tech"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="contactEmail">
                  Public Contact Email
                </label>
                <input
                  className="form-control"
                  id="contactEmail"
                  type="email"
                  maxLength={254}
                  placeholder="contact@example.com"
                  value={profile.contactEmail}
                  onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="contactPhone">
                  Public Contact Phone
                </label>
                <input
                  className="form-control"
                  id="contactPhone"
                  type="text"
                  maxLength={40}
                  placeholder="(555) 000-0000"
                  value={profile.contactPhone}
                  onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                />
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="bio">
                  Seller Bio & Hardware Experience
                </label>
                <textarea
                  className="form-control"
                  id="bio"
                  rows={3}
                  maxLength={1000}
                  placeholder="Tell buyers about your hardware handling, testing setups, non-smoking environment, etc."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </div>

            <button className="btn btn-primary px-4 fw-bold" disabled={busy}>
              {busy ? "Saving Profile…" : "Save Public Profile"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="spinner-border text-emerald mb-2" role="status"></div>
            <p className="text-muted-custom small mb-0 font-monospace">Loading your profile…</p>
          </div>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 fw-bold text-slate-100 mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-collection text-teal"></i> Your Listed GPUs
        </h2>
        <span className="small text-muted-custom font-monospace">Page {page}</span>
      </div>

      <ListingList listings={listings} />

      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-slate-800">
        <button
          className="btn btn-outline-brand d-inline-flex align-items-center gap-2"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <i className="bi bi-chevron-left"></i> Previous
        </button>

        <span className="small font-monospace text-muted-custom">
          Page <strong className="text-emerald">{page}</strong>
        </span>

        <button
          className="btn btn-outline-brand d-inline-flex align-items-center gap-2"
          disabled={listings.length < 24}
          onClick={() => setPage(page + 1)}
        >
          Next <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </section>
  );
}
