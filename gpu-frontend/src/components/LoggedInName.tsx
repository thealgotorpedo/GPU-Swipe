import type { MouseEvent } from "react";
import { clearSession, getSession } from "../utils/session";

function LoggedInName() {
  const session = getSession();
  const name = `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim() || "User";

  function doLogout(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    clearSession();
    window.location.href = "/";
  }

  return (
    <div
      id="loggedInDiv"
      className="card-dark-static mb-4 p-3"
    >
      <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
        <div className="session-summary d-flex align-items-center gap-3">
          <div
            className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center text-emerald"
            style={{
              width: "44px",
              height: "44px",
              backgroundColor: "var(--bg-slate-950)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            <i className="bi bi-person-fill fs-5" aria-hidden="true"></i>
          </div>
          <div>
            <span className="text-muted-custom small text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>
              Active Session
            </span>
            <span id="userName" className="fw-bold d-block text-slate-100">
              {name}
            </span>
          </div>
        </div>
        <button
          type="button"
          id="logoutButton"
          className="btn btn-outline-danger btn-sm px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2"
          onClick={doLogout}
        >
          <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default LoggedInName;
