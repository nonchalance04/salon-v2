import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../../contexts/AuthProvider";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function Login() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(
        String(data.get("email")).trim().toLowerCase(),
        String(data.get("password")),
      );
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
          <Link to="/" id="login-title">
            CLIQUE HAIRCUTTERS
          </Link>
          <p>
            Because you deserve more than just a beautiful look — you deserve a
            moment to relax, recharge, and feel your absolute best.
          </p>
        </div>
        <img
          className="clique-login-photo"
          src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85"
          alt="A client enjoying a salon appointment"
        />
        <form onSubmit={submit} className="clique-login-form">
          <h1>Sign in to your workspace</h1>
          <label>
            Email address
            <Input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button variant="default" disabled={busy} className="primary">
            {busy ? "Signing in…" : "Sign In"}
          </Button>
          {/* <p className="clique-login-help">Need access or a password reset? Ask your salon administrator.</p>
        <Link to="/availability">Find an available salon time →</Link>
        <Link to="/help">Questions? Ask the salon guide →</Link> */}
        </form>
      </section>
    </main>
  );
}
