import { useState } from "react";
import { useApp } from "../context/AppContext";
import { PrimaryButton, SecondaryButton, Field, ErrorText } from "../components/UI";

export default function OnboardTeam() {
  const { createTeam, joinTeamByCode, signOut, profile } = useApp();
  const [mode, setMode] = useState("join"); // 'join' | 'create'
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "create") {
        await createTeam({ name: teamName, code });
      } else {
        await joinTeamByCode(code);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 28px 24px" }}>
      <div style={{ height: "calc(env(safe-area-inset-top, 0px) + 48px)", flexShrink: 0 }} />

      <div style={{ marginBottom: 24 }}>
        <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>Hey {profile?.name?.split(" ")[0]} 👋</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>Join your team, or start a new one.</div>
      </div>

      <div style={{ display: "flex", background: "oklch(93% 0.008 90)", borderRadius: 12, padding: 4, gap: 4, marginBottom: 20 }}>
        <button type="button" onClick={() => setMode("join")} style={{ flex: 1, border: "none", padding: "10px 0", borderRadius: 9, fontWeight: 700, fontSize: 14, background: mode === "join" ? "var(--accent)" : "transparent", color: mode === "join" ? "var(--accent-text)" : "var(--text-muted)" }}>
          Join a Team
        </button>
        <button type="button" onClick={() => setMode("create")} style={{ flex: 1, border: "none", padding: "10px 0", borderRadius: 9, fontWeight: 700, fontSize: 14, background: mode === "create" ? "var(--accent)" : "transparent", color: mode === "create" ? "var(--accent-text)" : "var(--text-muted)" }}>
          Create a Team
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        {mode === "create" && (
          <Field label="Team name" placeholder="Riverside Tennis Club" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        )}

        <Field
          label={mode === "create" ? "Choose a team code" : "Team code"}
          placeholder="e.g. RIVERSIDE26"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: -8 }}>
          {mode === "create" ? "Share this with teammates so they can join." : "Ask your team admin for this."}
        </div>

        {mode === "create" && (
          <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
            Your team gets both a ☀️ Summer Schedule (open — anyone can propose and accept) and a ❄️ Winter Schedule (admin assigns players) automatically — pick between them any time from the home screen.
          </div>
        )}

        <ErrorText>{error}</ErrorText>

        <div style={{ flex: 1 }} />

        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "create" ? "Create Team" : "Join Team"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={signOut} style={{ marginTop: 4 }}>
          Log out
        </SecondaryButton>
      </form>
    </div>
  );
}
