// Doubles score card for a game: two pairs and set scores.
//   event.scorecard = { teamA: [uid, uid], teamB: [uid, uid], sets: [[6, 4], [3, 6], [7, 5]],
//                       recordedBy, recordedByName, recordedAt }
// Before anyone enters a score the pairs are a default split of the game's
// players (first two vs last two), which the score entry lets you change.

export function playersOf(event) {
  return Object.values(event.participants || {})
    .filter((p) => p.status !== "declined" && p.status !== "open")
    .map((p) => p.uid);
}

// The three ways to split four players into two pairs.
export function pairings(uids) {
  if (uids.length !== 4) return [[uids.slice(0, Math.ceil(uids.length / 2)), uids.slice(Math.ceil(uids.length / 2))]];
  const [a, b, c, d] = uids;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

export function teamsOf(event) {
  const sc = event.scorecard;
  const now = playersOf(event);
  if (sc?.teamA?.length && sc?.teamB?.length && [...sc.teamA, ...sc.teamB].every((u) => now.includes(u)) && sc.teamA.length + sc.teamB.length === now.length) {
    return [sc.teamA, sc.teamB];
  }
  return pairings(now)[0];
}

export const cleanSets = (sets) => (sets || []).map(([x, y]) => [Number(x), Number(y)]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && (x > 0 || y > 0));

export function setsWon(sets) {
  let a = 0;
  let b = 0;
  for (const [x, y] of cleanSets(sets)) {
    if (x > y) a += 1;
    else if (y > x) b += 1;
  }
  return [a, b];
}

// "A" | "B" | null (no score or level)
export function winner(event) {
  const sets = event.scorecard?.sets;
  if (!sets || cleanSets(sets).length === 0) return null;
  const [a, b] = setsWon(sets);
  return a > b ? "A" : b > a ? "B" : null;
}

// For stats: did this player's pair win this game? "win" | "loss" | null
export function playerOutcome(event, uid) {
  const w = winner(event);
  if (!w) return null;
  const [A, B] = teamsOf(event);
  if (A.includes(uid)) return w === "A" ? "win" : "loss";
  if (B.includes(uid)) return w === "B" ? "win" : "loss";
  return null;
}

export function hasStarted(event, now = new Date()) {
  if (!event.date) return false;
  return new Date(`${event.date}T${event.startTime || "00:00"}`) <= now;
}
