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

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [readingPhotos, setReadingPhotos] = useState(false);
  const [photoInputKey, setPhotoInputKey] = useState(0);
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
    if (readingPhotos || isSaving) return;
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
          imageUrls,
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
      setImageUrls([]);
      setPhotoInputKey((key) => key + 1);
      setTitle("");
      setPrice("");
      setCondition("used");
      setModelName("");
      setGpuManufacturer("");
      setBoardPartner("");
      setVramGB("");
      setFormFeedback({ text: "Listing created successfully!", isError: false });
    } catch (error: unknown) {
      setFormFeedback({ text: (error as Error).toString(), isError: true });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div id="listingUI" className="row g-4">
      {/* Create Listing Form Column */}
      <section className="col-12 col-lg-5">
        <form onSubmit={handleCreate} className="card-dark-static p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-emerald"
              style={{ width: "36px", height: "36px", backgroundColor: "var(--bg-slate-950)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
            >
              <i className="bi bi-plus-circle-fill fs-5"></i>
            </div>
            <div>
              <h2 className="h5 fw-bold text-slate-100 mb-0">List Your GPU Card</h2>
              <span className="text-muted-custom small" style={{ fontSize: "0.75rem" }}>
                Post your graphics card for buyers in the marketplace
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-3">
            <label htmlFor="listingTitle" className="form-label">
              Listing Title
            </label>
            <input
              id="listingTitle"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ASUS ROG Strix RTX 3080 10GB OC"
              required
            />
          </div>

          {/* Model & Manufacturer */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="modelName" className="form-label">
                Model Name
              </label>
              <input
                id="modelName"
                className="form-control"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. RTX 3080"
                required
              />
            </div>
            <div className="col-6">
              <label htmlFor="gpuManufacturer" className="form-label">
                Manufacturer
              </label>
              <input
                id="gpuManufacturer"
                className="form-control"
                value={gpuManufacturer}
                onChange={(e) => setGpuManufacturer(e.target.value)}
                placeholder="e.g. NVIDIA, AMD"
                required
              />
            </div>
          </div>

          {/* Board Partner & VRAM */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="boardPartner" className="form-label">
                Board Partner
              </label>
              <input
                id="boardPartner"
                className="form-control"
                value={boardPartner}
                onChange={(e) => setBoardPartner(e.target.value)}
                placeholder="e.g. ASUS, EVGA"
              />
            </div>
            <div className="col-6">
              <label htmlFor="vramGB" className="form-label">
                VRAM (GB)
              </label>
              <input
                id="vramGB"
                className="form-control"
                inputMode="numeric"
                value={vramGB}
                onChange={(e) => setVramGB(e.target.value)}
                placeholder="10"
                required
              />
            </div>
          </div>

          {/* Price & Condition */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="listingPrice" className="form-label">
                Price (USD $)
              </label>
              <input
                id="listingPrice"
                className="form-control"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="420"
                required
              />
            </div>
            <div className="col-6">
              <label htmlFor="condition" className="form-label">
                Condition
              </label>
              <select
                id="condition"
                className="form-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="new">Brand New / Sealed</option>
                <option value="used">Used / Good</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          {/* Photo Dropzone */}
          <div className="mb-4">
            <label htmlFor="photos" className="form-label d-flex justify-content-between">
              <span>GPU Photos (Up to 4, max 1MB each)</span>
              {imageUrls.length > 0 && (
                <span className="text-emerald font-monospace">{imageUrls.length} / 4 loaded</span>
              )}
            </label>
            <input
              key={photoInputKey}
              id="photos"
              className="form-control mb-2"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={isSaving || readingPhotos}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                setImageUrls([]);
                if (
                  files.length > 4 ||
                  files.some(
                    (file) =>
                      file.size > 1024 * 1024 ||
                      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
                  )
                ) {
                  setFormFeedback({
                    text: "Choose up to four JPEG, PNG, or WebP photos, at most 1 MB each.",
                    isError: true,
                  });
                  e.target.value = "";
                  return;
                }
                setReadingPhotos(true);
                try {
                  const urls = await Promise.all(
                    files.map(
                      (file) =>
                        new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(String(reader.result));
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        })
                    )
                  );
                  setImageUrls(urls);
                  setFormFeedback(null);
                } catch {
                  setFormFeedback({
                    text: "Could not read photos. Please choose them again.",
                    isError: true,
                  });
                } finally {
                  setReadingPhotos(false);
                }
              }}
            />

            {/* Photo Previews */}
            {imageUrls.length > 0 && (
              <div className="d-flex gap-2 flex-wrap pt-2">
                {imageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="position-relative rounded-2 overflow-hidden bg-slate-inset"
                    style={{ width: "80px", height: "65px" }}
                  >
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="w-100 h-100"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            id="createListingButton"
            type="submit"
            className="btn btn-primary w-100 py-2 fs-6 fw-bold text-uppercase font-monospace"
            disabled={isSaving || readingPhotos}
          >
            {isSaving ? "Publishing Listing…" : readingPhotos ? "Reading Photos…" : "Publish GPU Listing"}
          </button>

          {formFeedback && (
            <div
              id="listingFormResult"
              className={`mt-3 ${formFeedback.isError ? "alert-custom-error" : "alert-custom-success"}`}
              role="status"
            >
              {formFeedback.text}
            </div>
          )}
        </form>
      </section>

      {/* Seller's Existing Listings Column */}
      <section className="col-12 col-lg-7">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="h5 fw-bold text-slate-100 mb-0">Your Active Inventory</h2>
            <span className="text-muted-custom small font-monospace">Listings posted from this account</span>
          </div>
          <span id="listingCount" className="badge-pill-neon" aria-live="polite">
            {isLoading ? "Loading..." : loadMessage}
          </span>
        </div>
        {isLoading ? (
          <div className="text-center py-5 card-dark-static p-4">
            <div className="spinner-border text-emerald mb-2" role="status"></div>
            <p className="text-muted-custom small mb-0">Loading your listings…</p>
          </div>
        ) : (
          <ListingList listings={listings} />
        )}
      </section>
    </div>
  );
}

export default ListingUI;
