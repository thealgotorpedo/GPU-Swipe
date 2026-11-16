import { Link } from "react-router-dom";

export interface GraphicsCardSummary {
  _id?: string;
  modelName?: string;
  gpuManufacturer?: string;
  boardPartner?: string;
  vramGB?: number;
}

export interface ListingData {
  _id?: string;
  sellerId?: string;
  imageUrls?: string[];
  title?: string;
  priceCents?: number;
  currency?: string;
  status?: string;
  condition?: string;
  createdAt?: string;
  graphicsCard?: GraphicsCardSummary | null;
}

interface ListingListProps {
  listings: ListingData[];
}

function formatPrice(priceCents: number | undefined, currency: string | undefined): string {
  if (priceCents === undefined || priceCents === null) return "$0.00";
  const amount = (priceCents / 100).toFixed(2);
  return currency === "USD" || !currency ? `$${amount}` : `${amount} ${currency}`;
}

function ListingList({ listings }: ListingListProps) {
  if (!listings.length) {
    return (
      <div id="listingEmpty" className="text-center py-5 card-dark-static p-4">
        <i className="bi bi-info-circle text-muted-custom fs-1 d-block mb-3"></i>
        <h3 className="h6 fw-bold text-slate-100 mb-1">No GPU Listings Found</h3>
        <p className="text-muted-custom small mb-0">
          Try searching for a different graphics card model or check back later.
        </p>
      </div>
    );
  }

  return (
    <div id="listingList" className="row g-4">
      {listings.map((listing) => {
        const gpu = listing.graphicsCard;
        const mainImage = listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[0] : null;
        const chipset = gpu?.gpuManufacturer || "GPU";
        const vram = gpu?.vramGB ? `${gpu.vramGB}GB` : "";
        const isSold = listing.status === "sold";

        return (
          <div key={listing._id} className="col-12 col-md-6 col-lg-4">
            <article className="card-dark h-100 d-flex flex-column overflow-hidden position-relative">
              
              {/* Card Image Banner */}
              <div
                className="position-relative overflow-hidden d-flex align-items-center justify-content-center"
                style={{ height: "180px", backgroundColor: "var(--bg-slate-950)" }}
              >
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={listing.title || "Graphics Card"}
                    className="w-100 h-100"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div className="text-center text-muted-custom p-3">
                    <i className="bi bi-cpu fs-1 text-emerald d-block mb-1 opacity-75"></i>
                    <span className="small text-uppercase font-monospace" style={{ fontSize: "0.68rem" }}>
                      Hardware Photo Pending
                    </span>
                  </div>
                )}

                {/* Top Floating Chipset Badge */}
                <div className="position-absolute top-0 start-0 m-2">
                  <span className="badge-pill-neon">
                    <i className="bi bi-cpu-fill me-1"></i>
                    {[chipset, vram].filter(Boolean).join(" • ")}
                  </span>
                </div>

                {/* Top Floating Price Badge */}
                <div className="position-absolute top-0 end-0 m-2">
                  <span className="badge-price-glow">
                    {formatPrice(listing.priceCents, listing.currency)}
                  </span>
                </div>

                {/* Sold Overlay */}
                {isSold && (
                  <div
                    className="position-absolute bottom-0 start-0 end-0 py-1 text-center font-monospace fw-bold small text-uppercase"
                    style={{ backgroundColor: "rgba(244, 63, 94, 0.9)", color: "#fff" }}
                  >
                    Sold Out
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
                <div>
                  <h3 className="h6 fw-bold mb-1 text-truncate" title={listing.title}>
                    <Link to={`/listings/${listing._id}`} className="text-slate-100 text-decoration-none">
                      {listing.title || "Untitled GPU Listing"}
                    </Link>
                  </h3>

                  <p className="small text-muted-custom mb-2">
                    {[gpu?.gpuManufacturer, gpu?.modelName].filter(Boolean).join(" ") || "Custom GPU"}
                    {gpu?.boardPartner ? ` · ${gpu.boardPartner}` : ""}
                  </p>
                </div>

                {/* Spec details row */}
                <div className="pt-2 border-top border-slate-800 d-flex align-items-center justify-content-between">
                  <span
                    className="badge font-monospace text-uppercase"
                    style={{
                      backgroundColor: "var(--bg-slate-950)",
                      border: "1px solid var(--border-slate-800)",
                      color: "var(--text-slate-300)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {listing.condition || "Used"}
                  </span>

                  <Link
                    to={`/listings/${listing._id}`}
                    className="small fw-bold text-emerald d-inline-flex align-items-center gap-1"
                  >
                    Inspect <i className="bi bi-chevron-right"></i>
                  </Link>
                </div>

              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}

export default ListingList;
