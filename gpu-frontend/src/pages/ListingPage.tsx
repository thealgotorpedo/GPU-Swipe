import { useEffect, useState } from "react";
import RateSeller from "../components/RateSeller";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { getSession } from "../utils/session";
import type { ListingData } from "../components/ListingList";
import { ratingText, type PublicProfile } from "../components/Profile";

interface Details extends ListingData {
  seller: PublicProfile | null;
}

export default function ListingPage() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<Details | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<Details>(`api/listings/${listingId}`)
      .then((res) => {
        if (!active) return;
        if (res.ok) setListing(res.data);
        else setMessage(res.error || "Listing not found.");
      })
      .catch(() => {
        if (active) setMessage("Could not load listing.");
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  async function toggleStatus() {
    if (!listing) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch<{ status: string }>(`api/listings/${listingId}/status`, {
        method: "PATCH",
        body: { status: listing.status === "sold" ? "active" : "sold" },
      });
      if (res.ok) setListing({ ...listing, status: res.data.status });
      else setMessage(res.error || "Could not change status.");
    } catch {
      setMessage("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isOwner = getSession()?.id === listing?.sellerId;
  const isSold = listing?.status === "sold";

  return (
    <section>
      <div className="mb-4">
        <Link to="/listings" className="btn btn-outline-brand btn-sm d-inline-flex align-items-center gap-2">
          <i className="bi bi-arrow-left"></i> Back to Marketplace
        </Link>
      </div>

      {message && (
        <div className="alert-custom-error mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {message}
        </div>
      )}

      {!listing ? (
        !message && (
          <div className="text-center py-5 card-dark-static p-4">
            <div className="spinner-border text-emerald mb-3" role="status"></div>
            <p className="text-muted-custom small mb-0 font-monospace">Loading GPU details…</p>
          </div>
        )
      ) : (
        <div className="row g-4">
          {/* Left Column: Photos */}
          <div className="col-12 col-lg-7">
            <div className="card-dark-static overflow-hidden p-3">
              {/* Main Photo Preview */}
              <div
                className="position-relative rounded-3 overflow-hidden d-flex align-items-center justify-content-center bg-slate-inset mb-3"
                style={{ height: "380px" }}
              >
                {listing.imageUrls && listing.imageUrls.length > 0 ? (
                  <img
                    src={listing.imageUrls[selectedPhotoIndex] || listing.imageUrls[0]}
                    alt={listing.title}
                    className="w-100 h-100"
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <div className="text-center text-muted-custom p-4">
                    <i className="bi bi-cpu fs-1 text-emerald d-block mb-2"></i>
                    <p className="small text-uppercase font-monospace mb-0">No seller photos uploaded</p>
                  </div>
                )}

                {/* Floating Status & Condition Badges */}
                <div className="position-absolute top-0 start-0 m-3 d-flex gap-2">
                  <span className={`badge font-monospace text-uppercase ${isSold ? "bg-danger" : "bg-success"}`}>
                    {listing.status || "active"}
                  </span>
                  <span className="badge-pill-neon">
                    {listing.condition || "Used"}
                  </span>
                </div>
              </div>

              {/* Thumbnail strip */}
              {listing.imageUrls && listing.imageUrls.length > 1 && (
                <div className="d-flex gap-2 overflow-auto pb-1">
                  {listing.imageUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(i)}
                      className="p-1 rounded-3 bg-slate-inset border-0 flex-shrink-0"
                      style={{
                        width: "80px",
                        height: "60px",
                        outline: selectedPhotoIndex === i ? "2px solid var(--emerald-400)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <img src={url} alt={`Thumbnail ${i + 1}`} className="w-100 h-100 rounded" style={{ objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Specs, Seller & Actions */}
          <div className="col-12 col-lg-5">
            <div className="card-dark-static p-4 space-y-4">
              {/* Header Title & Price */}
              <div className="border-bottom border-slate-800 pb-3 mb-3">
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div>
                    <h2 className="h4 fw-bold text-slate-100 mb-1">{listing.title}</h2>
                    <span className="text-muted-custom small font-monospace">
                      Listed on {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : "Marketplace"}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="h3 fw-black text-emerald font-monospace d-block mb-0">
                      ${((listing.priceCents || 0) / 100).toFixed(2)}
                    </span>
                    <span className="small text-muted-custom">{listing.currency || "USD"}</span>
                  </div>
                </div>
              </div>

              {/* Hardware Specifications Tiles */}
              <div className="mb-4">
                <h3 className="h6 fw-bold text-uppercase text-muted-custom font-monospace mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                  Hardware Specifications
                </h3>
                <div className="row g-2">
                  <div className="col-6">
                    <div className="spec-tile">
                      <i className="bi bi-cpu text-emerald fs-5"></i>
                      <div>
                        <span className="spec-label">Model</span>
                        <span className="spec-val text-truncate d-block">{listing.graphicsCard?.modelName || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="spec-tile">
                      <i className="bi bi-building text-teal fs-5"></i>
                      <div>
                        <span className="spec-label">Brand</span>
                        <span className="spec-val text-truncate d-block">{listing.graphicsCard?.gpuManufacturer || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="spec-tile">
                      <i className="bi bi-memory text-cyan fs-5"></i>
                      <div>
                        <span className="spec-label">VRAM</span>
                        <span className="spec-val d-block">{listing.graphicsCard?.vramGB ? `${listing.graphicsCard.vramGB} GB` : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="spec-tile">
                      <i className="bi bi-hdd-rack text-amber fs-5"></i>
                      <div>
                        <span className="spec-label">Partner</span>
                        <span className="spec-val text-truncate d-block">{listing.graphicsCard?.boardPartner || "Reference"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Profile Card */}
              <div className="mb-4">
                <h3 className="h6 fw-bold text-uppercase text-muted-custom font-monospace mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                  Seller Information
                </h3>
                {listing.seller ? (
                  <div className="bg-slate-inset p-3 rounded-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-emerald fw-bold"
                          style={{ width: "36px", height: "36px", backgroundColor: "var(--bg-slate-900)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                        >
                          <i className="bi bi-person-fill"></i>
                        </div>
                        <div>
                          <strong className="text-slate-100 d-block">{listing.seller.displayName || "Verified Seller"}</strong>
                          <span className="small text-amber font-monospace">
                            <i className="bi bi-star-fill text-amber me-1"></i>
                            {ratingText(listing.seller.sellerRating)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {listing.seller.bio && (
                      <p className="small text-slate-300 mb-2" style={{ whiteSpace: "pre-wrap" }}>
                        "{listing.seller.bio}"
                      </p>
                    )}

                    <div className="small pt-2 border-top border-slate-800 space-y-1">
                      {listing.seller.contactEmail && (
                        <div className="text-muted-custom">
                          <i className="bi bi-envelope me-2 text-emerald"></i>
                          <a href={`mailto:${listing.seller.contactEmail}`} className="text-slate-200">
                            {listing.seller.contactEmail}
                          </a>
                        </div>
                      )}
                      {listing.seller.contactPhone && (
                        <div className="text-muted-custom">
                          <i className="bi bi-telephone me-2 text-cyan"></i>
                          <span className="text-slate-200">{listing.seller.contactPhone}</span>
                        </div>
                      )}
                      {!listing.seller.contactEmail && !listing.seller.contactPhone && (
                        <span className="text-muted-custom italic">No direct contact details shared by seller.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-custom small">Seller information currently unavailable.</p>
                )}
              </div>

              {/* Owner Controls OR Rating Component */}
              {isOwner ? (
                <div className="pt-2">
                  <button
                    className={`btn w-100 fw-bold py-2 ${isSold ? "btn-outline-brand" : "btn-outline-danger"}`}
                    disabled={busy}
                    onClick={toggleStatus}
                  >
                    {busy ? (
                      "Updating Status…"
                    ) : isSold ? (
                      <>
                        <i className="bi bi-arrow-clockwise me-1"></i> Reactivate (Mark as Available)
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1"></i> Mark Listing as Sold
                      </>
                    )}
                  </button>
                </div>
              ) : (
                listing.seller && (
                  <RateSeller
                    key={listingId}
                    listingId={listingId!}
                    onRated={(sellerRating) =>
                      setListing({
                        ...listing,
                        seller: listing.seller ? { ...listing.seller, sellerRating } : null,
                      })
                    }
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
