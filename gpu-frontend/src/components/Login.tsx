import { Link } from "react-router-dom";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { apiFetch, type LoginResponse } from "../utils/api";
import { saveSession } from "../utils/session";

function startSession({ token, user }: LoginResponse): void {
  saveSession({
    token,
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  });
}

function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setPassword] = useState("");

  // Registration form state
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regLoginName, setRegLoginName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  function handleSetLoginName(e: ChangeEvent<HTMLInputElement>): void {
    setLoginName(e.target.value);
  }

  function handleSetPassword(e: ChangeEvent<HTMLInputElement>): void {
    setPassword(e.target.value);
  }

  async function doLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const res = await apiFetch<LoginResponse>("api/login", {
        method: "POST",
        body: { login: loginName, password: loginPassword },
      });

      if (!res.ok) {
        setMessage(res.error ?? "Login failed");
      } else {
        startSession(res.data);
        window.location.href = "/listings";
      }
    } catch (error: unknown) {
      setMessage((error as Error).toString());
    } finally {
      setIsLoading(false);
    }
  }

  async function doRegister(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const res = await apiFetch<{ message: string }>("api/register", {
        method: "POST",
        body: {
          firstName: regFirstName,
          lastName: regLastName,
          login: regLoginName,
          email: regEmail,
          password: regPassword,
        },
      });

      if (!res.ok) {
        setMessage(res.error ?? "Registration failed. Please try again.");
        return;
      }

      const loginRes = await apiFetch<LoginResponse>("api/login", {
        method: "POST",
        body: { login: regLoginName, password: regPassword },
      });

      if (!loginRes.ok) {
        setMessage(loginRes.error ?? "Account created, but login failed. Please log in.");
        setIsRegisterMode(false);
        return;
      }

      startSession(loginRes.data);
      setSuccessMessage("Account created successfully! Logging you in...");
      window.setTimeout(() => {
        window.location.href = "/listings";
      }, 1000);
    } catch (error: unknown) {
      setMessage((error as Error).toString());
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="d-flex justify-content-center align-items-center my-4">
      <div
        id="loginDiv"
        className="card-dark-static p-4 p-md-5 w-100"
        style={{ maxWidth: "480px" }}
      >
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle p-1 mb-3"
            style={{
              width: "60px",
              height: "60px",
              background: "var(--gradient-emerald-teal)",
              boxShadow: "var(--shadow-emerald-glow)",
            }}
          >
            <div
              className="w-100 h-100 rounded-circle d-flex align-items-center justify-content-center"
              style={{ backgroundColor: "var(--bg-slate-950)" }}
            >
              <i
                className={`bi ${isRegisterMode ? "bi-person-plus-fill" : "bi-fire"} text-emerald fs-3`}
                aria-hidden="true"
              ></i>
            </div>
          </div>
          <h2 className="h4 fw-bold text-slate-100 mb-1">
            {isRegisterMode ? "Join the GPU Marketplace" : "Welcome Back"}
          </h2>
          <span
            id="inner-title"
            className="badge-pill-neon"
          >
            {isRegisterMode ? "NEW USER REGISTRATION" : "AUTHENTICATE SESSION"}
          </span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="nav nav-pills-dark w-100 mb-4 justify-content-center">
          <button
            type="button"
            className={`nav-link flex-grow-1 justify-content-center ${!isRegisterMode ? "active" : ""}`}
            onClick={() => {
              setIsRegisterMode(false);
              setMessage("");
              setSuccessMessage("");
            }}
          >
            <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
          </button>
          <button
            type="button"
            id="toggleRegisterButton"
            className={`nav-link flex-grow-1 justify-content-center ${isRegisterMode ? "active" : ""}`}
            onClick={() => {
              setIsRegisterMode(true);
              setMessage("");
              setSuccessMessage("");
            }}
          >
            <i className="bi bi-person-plus me-1"></i> Register
          </button>
        </div>

        {!isRegisterMode ? (
          /* Login Form */
          <form onSubmit={doLogin}>
            <div className="mb-3">
              <label htmlFor="loginName" className="form-label">
                Username
              </label>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control"
                  id="loginName"
                  placeholder="Your username"
                  value={loginName}
                  onChange={handleSetLoginName}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="loginPassword" className="form-label mb-0">
                  Password
                </label>
                <Link to="/forgot-password" className="small text-emerald" style={{ fontSize: "0.8rem" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="form-control"
                id="loginPassword"
                placeholder="••••••••"
                value={loginPassword}
                onChange={handleSetPassword}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              id="loginButton"
              className="btn btn-primary w-100 py-2 fs-6 fw-bold text-uppercase font-monospace mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true"></i>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={doRegister}>
            <div className="row g-2 mb-3">
              <div className="col-12 col-sm-6">
                <label htmlFor="regFirstName" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="regFirstName"
                  placeholder="Alex"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="col-12 col-sm-6">
                <label htmlFor="regLastName" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="regLastName"
                  placeholder="Smith"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="regLoginName" className="form-label">
                Username
              </label>
              <input
                type="text"
                className="form-control"
                id="regLoginName"
                placeholder="Choose username"
                value={regLoginName}
                onChange={(e) => setRegLoginName(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="regEmail" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                id="regEmail"
                placeholder="alex@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="regPassword" className="form-label">
                Password (Min 8 Characters)
              </label>
              <input
                type="password"
                className="form-control"
                id="regPassword"
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <button
              type="submit"
              id="registerButton"
              className="btn btn-primary w-100 py-2 fs-6 fw-bold text-uppercase font-monospace"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <i className="bi bi-person-check-fill me-2" aria-hidden="true"></i>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Feedback Messages */}
        {message && (
          <div id="loginResult" className="alert-custom-error mt-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {message}
          </div>
        )}

        {successMessage && (
          <div id="registerResult" className="alert-custom-success mt-4" role="status">
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMessage}
          </div>
        )}
      </div>
    </main>
  );
}

export default Login;
