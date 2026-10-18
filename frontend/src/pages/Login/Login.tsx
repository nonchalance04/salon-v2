import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../../contexts/AuthProvider";
import { api } from "../../lib/api";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function Login() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "request" | "reset">("login");
  const [username, setUsername] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [notice, setNotice] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  function changeMode(next: "login" | "request" | "reset") {
    setMode(next);
    setError("");
    setNotice("");
  }
  async function requestCode() {
    const remaining = Math.ceil((retryAt - Date.now()) / 1000);
    if (remaining > 0) throw new Error(`Please wait ${remaining} seconds before requesting another code.`);
    const result = await api<{ challengeId: string; message: string; retryAfterSeconds: number }>("/auth/forgot-password", {
      method: "POST", body: JSON.stringify({ username: username.trim().toLowerCase() }),
    });
    setChallengeId(result.challengeId);
    setNotice(result.message);
    setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
    setMode("reset");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (mode === "request") {
        await requestCode();
      } else if (mode === "reset") {
        const password = String(data.get("password"));
        const confirmPassword = String(data.get("confirmPassword"));
        if (password !== confirmPassword) throw new Error("Passwords must match.");
        if (new TextEncoder().encode(password).length > 72) throw new Error("Password must fit within 72 UTF-8 bytes.");
        const result = await api<{ message: string }>("/auth/reset-password", {
          method: "POST", body: JSON.stringify({ challengeId, code: String(data.get("code")), password, confirmPassword }),
        });
        setChallengeId("");
        setMode("login");
        setNotice(result.message);
      } else {
        await login(username.trim().toLowerCase(), String(data.get("password")));
      }
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="clique-login">
      <section className="clique-login-card" aria-labelledby="login-title">
        <div className="clique-login-heading">
          <Link to="/" id="login-title" className="text-white">
            CLIQUE HAIRCUTTERS
          </Link>
          <p className="text-white">
            Because you deserve more than just a beautiful look — you deserve a
            moment to relax, recharge, and feel your absolute best.
          </p>
        </div>
        <img
          className="clique-login-photo"
          src="/images/login.jpg"
          alt="A client enjoying a salon appointment"
        />
        <form key={`${mode}:${challengeId}`} onSubmit={submit} className="clique-login-form">
          <h1>{mode === "login" ? "Sign in to your workspace" : mode === "request" ? "Forgot your password?" : "Reset your password"}</h1>
          {mode === "request" && <p>Enter your username to receive a verification code at your account email.</p>}
          {mode !== "reset" && <label>
            Username
            <Input
              name="username"
              type="text"
              autoComplete="username"
              required
              maxLength={254}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Username"
              value={username}
              onChange={event => setUsername(event.target.value)}
            />
          </label>}
          {mode === "reset" && <>
            <p>Resetting the password for <strong>{username}</strong>. Check your account email, including spam.</p>
            <label>
              Verification code
              <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="6-digit code" />
            </label>
          </>}
          {mode !== "request" && <label>
            {mode === "reset" ? "New password" : "Password"}
            <Input
              name="password"
              type="password"
              autoComplete={mode === "reset" ? "new-password" : "current-password"}
              minLength={mode === "reset" ? 12 : undefined}
              aria-describedby={mode === "reset" ? "reset-password-help" : undefined}
              required
              placeholder="Password"
            />
          </label>}
          {mode === "reset" && <small id="reset-password-help">At least 12 characters; no more than 72 UTF-8 bytes.</small>}
          {mode === "reset" && <label>
            Confirm new password
            <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required placeholder="Confirm new password" />
          </label>}
          {notice && <p role="status" className="success">{notice}</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button variant="default" disabled={busy} className="primary">
            {busy ? (mode === "login" ? "Signing in…" : mode === "request" ? "Requesting code…" : "Resetting password…") : (mode === "login" ? "Sign In" : mode === "request" ? "Send verification code" : "Reset password")}
          </Button>
          {mode === "login" ? <Button type="button" variant="link" disabled={busy} onClick={() => changeMode("request")}>Forgot your password?</Button> : <>
            {mode === "reset" && <Button type="button" variant="link" disabled={busy} onClick={async () => {
              setBusy(true); setError("");
              try { await requestCode(); } catch (err) { setError(message(err)); } finally { setBusy(false); }
            }}>Send a new code</Button>}
            <Button type="button" variant="link" disabled={busy} onClick={() => changeMode("login")}>Back to sign in</Button>
          </>}
        </form>
      </section>
    </main>
  );
}
