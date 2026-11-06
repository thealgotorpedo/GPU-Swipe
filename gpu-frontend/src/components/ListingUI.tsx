import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../utils/api";
import ListingList, { type ListingData } from "./ListingList";

type Feedback = { text: string; isError: boolean } | null;

function ListingUI() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formFeedback, setFormFeedback] = useState<Feedback>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("used");
  const [modelName, setModelName] = useState("");
  const [gpuManufacturer, setGpuManufacturer] = useState("");
  const [boardPartner, setBoardPartner] = useState("");
  const [vramGB, setVramGB] = useState("");

  useEffect(() => {
    let cancelled = false;

    apiFetch<ListingData[]>("api/listings?mine=true")
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setListings(res.data);
          setLoadMessage(`${res.data.length} listing(s)`);
        } else {
          setListings([]);
          setLoadMessage(res.error ?? "Could not load listings");
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setListings([]);
        setLoadMessage((error as Error).toString());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setFormFeedback(null);

    const dollars = Number(price);
    if (!Number.isFinite(dollars) || dollars < 0) {
      setFormFeedback({ text: "Enter a price of zero or more.", isError: true });
      setIsSaving(false);
      return;
    }

    const memory = Number(vramGB);
    if (!Number.isInteger(memory) || memory <= 0) {
      setFormFeedback({ text: "VRAM must be a whole number of gigabytes.", isError: true });
      setIsSaving(false);
      return;
    }

    try {
      const res = await apiFetch<ListingData>("api/listings", {
        method: "POST",
        body: {
          title,
          priceCents: Math.round(dollars * 100),
          condition,
          modelName,
          gpuManufacturer,
          boardPartner,
          vramGB: memory,
        },
      });

      if (!res.ok) {
        setFormFeedback({ text: res.error ?? "Could not create the listing", isError: true });
        return;
      }

      setListings((current) => [res.data, ...current]);
      setLoadMessage(`${listings.length + 1} listing(s)`);
      setTitle("");
      setPrice("");
      setCondition("used");
      setModelName("");
      setGpuManufacturer("");
      setBoardPartner("");
      setVramGB("");
      setFormFeedback({ text: "Listing created.", isError: false });
    } catch (error: unknown) {
      setFormFeedback({ text: (error as Error).toString(), isError: true });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div id="listingUI" className="row g-4">
      <section className="col-lg-5">
        <form onSubmit={handleCreate} className="border rounded-4 bg-white shadow-sm p-4">
          <h2 className="h5 mb-3">Create a listing</h2>

          <div className="form-floating mb-3">
            <input id="listingTitle" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
            <label htmlFor="listingTitle">Title</label>
          </div>

          <div className="form-floating mb-3">
            <input id="modelName" className="form-control" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Model" required />
            <label htmlFor="modelName">Model</label>
          </div>

          <div className="form-floating mb-3">
            <input id="gpuManufacturer" className="form-control" value={gpuManufacturer} onChange={(e) => setGpuManufacturer(e.target.value)} placeholder="Manufacturer" required />
            <label htmlFor="gpuManufacturer">Manufacturer</label>
          </div>

          <div className="form-floating mb-3">
            <input id="boardPartner" className="form-control" value={boardPartner} onChange={(e) => setBoardPartner(e.target.value)} placeholder="Board partner" />
            <label htmlFor="boardPartner">Board partner</label>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6 form-floating">
              <input id="vramGB" className="form-control" inputMode="numeric" value={vramGB} onChange={(e) => setVramGB(e.target.value)} placeholder="VRAM GB" required />
              <label htmlFor="vramGB">VRAM (GB)</label>
            </div>
            <div className="col-6 form-floating">
              <input id="listingPrice" className="form-control" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" required />
              <label htmlFor="listingPrice">Price (USD)</label>
            </div>
          </div>

          <div className="form-floating mb-4">
            <select id="condition" className="form-select" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
            <label htmlFor="condition">Condition</label>
          </div>

          <button id="createListingButton" type="submit" className="btn btn-primary w-100" disabled={isSaving}>
            {isSaving ? "Saving..." : "Create listing"}
          </button>

          {formFeedback ? (
            <p id="listingFormResult" className={`mt-3 mb-0 ${formFeedback.isError ? "text-danger" : "text-success"}`} role="status">
              {formFeedback.text}
            </p>
          ) : null}
        </form>
      </section>

      <section className="col-lg-7">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Your listings</h2>
          <span id="listingCount" className="text-secondary small" aria-live="polite">
            {isLoading ? "Loading..." : loadMessage}
          </span>
        </div>
        {isLoading ? null : <ListingList listings={listings} />}
      </section>
    </div>
  );
}

export default ListingUI;
