import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "./Avatar";
import { myNextGame, todayStr } from "../lib/notifications";

function when(e, now) {
  const today = todayStr();
  const days = Math.round((new Date(e.date + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
  const time = e.startTime ? new Date(`2000-01-01T${e.startTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  if (days === 0) {
    const start = e.startTime ? new Date(`${e.date}T${e.startTime}`) : null;
    const mins = start ? Math.round((start - now) / 60000) : null;
    if (mins != null && mins > 0 && mins < 180) return { big: `in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`}`, small: `Today · ${time}` };
    return { big: "Today", small: time };
  }
  if (days === 1) return { big: "Tomorrow", small: time };
  const date = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return { big: `in ${days} days`, small: `${date}${time ? ` · ${time}` : ""}` };
}

// Hub: the signed-in player's next game, front and centre.
export default function NextGameCard() {
  const { events, profile, team, respondToEvent } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const e = myNextGame(events, profile.uid);
  if (!e) return null;
  const me = e.participants[profile.uid];
  const others = Object.values(e.participants || {}).filter((p) => p.uid !== profile.uid && p.status !== "declined");
  const w = when(e, now);
  const tone =
    me.status === "pending"
      ? { label: "Please confirm", bg: "var(--amber-bg)", fg: "var(--amber-text)" }
      : me.status === "open"
        ? { label: "Your spot is open", bg: "oklch(94% 0.03 250)", fg: "oklch(42% 0.12 250)" }
        : { label: "Confirmed", bg: "var(--green-bg)", fg: "var(--green-text)" };

  return (
    <div
      data-testid="next-game"
      onClick={() => navigate(`/event/${e.id}`)}
      style={{
        background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 22%, var(--card)), var(--card) 70%)",
        border: "var(--border-width, 1px) solid color-mix(in oklch, var(--accent) 45%, var(--border))",
        borderRadius: "var(--radius-lg)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        boxShadow: "0 6px 20px color-mix(in oklch, var(--accent) 18%, transparent)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>🎾 Your next game</div>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: tone.bg, color: tone.fg }}>{tone.label}</span>
      </div>
      <div>
        <div className="display" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{w.big}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{w.small}</div>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6 }}>
          {e.title}
          {e.location ? <span style={{ fontWeight: 500, color: "var(--text-muted)" }}> · {e.location}</span> : null}
        </div>
      </div>
      {others.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex" }}>
            {others.slice(0, 5).map((p, i) => (
              <Avatar key={p.uid} uid={p.uid} initials={p.initials} color={p.color} size={30} style={{ marginLeft: i ? -8 : 0, border: "2px solid var(--card)" }} />
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", minWidth: 0 }}>
            with {others.map((p) => (team?.members?.[p.uid]?.name || p.name).split(" ")[0]).join(", ")}
          </div>
        </div>
      )}
      {me.status === "pending" && (
        <div style={{ display: "flex", gap: 8 }} onClick={(ev) => ev.stopPropagation()}>
          <button type="button" data-testid="next-accept" onClick={() => respondToEvent(e.id, "accepted")} className="display" style={{ flex: 1, border: "none", borderRadius: "var(--radius-md)", padding: "10px", fontWeight: 700, background: "var(--accent)", color: "var(--accent-text)" }}>
            Accept
          </button>
          <button type="button" onClick={() => navigate(`/event/${e.id}`)} className="display" style={{ flex: 1, borderRadius: "var(--radius-md)", padding: "10px", fontWeight: 700, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", color: "var(--text-muted)" }}>
            Decline / swap
          </button>
        </div>
      )}
      {me.status === "accepted" && (
        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Can't make it? Tap to open your spot to the team.</div>
      )}
    </div>
  );
}
