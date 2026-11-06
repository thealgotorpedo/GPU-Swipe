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
    if (reset && password !== confirm) { setMessage("Passwords must match."); return; }
    setBusy(true); setMessage("");
    try {
      const res = await apiFetch<{ message: string }>(reset ? "api/password/reset" : "api/password/forgot", {
        method: "POST", body: reset ? { token: params.get("token"), password } : { email }
      });
      if (res.ok) { setDone(true); setMessage(res.data.message); if (reset) clearSession(); }
      else setMessage(res.error || "Request failed.");
    } catch { setMessage("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="container py-5" style={{ maxWidth: 540 }}>
    <h1 className="h3">{reset ? "Set a new password" : "Forgot your password?"}</h1>
    {message && <p role="status">{message}</p>}
    {reset && !params.get("token") ? <p>This link is missing a reset token. <Link to="/forgot-password">Request a new link</Link>.</p> : !done && <form onSubmit={submit}>
      {reset ? <>
        <label htmlFor="newPassword" className="form-label">New password</label>
        <input id="newPassword" className="form-control mb-3" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
        <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
        <input id="confirmPassword" className="form-control mb-3" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
      </> : <>
        <label htmlFor="resetEmail" className="form-label">Account email</label>
        <input id="resetEmail" className="form-control mb-3" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} />
      </>}
      <button className="btn btn-primary mb-3" disabled={busy}>{busy ? "Please wait…" : reset ? "Set password" : "Email reset link"}</button>
    </form>}
    <p><Link to="/">Back to login</Link></p>
    {reset && <p><Link to="/forgot-password">Request another reset link</Link></p>}
  </main>;
}
