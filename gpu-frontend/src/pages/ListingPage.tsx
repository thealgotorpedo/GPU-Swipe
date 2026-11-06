import { useEffect, useState } from "react";
import RateSeller from "../components/RateSeller";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { getSession } from "../utils/session";
import type { ListingData } from "../components/ListingList";
import { ratingText, type PublicProfile } from "../components/Profile";
interface Details extends ListingData { seller: PublicProfile | null }
export default function ListingPage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<Details | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    apiFetch<Details>(`api/listings/${listingId}`).then(res => {
      if (!active) return;
      if (res.ok) setListing(res.data); else setMessage(res.error || "Listing not found.");
    }).catch(() => { if (active) setMessage("Could not load listing."); });
    return () => { active = false; };
  }, [listingId]);
  async function toggleStatus() {
    if (!listing) return;
    setBusy(true); setMessage("");
    try {
      const res = await apiFetch<{ status: string }>(`api/listings/${listingId}/status`, {
        method: "PATCH", body: { status: listing.status === "sold" ? "active" : "sold" }
      });
      if (res.ok) setListing({ ...listing, status: res.data.status });
      else setMessage(res.error || "Could not change status.");
    } catch { setMessage("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section>
    <Link to="/listings">Back to listings</Link>
    {message && <p role="alert">{message}</p>}
    {!listing ? !message && <p role="status">Loading listing…</p> : <>
      <h2 className="mt-3">{listing.title}</h2>
      <p className="fs-4">{((listing.priceCents || 0) / 100).toFixed(2)} {listing.currency} · <strong>{listing.status}</strong></p>
      <div className="row g-3 mb-4">
        {listing.imageUrls?.length ? listing.imageUrls.map((url, i) => <div className="col-sm-6" key={i}>
          <img src={url} alt={`${listing.graphicsCard?.modelName || "Graphics card"}, seller photo ${i + 1}`} className="img-fluid rounded" style={{ maxHeight: 400, objectFit: "contain" }} />
        </div>) : <p>No seller photos uploaded.</p>}
      </div>
      <h3 className="h5">Card specifications</h3>
      <dl className="row">
        {Object.entries({ Model: listing.graphicsCard?.modelName, Manufacturer: listing.graphicsCard?.gpuManufacturer,
          'Board partner': listing.graphicsCard?.boardPartner, 'VRAM (GB)': listing.graphicsCard?.vramGB, Condition: listing.condition }).map(([label, value]) => <div className="col-sm-6" key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}
      </dl>
      <h3 className="h5">Seller</h3>
      {listing.seller ? <div className="card p-3 mb-3">
        <strong>{listing.seller.displayName}</strong><p>{ratingText(listing.seller.sellerRating)}</p>
        <p style={{ whiteSpace: "pre-wrap" }}>{listing.seller.bio}</p>
        {listing.seller.contactEmail && <p>Email: <a href={`mailto:${listing.seller.contactEmail}`}>{listing.seller.contactEmail}</a></p>}
        {listing.seller.contactPhone && <p>Phone: {listing.seller.contactPhone}</p>}
        {!listing.seller.contactEmail && !listing.seller.contactPhone && <p>This seller has not shared contact details.</p>}
      </div> : <p>Seller unavailable.</p>}
      {listing.seller && getSession()?.id !== listing.sellerId && <RateSeller key={listingId} listingId={listingId!} onRated={sellerRating => setListing({ ...listing, seller: listing.seller ? { ...listing.seller, sellerRating } : null })} />}
      {getSession()?.id === listing.sellerId && <button className="btn btn-outline-primary" disabled={busy} onClick={toggleStatus}>
        {busy ? "Saving…" : listing.status === "sold" ? "Mark as available" : "Mark as sold"}
      </button>}
    </>}
  </section>;
}
