import { useNavigate } from "react-router-dom";
import { useAppOptional } from "../context/AppContext";
import ScoreBoard from "./ScoreBoard";
import { hasStarted, cleanSets, playersOf } from "../lib/scorecard";
import Avatar from "./Avatar";
import { Badge } from "./UI";
import { RacketIcon, TrophyIcon, ClockIcon, PinIcon } from "./Icons";
import { isOpenEvent, summaryLine } from "../lib/groups";

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

const statusMap = {
  confirmed: { tone: "green", label: "Confirmed" },
  pending: { tone: "amber", label: "Pending" },
  attention: { tone: "red", label: "Needs a player" },
};

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const app = useAppOptional();
  const members = app?.team?.members || {};
  const me = app?.profile?.uid;
  const showScore = !isOpenEvent(event) && playersOf(event).length >= 2;
  const scored = cleanSets(event.scorecard?.sets).length > 0;
  const canScore = showScore && !scored && event.status !== "cancelled" && hasStarted(event) && (app?.isAdmin || Boolean(event.participants?.[me]));
  const t12 = (t) => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
  const open = isOpenEvent(event);
  const participants = Object.values(event.participants || {});
  const accepted = participants.filter((p) => p.status === "accepted").length;
  const total = participants.length;
  const s = statusMap[event.status] || statusMap.pending;

  return (
    <div
      data-testid="event-card"
      onClick={() => navigate(`/event/${event.id}`)}
      style={{
        background: "var(--card)",
        border: "var(--border-width, 1px) solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 1px 2px oklch(20% 0.02 260 / 0.05)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: event.type === "match" ? "var(--green-text)" : "var(--blue)" }}>
          {event.type === "match" ? <TrophyIcon /> : <RacketIcon />}
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{event.type}</span>
          {event.mode === "winter" && <span style={{ fontSize: 11 }}>❄️</span>}
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>

      <div>
        <div className="display" style={{ fontSize: 17, fontWeight: 700 }}>{event.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", marginTop: 3, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600 }}>{formatDateLabel(event.date)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            · <ClockIcon width={13} height={13} /> {t12(event.startTime)}{event.endTime ? `–${t12(event.endTime)}` : ""}
          </span>
          {event.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              · <PinIcon width={13} height={13} /> {event.location}
            </span>
          )}
        </div>
      </div>

      {showScore ? (
        <div style={{ paddingTop: 10, borderTop: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 10 }}>
          <ScoreBoard event={event} members={members} />
          {canScore && (
            <button
              type="button"
              data-testid="add-score"
              onClick={(ev) => {
                ev.stopPropagation();
                navigate(`/event/${event.id}`, { state: { score: true } });
              }}
              className="display"
              style={{ alignSelf: "flex-start", border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, background: "var(--accent)", color: "var(--accent-text)" }}
            >
              + Add score
            </button>
          )}
        </div>
      ) : (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
        <div style={{ display: "flex" }}>
          {participants.slice(0, 4).map((p, i) => (
            <Avatar key={p.uid} uid={p.uid} initials={p.initials} color={p.color} size={26} style={{ border: "2px solid white", marginLeft: i === 0 ? 0 : -8 }} />
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          {open ? summaryLine(event) : `${accepted} of ${total} accepted`}
        </div>
      </div>
      )}
    </div>
  );
}
