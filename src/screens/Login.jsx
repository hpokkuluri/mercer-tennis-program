import { useState } from "react";
import { useApp } from "../context/AppContext";
import { PrimaryButton, Field, ErrorText } from "../components/UI";

export default function Login() {
  const { signUp, signIn, resetPassword, usingFirebase } = useApp();
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'reset'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Enter your name.");
        await signUp({ email, password, name });
      } else if (mode === "reset") {
        if (!email.trim()) throw new Error("Enter your email first.");
        await resetPassword(email);
        setNotice("Check your email for a link to reset your password.");
      } else {
        await signIn({ email, password });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 28px 24px" }}>
      <div style={{ height: "calc(env(safe-area-inset-top, 0px) + 64px)", flexShrink: 0 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 32 }}>
        <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>Mercer Tennis Program</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Scheduling for your tennis team</div>
        {!usingFirebase && (
          <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--amber-text)", background: "var(--amber-bg)", borderRadius: 10, padding: "10px 12px" }}>
            Running in local demo mode — accounts only live in this browser and aren't secure. See SETUP.md to connect a free Firebase project for real accounts.
          </div>
        )}
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {mode === "signup" && (
          <Field label="Name" placeholder="Jordan Taylor" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode !== "reset" && (
          <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        )}

        <ErrorText>{error}</ErrorText>
        {notice && <div style={{ fontSize: 13, color: "var(--green-text)", background: "var(--green-bg)", borderRadius: 10, padding: "10px 12px" }}>{notice}</div>}

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => { setMode("reset"); setError(""); setNotice(""); }}
            style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--text-muted)", fontSize: 12.5, fontWeight: 600, padding: 4 }}
          >
            Forgot password?
          </button>
        )}

        <div style={{ flex: 1 }} />

        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create Account" : mode === "reset" ? "Send Reset Link" : "Log In"}
        </PrimaryButton>

        {mode === "reset" ? (
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(""); setNotice(""); }}
            style={{ background: "none", border: "none", color: "var(--green-solid)", fontSize: 13.5, fontWeight: 600, padding: 8 }}
          >
            Back to log in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}
            style={{ background: "none", border: "none", color: "var(--green-solid)", fontSize: 13.5, fontWeight: 600, padding: 8 }}
          >
            {mode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}
          </button>
        )}
      </form>
    </div>
  );
}
