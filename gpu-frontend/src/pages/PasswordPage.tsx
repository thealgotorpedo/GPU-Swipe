import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { clearSession } from "../utils/session";

export default function PasswordPage({ reset = false }: { reset?: boolean }) {
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reset && password !== confirm) {
      setMessage("Passwords must match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await apiFetch<{ message: string }>(
        reset ? "api/password/reset" : "api/password/forgot",
        {
          method: "POST",
          body: reset ? { token: params.get("token"), password } : { email },
        }
      );
      if (res.ok) {
        setDone(true);
        setMessage(res.data.message);
        if (reset) clearSession();
      } else {
        setMessage(res.error || "Request failed.");
      }
    } catch {
      setMessage("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container d-flex justify-content-center align-items-center py-5">
      <div className="card-dark-static p-4 p-md-5 w-100" style={{ maxWidth: 480 }}>
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle p-1 mb-3"
            style={{
              width: "56px",
              height: "56px",
              background: "var(--gradient-emerald-teal)",
              boxShadow: "var(--shadow-emerald-glow)",
            }}
          >
            <div
              className="w-100 h-100 rounded-circle d-flex align-items-center justify-content-center"
              style={{ backgroundColor: "var(--bg-slate-950)" }}
            >
              <i className="bi bi-shield-lock text-emerald fs-4"></i>
            </div>
          </div>
          <h1 className="h4 fw-bold text-slate-100 mb-1">
            {reset ? "Set New Password" : "Password Recovery"}
          </h1>
          <p className="small text-muted-custom mb-0">
            {reset
              ? "Enter your new credentials below to regain access"
              : "Enter your registered email to receive a recovery link"}
          </p>
        </div>

        {message && (
          <div className={`mb-4 ${done ? "alert-custom-success" : "alert-custom-error"}`} role="status">
            <i className={`bi ${done ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-2`}></i>
            {message}
          </div>
        )}

        {reset && !params.get("token") ? (
          <div className="alert-custom-error mb-4">
            This link is missing a valid reset token.{" "}
            <Link to="/forgot-password" className="text-emerald text-decoration-underline">
              Request a new link
            </Link>
            .
          </div>
        ) : (
          !done && (
            <form onSubmit={submit}>
              {reset ? (
                <>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">
                      New Password (min 8 chars)
                    </label>
                    <input
                      id="newPassword"
                      className="form-control"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      className="form-control"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <label htmlFor="resetEmail" className="form-label">
                    Account Email Address
                  </label>
                  <input
                    id="resetEmail"
                    className="form-control"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="alex@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              <button
                className="btn btn-primary w-100 py-2 fs-6 fw-bold text-uppercase font-monospace mb-3"
                disabled={busy}
              >
                {busy ? "Please wait…" : reset ? "Set New Password" : "Send Recovery Link"}
              </button>
            </form>
          )
        )}

        <div className="text-center pt-2 border-top border-slate-800">
          <Link to="/" className="small text-emerald d-inline-flex align-items-center gap-1">
            <i className="bi bi-arrow-left"></i> Back to Sign In
          </Link>
          {reset && (
            <div className="mt-2">
              <Link to="/forgot-password" className="small text-muted-custom">
                Request another reset link
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
