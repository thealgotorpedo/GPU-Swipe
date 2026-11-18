import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../utils/api";
import type { PublicProfile } from "../utils/profile";

export default function RateSeller({
  listingId,
  onRated,
}: {
  listingId: string;
  onRated: (rating: PublicProfile["sellerRating"]) => void;
}) {
  const [existing, setExisting] = useState<number | null>(null);
  const [score, setScore] = useState("5");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<{ score: number | null }>(`api/listings/${listingId}/rating`)
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setExisting(res.data.score);
          setReady(true);
        } else {
          setMessage(res.error || "Could not load your rating.");
        }
      })
      .catch(() => {
        if (active) setMessage("Could not load your rating. Refresh to retry.");
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch<{
        score: number;
        sellerRating: PublicProfile["sellerRating"];
      }>(`api/listings/${listingId}/rating`, {
        method: "POST",
        body: { score: Number(score) },
      });
      if (res.ok) {
        setExisting(res.data.score);
        onRated(res.data.sellerRating);
      } else {
        setMessage(res.error || "Could not save rating.");
        if (res.status === 409) setReady(false);
      }
    } catch {
      setMessage("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-slate-inset p-3 rounded-3 mt-3">
      <h4 className="h6 fw-bold text-slate-100 d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-star-half text-amber"></i> Community Seller Rating
      </h4>

      {message && (
        <div className="alert-custom-error mb-2 py-2 small" role="alert">
          {message}
        </div>
      )}

      {existing ? (
        <div className="alert-custom-success py-2 small mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill"></i>
          <span>
            You rated this seller <strong>{existing} / 5 stars</strong> for this listing.
          </span>
        </div>
      ) : ready ? (
        <form onSubmit={submit}>
          <label htmlFor="sellerScore" className="form-label" style={{ fontSize: "0.75rem" }}>
            Score (1-5 Stars)
          </label>
          <div className="d-flex gap-2 mb-2">
            <select
              id="sellerScore"
              className="form-select flex-grow-1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {"★".repeat(value)} ({value} / 5 Stars)
                </option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm px-3" disabled={busy}>
              {busy ? "Saving…" : "Rate"}
            </button>
          </div>
          <span className="text-muted-custom" style={{ fontSize: "0.7rem" }}>
            Ratings are final and contribute to the seller's aggregate trust score.
          </span>
        </form>
      ) : (
        !message && <p className="text-muted-custom small mb-0">Checking your rating status…</p>
      )}
    </div>
  );
}
