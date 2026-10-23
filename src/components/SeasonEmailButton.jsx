import { useState } from "react";
import { useApp } from "../context/AppContext";

// Admin: "Email everyone their schedule" — one email per player with all of
// their Winter games. Used on the Admin Dashboard and after an import / plan.
export default function SeasonEmailButton({ compact = false }) {
  const { team, sendSeasonSchedules } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const last = team?.seasonEmailSentAt ? new Date(team.seasonEmailSentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

  async function go() {
    if (!window.confirm("Email every player their full Winter schedule now? (One email each.)")) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await sendSeasonSchedules();
      setMsg(
        r.sent > 0
          ? `Sent to ${r.sent} player${r.sent === 1 ? "" : "s"}.${r.noEmail ? ` ${r.noEmail} without an email on file were skipped.` : ""}`
          : r.attempted > 0
            ? "Couldn't send — email isn't working right now. Try again later."
            : "No one has upcoming Winter games yet."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        data-testid="season-email"
        onClick={go}
        disabled={busy}
        className="display"
        style={{ border: "none", borderRadius: "var(--radius-md)", padding: compact ? "10px" : "12px", fontWeight: 700, fontSize: 13.5, background: "var(--accent)", color: "var(--accent-text)" }}
      >
        {busy ? "Sending…" : "📧 Email everyone their season schedule"}
      </button>
      {msg && <div data-testid="season-email-msg" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>{msg}</div>}
      {!msg && last && <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Last sent {last}</div>}
    </div>
  );
}
