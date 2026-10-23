import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, SectionLabel, HomeButton } from "../components/UI";
import { todayStr } from "../lib/notifications";

const pretty = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// "I can fill in on these days." When someone opens a spot on one of
// them, players on the sub list for that day are alerted first.
export default function SubList() {
  const { team, events, profile, updateMemberInTeam } = useApp();
  const members = useMemo(() => Object.values(team?.members || {}), [team]);
  const mine = team?.members?.[profile.uid]?.subDates || [];
  const today = todayStr();
  const dates = useMemo(
    () => [...new Set(events.filter((e) => e.mode === "winter" && e.status !== "cancelled" && e.date >= today).map((e) => e.date))].sort().slice(0, 16),
    [events, today]
  );
  const playing = (d) => events.some((e) => e.date === d && e.status !== "cancelled" && ["accepted", "pending"].includes(e.participants?.[profile.uid]?.status));
  const toggle = (d) => {
    const next = mine.includes(d) ? mine.filter((x) => x !== d) : [...mine, d].sort();
    updateMemberInTeam(profile.uid, { subDates: next.filter((x) => x >= today) });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Sub List" right={<HomeButton />} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Tap the days you could fill in. If a spot opens that day, you'll be alerted first — before the rest of the team.
        </div>
        {dates.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No upcoming Winter games yet.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dates.map((d) => {
            const on = mine.includes(d);
            const busy = playing(d);
            const others = members.filter((m) => m.uid !== profile.uid && (m.subDates || []).includes(d));
            return (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--card)", border: on ? "2px solid var(--accent)" : "var(--border-width, 1px) solid var(--border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pretty(d)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
                    {busy ? "You're already playing this day" : others.length ? `Also available: ${others.map((m) => m.name.split(" ")[0]).join(", ")}` : "No one else on the sub list yet"}
                  </div>
                </div>
                {others.length > 0 && (
                  <div style={{ display: "flex" }}>
                    {others.slice(0, 3).map((m, i) => (
                      <Avatar key={m.uid} uid={m.uid} initials={m.initials} color={m.color} size={24} style={{ marginLeft: i ? -6 : 0, border: "2px solid var(--card)" }} />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  data-testid={`sub-${d}`}
                  onClick={() => toggle(d)}
                  disabled={busy && !on}
                  className="display"
                  style={{ border: "none", borderRadius: 999, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, background: on ? "var(--accent)" : "var(--border-soft)", color: on ? "var(--accent-text)" : "var(--text-muted)", opacity: busy && !on ? 0.4 : 1 }}
                >
                  {on ? "I'm available ✓" : "Available"}
                </button>
              </div>
            );
          })}
        </div>
        <SectionLabel>How it works</SectionLabel>
        <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>
          When a teammate opens their spot, everyone on the sub list for that day gets a "You're on the sub list" alert. Admins also see sub-list players at the top when handing out a spot.
        </div>
      </div>
    </div>
  );
}
