import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../utils/api";
import type { PublicProfile } from "./Profile";
export default function RateSeller({ listingId, onRated }: { listingId: string; onRated: (rating: PublicProfile['sellerRating']) => void }) {
  const [existing, setExisting] = useState<number | null>(null);
  const [score, setScore] = useState("5");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    apiFetch<{ score: number | null }>(`api/listings/${listingId}/rating`).then(res => {
      if (!active) return;
      if (res.ok) { setExisting(res.data.score); setReady(true); }
      else setMessage(res.error || "Could not load your rating.");
    }).catch(() => { if (active) setMessage("Could not load your rating. Refresh to retry."); });
    return () => { active = false; };
  }, [listingId]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const res = await apiFetch<{ score: number; sellerRating: PublicProfile['sellerRating'] }>(`api/listings/${listingId}/rating`, { method: "POST", body: { score: Number(score) } });
      if (res.ok) { setExisting(res.data.score); onRated(res.data.sellerRating); }
      else { setMessage(res.error || "Could not save rating."); if (res.status === 409) setReady(false); }
    } catch { setMessage("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="card p-3 mt-3">
    <h3 className="h5">Rate this seller</h3>
    {message && <p role="alert">{message}</p>}
    {existing ? <p role="status">You rated this seller {existing} / 5 for this listing.</p> : ready ? <form onSubmit={submit}>
      <label htmlFor="sellerScore" className="form-label">Your rating (one per listing)</label>
      <select id="sellerScore" className="form-select mb-3" value={score} onChange={e => setScore(e.target.value)}>
        {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} / 5</option>)}
      </select><button className="btn btn-primary" disabled={busy}>{busy ? "Submitting…" : "Submit rating"}</button>
    </form> : !message && <p>Loading your rating…</p>}
  </div>;
}
