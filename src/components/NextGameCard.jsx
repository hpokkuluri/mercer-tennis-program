import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "./Avatar";
import { myNextGame, myGamesThisWeek, todayStr } from "../lib/notifications";

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

const statusTone = (st) =>
  st === "pending"
    ? { label: "Please confirm", bg: "var(--amber-bg)", fg: "var(--amber-text)" }
    : st === "open"
      ? { label: "Spot open", bg: "oklch(94% 0.03 250)", fg: "oklch(42% 0.12 250)" }
      : { label: "Confirmed", bg: "var(--green-bg)", fg: "var(--green-text)" };

const cardStyle = {
  background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 22%, var(--card)), var(--card) 70%)",
  border: "var(--border-width, 1px) solid color-mix(in oklch, var(--accent) 45%, var(--border))",
  borderRadius: "var(--radius-lg)",
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: "0 6px 20px color-mix(in oklch, var(--accent) 18%, transparent)",
};

// Hub: every game the player has this week (Sat and Sun both); if none are
// left this week, their next game.
export default function NextGameCard() {
  const { events, profile } = useApp();
  const week = myGamesThisWeek(events, profile.uid);
  if (week.length > 0) return <WeekCard games={week} />;
  return <SingleNext />;
}

function WeekCard({ games }) {
  const { profile, team } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <div data-testid="next-game" style={cardStyle}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        🎾 Your {games.length === 1 ? "game" : `${games.length} games`} this week
      </div>
      {games.map((e, i) => {
        const me = e.participants[profile.uid];
        const t = statusTone(me.status);
        const w = when(e, now);
        const others = Object.values(e.participants || {}).filter((p) => p.uid !== profile.uid && p.status !== "declined");
        return (
          <div
            key={e.id}
            data-testid="week-game"
            onClick={() => navigate(`/event/${e.id}`)}
            style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, paddingTop: i ? 12 : 0, borderTop: i ? "1px solid color-mix(in oklch, var(--accent) 30%, var(--border))" : "none" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div className="display" style={{ fontSize: i ? 22 : 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{w.big}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginTop: 3 }}>{w.small}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {e.title}
                  {e.location ? <span style={{ fontWeight: 500, color: "var(--text-muted)" }}> · {e.location}</span> : null}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: t.bg, color: t.fg, whiteSpace: "nowrap" }}>{t.label}</span>
            </div>
            {others.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex" }}>
                  {others.slice(0, 5).map((p, j) => (
                    <Avatar key={p.uid} uid={p.uid} initials={p.initials} color={p.color} size={26} style={{ marginLeft: j ? -7 : 0, border: "2px solid var(--card)" }} />
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", minWidth: 0 }}>
                  with {others.map((p) => (team?.members?.[p.uid]?.name || p.name).split(" ")[0]).join(", ")}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Can't make one? Tap it to open your spot to the team.</div>
    </div>
  );
}

function SingleNext() {
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
      style={{ ...cardStyle, cursor: "pointer" }}
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
      {me.status === "pending" && e.mode !== "winter" && (
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
