import { useEffect, useState, type FormEvent } from "react";
import ListingList, { type ListingData } from "./ListingList";
import { apiFetch } from "../utils/api";

export default function Marketplace() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState({ model: "", page: 1 });
  const [listings, setListings] = useState<ListingData[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ListingData[]>(`api/listings?model=${encodeURIComponent(query.model)}&page=${query.page}`)
      .then((res) => {
        if (cancelled) return;
        setListings(res.ok ? res.data : []);
        setMessage(res.ok ? "" : res.error || "Could not load listings.");
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not connect. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);
  function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setQuery({ model: input, page: 1 });
  }

  return (
    <section>
      {/* Top Search & Filter Bar */}
      <div className="card-dark-static p-4 mb-4">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1 text-slate-100 d-flex align-items-center gap-2">
              <i className="bi bi-search text-emerald"></i> Find Graphics Cards
            </h2>
            <p className="small text-muted-custom mb-0">
              Browse verified graphics card hardware available in the marketplace.
            </p>
          </div>

          <span className="badge-pill-neon align-self-start align-self-md-auto">
            Page {query.page}
          </span>
        </div>

        <form className="marketplace-search d-flex flex-column flex-sm-row gap-2" onSubmit={search}>
          <div className="position-relative flex-grow-1">
            <i
              className="bi bi-search text-muted-custom position-absolute top-50 translate-middle-y ms-3"
              style={{ pointerEvents: "none" }}
            ></i>
            <input
              id="modelSearch"
              className="form-control ps-5"
              placeholder="Search by card model, e.g. 'RTX 4090', 'RX 7900', 'GTX'..."
              maxLength={100}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button className="btn btn-primary px-4 d-inline-flex align-items-center gap-2" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Searching…</span>
              </>
            ) : (
              <>
                <span>Search</span>
                <i className="bi bi-arrow-right"></i>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      {busy ? (
        <div className="text-center py-5 card-dark-static p-4">
          <div className="spinner-border text-emerald mb-3" role="status">
            <span className="visually-hidden">Loading listings…</span>
          </div>
          <p className="text-muted-custom small mb-0 font-monospace">Fetching GPU inventory…</p>
        </div>
      ) : message ? (
        <div className="alert-custom-error mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {message}
        </div>
      ) : (
        <ListingList listings={listings} />
      )}

      {/* Pagination Footer */}
      <div className="pagination-controls d-flex flex-wrap justify-content-between align-items-center mt-4 pt-3 border-top border-slate-800">
        <button
          className="btn btn-outline-brand d-inline-flex align-items-center gap-2"
          disabled={busy || query.page === 1}
          onClick={() => {
            setBusy(true);
            setQuery({ ...query, page: query.page - 1 });
          }}
        >
          <i className="bi bi-chevron-left"></i> Previous
        </button>

        <span className="small font-monospace text-muted-custom">
          Page <strong className="text-emerald">{query.page}</strong>
        </span>

        <button
          className="btn btn-outline-brand d-inline-flex align-items-center gap-2"
          disabled={busy || listings.length < 24}
          onClick={() => {
            setBusy(true);
            setQuery({ ...query, page: query.page + 1 });
          }}
        >
          Next <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </section>
  );
}
