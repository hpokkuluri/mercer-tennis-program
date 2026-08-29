import { useNavigate } from "react-router-dom";
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
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{formatDateLabel(event.date)}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-muted)" }}>
          <ClockIcon /> {event.startTime} &ndash; {event.endTime}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-muted)" }}>
          <PinIcon /> {event.location}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
        <div style={{ display: "flex" }}>
          {participants.slice(0, 4).map((p, i) => (
            <Avatar key={p.uid} initials={p.initials} color={p.color} size={26} style={{ border: "2px solid white", marginLeft: i === 0 ? 0 : -8 }} />
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          {open ? summaryLine(event) : `${accepted} of ${total} accepted`}
        </div>
      </div>
    </div>
  );
}
