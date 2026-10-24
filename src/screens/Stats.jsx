import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, SectionLabel, HomeButton } from "../components/UI";
import { todayStr } from "../lib/notifications";
import { playerOutcome } from "../lib/scorecard";
import { isOver } from "../lib/gameTime";

// Season numbers per player, from the Winter schedule: games played,
// coming up, wins/losses where a result was logged, and who they share a
// court with most.
function statsFor(events, uid) {
  const mine = events.filter((e) => e.mode === "winter" && e.status !== "cancelled" && e.participants?.[uid] && e.participants[uid].status !== "declined");
  const played = mine.filter((e) => isOver(e) && e.participants[uid].status === "accepted");
  const upcoming = mine.filter((e) => !isOver(e));
  // Doubles score card first; older games may have a Win/Loss result instead.
  const outcome = (e) => playerOutcome(e, uid) || e.result?.outcome || null;
  const wins = mine.filter((e) => outcome(e) === "win").length;
  const losses = mine.filter((e) => outcome(e) === "loss").length;
  const partners = {};
  for (const e of mine) for (const p of Object.values(e.participants)) if (p.uid !== uid && p.status !== "declined") partners[p.uid] = (partners[p.uid] || 0) + 1;
  const days = {};
  for (const e of mine) {
    const d = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
    days[d] = (days[d] || 0) + 1;
  }
  return { played: played.length, upcoming: upcoming.length, total: mine.length, wins, losses, partners, days };
}

function Tile({ label, value }) {
  return (
    <div style={{ flex: 1, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 6px", textAlign: "center" }}>
      <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Stats() {
  const { team, events, profile } = useApp();
  const members = useMemo(() => Object.values(team?.members || {}).sort((a, b) => a.name.localeCompare(b.name)), [team]);
  const [uid, setUid] = useState(profile.uid);
  const today = todayStr();
  const all = useMemo(() => Object.fromEntries(members.map((m) => [m.uid, statsFor(events, m.uid, today)])), [members, events, today]);
  const s = all[uid] || statsFor(events, uid, today);
  const who = team?.members?.[uid];
  const topPartners = Object.entries(s.partners).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const board = members.map((m) => ({ m, ...all[m.uid] })).filter((x) => x.total > 0).sort((a, b) => b.played - a.played || b.total - a.total);
  const maxTotal = Math.max(1, ...board.map((x) => x.total));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Season Stats" right={<HomeButton />} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {members.map((m) => (
            <button key={m.uid} onClick={() => setUid(m.uid)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <Avatar uid={m.uid} initials={m.initials} color={m.color} size={40} ring={m.uid === uid ? "var(--accent)" : undefined} />
              <div style={{ fontSize: 10.5, fontWeight: 600, color: m.uid === uid ? "var(--text)" : "var(--text-faint)" }}>{m.uid === profile.uid ? "You" : m.name.split(" ")[0]}</div>
            </button>
          ))}
        </div>

        <div data-testid="stats-me">
          <div className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{uid === profile.uid ? "Your season" : `${who?.name}'s season`}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Tile label="Played" value={s.played} />
            <Tile label="To go" value={s.upcoming} />
            <Tile label="W – L" value={s.wins + s.losses ? `${s.wins}–${s.losses}` : "—"} />
          </div>
          {s.total > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              {Object.entries(s.days).map(([d, n]) => `${n} on ${d}`).join(" · ")} · {Math.round((s.played / s.total) * 100)}% of the season done
            </div>
          )}
        </div>

        {topPartners.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>Shares a court most with</SectionLabel>
            <Card style={{ padding: "6px 14px" }}>
              {topPartners.map(([pid, n]) => {
                const m = team?.members?.[pid];
                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                    <Avatar uid={pid} initials={m?.initials} color={m?.color} size={28} />
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{m?.name || "Former player"}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{n} game{n === 1 ? "" : "s"}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Team — games played</SectionLabel>
          <Card data-testid="stats-board" style={{ padding: "8px 14px" }}>
            {board.map(({ m, played, total }, i) => (
              <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <div style={{ width: 18, fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)" }}>{i + 1}</div>
                <div style={{ width: 84, fontSize: 13, fontWeight: m.uid === profile.uid ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name.split(" ")[0]}</div>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--border-soft)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${(total / maxTotal) * 100}%`, background: "color-mix(in oklch, var(--accent) 30%, transparent)", borderRadius: 999 }} />
                  <div style={{ position: "absolute", inset: 0, width: `${(played / maxTotal) * 100}%`, background: "var(--accent)", borderRadius: 999 }} />
                </div>
                <div style={{ width: 44, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{played}/{total}</div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--text-faint)", paddingTop: 6 }}>Dark = played so far, light = whole season.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
