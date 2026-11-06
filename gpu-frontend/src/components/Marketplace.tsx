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
    apiFetch<ListingData[]>(`api/listings?model=${encodeURIComponent(query.model)}&page=${query.page}`).then(res => {
      if (cancelled) return;
      setListings(res.ok ? res.data : []);
      setMessage(res.ok ? "" : res.error || "Could not load listings.");
    }).catch(() => { if (!cancelled) setMessage("Could not connect. Please try again."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [query]);
  function search(e: FormEvent) { e.preventDefault(); setBusy(true); setQuery({ model: input, page: 1 }); }
  return <section>
    <h2 className="h4">Current listings</h2>
    <form className="d-flex gap-2 mb-4" onSubmit={search}>
      <label className="visually-hidden" htmlFor="modelSearch">Graphics card model</label>
      <input id="modelSearch" className="form-control" placeholder="Search by model, e.g. RTX 4090" maxLength={100} value={input} onChange={e => setInput(e.target.value)} />
      <button className="btn btn-primary" disabled={busy}>Search</button>
    </form>
    {busy ? <p role="status">Loading listings…</p> : message ? <p role="alert">{message}</p> : <ListingList listings={listings} />}
    <div className="d-flex gap-3 align-items-center mt-4">
      <button className="btn btn-outline-primary" disabled={busy || query.page === 1} onClick={() => { setBusy(true); setQuery({ ...query, page: query.page - 1 }); }}>Previous</button>
      <span>Page {query.page}</span>
      <button className="btn btn-outline-primary" disabled={busy || listings.length < 24} onClick={() => { setBusy(true); setQuery({ ...query, page: query.page + 1 }); }}>Next</button>
    </div>
  </section>;
}
