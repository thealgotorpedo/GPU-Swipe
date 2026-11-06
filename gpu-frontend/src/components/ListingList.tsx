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
  if (priceCents === undefined || priceCents === null) return "";
  const amount = (priceCents / 100).toFixed(2);
  return currency === "USD" || !currency ? `$${amount}` : `${amount} ${currency}`;
}

function ListingList({ listings }: ListingListProps) {
  if (!listings.length) {
    return (
      <p id="listingEmpty" className="text-secondary mb-0">
        No listings found.
      </p>
    );
  }

  return (
    <div id="listingList" className="d-flex flex-column gap-3">
      {listings.map((listing) => {
        const gpu = listing.graphicsCard;
        return (
          <article key={listing._id} className="border rounded-3 bg-white shadow-sm p-3">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
              <div>
                <h3 className="h5 mb-1"><Link to={`/listings/${listing._id}`}>{listing.title || "Untitled listing"}</Link></h3>
                <p className="mb-1 text-body-secondary">
                  {[gpu?.gpuManufacturer, gpu?.modelName].filter(Boolean).join(" ") || "Graphics processor"}
                  {gpu?.vramGB ? ` · ${gpu.vramGB} GB` : ""}
                </p>
                {gpu?.boardPartner ? (
                  <p className="mb-0 small text-secondary">Board partner: {gpu.boardPartner}</p>
                ) : null}
              </div>
              <div className="text-md-end">
                <div className="fw-semibold">{formatPrice(listing.priceCents, listing.currency)}</div>
                <div className="small text-secondary text-capitalize">{listing.condition} · {listing.status}</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default ListingList;
