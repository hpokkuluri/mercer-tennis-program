import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, Badge, SectionLabel, HomeButton } from "../components/UI";
import { CheckIcon, XIcon } from "../components/Icons";
import { computeLedger } from "../lib/ledger";

// A leading checklist mark per game — filled green check once played, a
// dashed empty ring while it's still upcoming, a light red X if the date
// passed without the player on the roster. Read this at a glance instead
// of the tone-coded badge alone, closer to ticking items off a list.
function BucketMark({ bucket }) {
  if (bucket === "played") {
    return (
      <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: "var(--green-solid)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CheckIcon width={15} height={15} style={{ color: "white" }} />
      </div>
    );
  }
  if (bucket === "notPlayed") {
    return (
      <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <XIcon width={13} height={13} style={{ color: "var(--red-text)" }} />
      </div>
    );
  }
  return <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, border: "2px dashed var(--border)" }} />;
}

function StatTile({ label, value, tone }) {
  const colors = {
    neutral: "var(--text)",
    green: "var(--green-text)",
    red: "var(--red-text)",
    amber: "var(--amber-text)",
  };
  return (
    <div style={{ flex: 1, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 8px", textAlign: "center" }}>
      <div className="display" style={{ fontSize: 22, fontWeight: 800, color: colors[tone] || colors.neutral }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.03em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const bucketBadge = {
  played: { tone: "green", label: "Played" },
  notPlayed: { tone: "red", label: "Not Played" },
  pending: { tone: "amber", label: "Upcoming" },
};

export default function GameLedger() {
  const { team, events, profile, isAdmin } = useApp();
  const members = useMemo(() => Object.values(team?.members || {}), [team]);
  const [viewUid, setViewUid] = useState(profile.uid);
  const viewMember = team?.members?.[viewUid];

  const { rows, counts } = useMemo(() => computeLedger(events, viewUid), [events, viewUid]);
  // Next game first, then the rest of the season in order; past games below, most recent first.
  const upcoming = useMemo(
    () => rows.filter((r) => r.bucket === "pending").sort((a, b) => (a.event.date + a.event.startTime).localeCompare(b.event.date + b.event.startTime)),
    [rows]
  );
  const past = useMemo(() => rows.filter((r) => r.bucket !== "pending"), [rows]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Game History & Ledger" right={<HomeButton />} />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {isAdmin && members.length > 1 && (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
            {members.map((m) => (
              <button
                key={m.uid}
                onClick={() => setViewUid(m.uid)}
                style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}
              >
                <Avatar initials={m.initials} color={m.color} size={44} ring={m.uid === viewUid ? "var(--accent)" : undefined} />
                <div style={{ fontSize: 11, fontWeight: 600, color: m.uid === viewUid ? "var(--text)" : "var(--text-faint)" }}>
                  {m.uid === profile.uid ? "You" : m.name.split(" ")[0]}
                </div>
              </button>
            ))}
          </div>
        )}

        <div>
          <div className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
            {viewUid === profile.uid ? "Your Winter games" : `${viewMember?.name}'s Winter games`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <StatTile label="Assigned" value={counts.assigned} tone="neutral" />
            <StatTile label="Played" value={counts.played} tone="green" />
            <StatTile label="Not Played" value={counts.notPlayed} tone="red" />
            <StatTile label="Upcoming" value={counts.pending} tone="amber" />
          </div>
        </div>

        {rows.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No Winter games assigned yet.</div>}
        {[
          { key: "upcoming", label: `Upcoming · ${upcoming.length}`, list: upcoming },
          { key: "past", label: `Past · ${past.length}`, list: past },
        ].filter((s) => s.list.length > 0).map((section) => (
        <div key={section.key} data-testid={`ledger-${section.key}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>{section.label}</SectionLabel>
          {section.list.map(({ event, participant, bucket }) => {
            const b = bucketBadge[bucket];
            return (
              <Card key={event.id} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <BucketMark bucket={bucket} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, textDecoration: bucket === "played" ? "line-through" : "none", textDecorationColor: "var(--green-solid)", textDecorationThickness: 2 }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {new Date(event.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    {event.startTime ? ` · ${event.startTime}` : ""}
                    {event.location ? ` · ${event.location}` : ""}
                  </div>
                  {bucket === "played" && event.result && (
                    <div style={{ fontSize: 11.5, marginTop: 4, fontWeight: 700, color: event.result.outcome === "win" ? "var(--green-text)" : "var(--red-text)" }}>
                      {event.result.outcome === "win" ? "Won" : "Lost"}{event.result.score ? ` · ${event.result.score}` : ""}
                    </div>
                  )}
                  {bucket === "notPlayed" && (
                    <div style={{ fontSize: 11.5, marginTop: 4, color: "var(--text-faint)" }}>
                      {participant.status === "declined" ? "Declined" : participant.status === "open" ? "Slot opened, unclaimed" : "No response"}
                    </div>
                  )}
                </div>
                <Badge tone={b.tone}>{b.label}</Badge>
              </Card>
            );
          })}
        </div>
        ))}
      </div>
    </div>
  );
}
