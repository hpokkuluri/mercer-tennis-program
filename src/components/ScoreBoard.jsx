import Avatar from "./Avatar";
import { teamsOf, winner, cleanSets } from "../lib/scorecard";

// Doubles score card: one row per pair, set scores on the right.
// Winner's row is bold with a ✓. Before a score is entered the two pairs
// show with "vs" between them.
export default function ScoreBoard({ event, members = {}, size = "sm" }) {
  const [A, B] = teamsOf(event);
  const sets = cleanSets(event.scorecard?.sets);
  const w = winner(event);
  const big = size === "lg";
  const first = (uid) => (members[uid]?.name || event.participants?.[uid]?.name || "?").split(" ")[0];
  const person = (uid) => members[uid] || event.participants?.[uid] || {};

  const row = (team, side) => {
    const won = w === side;
    const lost = w && w !== side;
    return (
      <div data-testid={`score-row-${side}`} style={{ display: "flex", alignItems: "center", gap: 10, opacity: lost ? 0.62 : 1 }}>
        <div style={{ display: "flex", flexShrink: 0 }}>
          {team.map((uid, i) => (
            <Avatar key={uid} uid={uid} initials={person(uid).initials} color={person(uid).color} size={big ? 32 : 26} style={{ marginLeft: i ? -7 : 0, border: "2px solid var(--card)" }} />
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: big ? 15 : 13.5, fontWeight: won ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {team.map(first).join(" & ") || "—"}
          {won && <span style={{ marginLeft: 6, color: "var(--green-solid)" }}>✓</span>}
        </div>
        {sets.length > 0 && (
          <div style={{ display: "flex", gap: 4 }}>
            {sets.map(([x, y], i) => {
              const mine = side === "A" ? x : y;
              const theirs = side === "A" ? y : x;
              return (
                <div
                  key={i}
                  className="display"
                  style={{
                    width: big ? 30 : 24,
                    height: big ? 30 : 24,
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: big ? 15 : 13,
                    fontWeight: 800,
                    background: mine > theirs ? "var(--accent)" : "var(--border-soft)",
                    color: mine > theirs ? "var(--accent-text)" : "var(--text-muted)",
                  }}
                >
                  {mine}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="scoreboard" style={{ display: "flex", flexDirection: "column", gap: big ? 10 : 7 }}>
      {row(A, "A")}
      {sets.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: "var(--text-faint)" }}>VS</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
        </div>
      )}
      {row(B, "B")}
    </div>
  );
}
