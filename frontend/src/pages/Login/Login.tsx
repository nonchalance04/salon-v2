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
    <main className="clique-login tw:[&_:is(h1,h2,h3,h4,h5,h6,strong,b,th,dt,dd,legend,[data-slot=card-title],[data-slot=dialog-title])]:font-bold! tw:[&_label]:font-semibold! tw:text-[#171717] tw:[font-family:Arial,Helvetica,sans-serif] tw:[&_h1]:[font-family:inherit]
          tw:[&_h1]:font-bold tw:[&_h1]:tracking-[normal] tw:[&_:focus-visible]:[outline:3px_solid_#bd941f]
          tw:[&_:focus-visible]:outline-offset-1 tw:min-h-dvh tw:grid tw:place-items-center tw:py-7 tw:px-4.5
          tw:leading-[1.5]">
      <section className="clique-login-card tw:w-[min(100%,460px)] tw:[border:1px_solid_#2223] tw:rounded-[14px] tw:overflow-hidden
          tw:text-[#f7f7f7]" aria-labelledby="login-title">
        <div className="clique-login-heading tw:[padding:24px_38px_22px] tw:text-center tw:[&_a]:text-[34px] tw:[&_a]:font-medium
          tw:[&_a]:no-underline tw:[&_a]:block tw:[&_p]:text-[15px] tw:[&_p]:[margin:10px_0_0] tw:down-760:p-6
          tw:down-760:[&_a]:text-[30px] tw:[&_a]:leading-[1.12] tw:[&_p]:leading-[1.45]">
          <Link to="/" id="login-title" className="text-white">
            CLIQUE HAIRCUTTERS
          </Link>
          <p className="text-white">
            Because you deserve more than just a beautiful look — you deserve a
            moment to relax, recharge, and feel your absolute best.
          </p>
        </div>
        <img
          className="clique-login-photo tw:block tw:w-full tw:h-auto tw:object-contain tw:[object-position:center_42%]
          tw:[background:#d7d4cb]"
          src="/images/login.jpg"
          alt="A client enjoying a salon appointment"
        />
        <form key={`${mode}:${challengeId}`} onSubmit={submit} className="clique-login-form tw:grid tw:gap-3.5 tw:py-6.5 tw:px-10.5 tw:[&_h1]:text-[18px] tw:[&_h1]:[margin:0_0_4px]
          tw:[&_h1]:text-[white] tw:[&_label]:m-0 tw:[&_label]:text-[12px] tw:[&_label]:gap-1.5 tw:[&_label]:text-[#eee]
          tw:[&_input]:h-13.5 tw:[&_input]:[border:1px_solid_#bfa03b] tw:[&_input]:text-[#202020]
          tw:[&_input]:rounded-[8px] tw:[&_.primary]:text-[#242424] tw:[&_.primary]:[border:0]
          tw:[&_.primary]:rounded-[999px] tw:[&_.primary]:w-[min(100%,256px)] tw:[&_.primary]:[justify-self:center]
          tw:[&_.primary]:my-1.5 tw:[&_.primary]:mx-0 tw:[&_.primary]:min-h-11 tw:[&_.primary:hover]:[background:#bd941f]
          tw:[&_>_button[data-variant=link]]:text-[#60a5fa] tw:[&_small]:text-[#dedede]
          tw:[&_>_button[data-variant=link]]:bg-transparent!
          tw:[&_>_button[data-variant=link]:hover]:bg-transparent!
          tw:[&_>_button[data-variant=link]:hover]:border-0 tw:[&_>_button[data-variant=link]:hover]:shadow-none
          tw:[&_>_button[data-variant=link]]:[border:0] tw:[&_>_button[data-variant=link]]:no-underline
          tw:down-760:p-6.5">
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
          {notice && <p role="status" className="success tw:[.admin-settlement_>_&]:[grid-column:2] tw:[.admin-settlement_>_&]:m-0 tw:[background:#eaf2e9]
          tw:py-3 tw:px-4 tw:rounded-[6px] tw:[.clique-login-form_&]:text-[#203c34]">{notice}</p>}
          {error && (
            <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
              {error}
            </p>
          )}
          <Button variant="default" disabled={busy} className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5">
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
