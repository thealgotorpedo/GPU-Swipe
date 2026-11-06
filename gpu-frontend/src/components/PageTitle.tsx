function PageTitle() {
  return (
    <header className="text-center py-4 mb-4 border-bottom bg-white shadow-sm rounded-3">
      <div className="container">
        <h1 id="title" className="h2 fw-bold text-primary mb-1 d-flex align-items-center justify-content-center gap-2">
          <i className="bi bi-cpu-fill" aria-hidden="true"></i>
          GPU Marketplace
        </h1>
        <p className="text-secondary small mb-0 fw-semibold">
          List the graphics processors you have for sale
        </p>
      </div>
    </header>
  );
}

export default PageTitle;
