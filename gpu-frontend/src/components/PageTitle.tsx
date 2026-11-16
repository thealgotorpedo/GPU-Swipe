function PageTitle() {
  return (
    <header className="py-3 mb-4 border-bottom" style={{ borderColor: "var(--border-slate-800)" }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 p-1"
            style={{
              width: "44px",
              height: "44px",
              background: "var(--gradient-emerald-teal)",
              boxShadow: "var(--shadow-emerald-glow)",
            }}
          >
            <div
              className="w-100 h-100 rounded-3 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: "var(--bg-slate-950)" }}
            >
              <i className="bi bi-fire text-emerald fs-4" aria-hidden="true"></i>
            </div>
          </div>
          <div>
            <h1 id="title" className="h4 fw-bold mb-0 text-gradient-brand">
              GPU Marketplace
            </h1>
            <span
              className="text-emerald text-uppercase fw-semibold"
              style={{ fontSize: "0.68rem", letterSpacing: "0.15em", fontFamily: "monospace" }}
            >
              Hardware Matchmaker & P2P Exchange
            </span>
          </div>
        </div>

        <div className="d-none d-md-flex align-items-center gap-2 text-muted-custom small">
          <span className="badge-pill-neon">
            <i className="bi bi-shield-check me-1"></i> Verified P2P Hardware
          </span>
        </div>
      </div>
    </header>
  );
}

export default PageTitle;
