// Court-cost split for the Winter season (More → Payments).
//
// Each court (one weekly slot, e.g. "Saturday · Court") is paid for up
// front by one member. That member's outlay is split across every player
// by how many games they have on that court:
//
//   cost per player-game = amount paid ÷ (total weeks × players per game)
//   player owes payer    = games on that court × cost per player-game
//
// Game counts come from the Winter schedule in the app (every player on a
// game with that court's title, past or upcoming, whatever their status —
// someone who opens a slot keeps paying for it until it's claimed). An
// admin can override a count where the season was agreed differently.
//
// Stored on the team doc as `payments`:
//   { totalWeeks, playersPerGame,
//     courts: [{ id, label, slotTitle, payerName, payerUid, amount, phone }],
//     overrides: { [courtId]: { [uid]: games } },
//     received: { [courtId]: { [uid]: true } } }

export const DEFAULT_COURTS = [
  { id: "sat", label: "SAT", slotTitle: "Saturday · Court" },
  { id: "sun1", label: "SUN1", slotTitle: "Sunday · Court 1" },
  { id: "sun2", label: "SUN2", slotTitle: "Sunday · Court 2" },
];

export function defaultPayments() {
  return {
    totalWeeks: 24,
    playersPerGame: 4,
    courts: DEFAULT_COURTS.map((c) => ({ ...c, payerName: "", payerUid: "", amount: "", phone: "" })),
    overrides: {},
    received: {},
  };
}

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const money = (n) => `$${round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// { [courtId]: { [uid]: games } } straight from the schedule.
export function scheduledGames(events, courts) {
  const out = {};
  for (const c of courts) out[c.id] = {};
  for (const e of events) {
    if (e.mode !== "winter" || e.status === "cancelled") continue;
    const court = courts.find((c) => c.slotTitle && c.slotTitle.trim().toLowerCase() === (e.title || "").trim().toLowerCase());
    if (!court) continue;
    for (const uid of Object.keys(e.participants || {})) out[court.id][uid] = (out[court.id][uid] || 0) + 1;
  }
  return out;
}

export function computeSplit(payments, events, members) {
  const p = payments || defaultPayments();
  const weeks = Number(p.totalWeeks) || 0;
  const perGame = Number(p.playersPerGame) || 4;
  const sched = scheduledGames(events, p.courts || []);
  const memberList = Object.values(members || {});

  const courts = (p.courts || []).map((c) => {
    const amount = Number(c.amount) || 0;
    const slots = weeks * perGame;
    const rate = slots > 0 ? amount / slots : 0;
    const over = p.overrides?.[c.id] || {};
    const uids = new Set([...Object.keys(sched[c.id] || {}), ...Object.keys(over)]);
    const rows = [...uids]
      .map((uid) => {
        const member = members?.[uid];
        const scheduled = sched[c.id]?.[uid] || 0;
        const games = over[uid] != null && over[uid] !== "" ? Number(over[uid]) : scheduled;
        const self = Boolean(c.payerUid) && c.payerUid === uid;
        const received = self || Boolean(p.received?.[c.id]?.[uid]);
        return { uid, name: member?.name || "(removed player)", games, scheduled, overridden: games !== scheduled, owes: round2(games * rate), self, received };
      })
      .filter((r) => r.games > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    const totalGames = rows.reduce((n, r) => n + r.games, 0);
    const receivable = round2(rows.reduce((n, r) => n + r.owes, 0));
    const outstanding = round2(rows.filter((r) => !r.received).reduce((n, r) => n + r.owes, 0));
    return { ...c, amount, rate, slots, rows, totalGames, scheduledTotal: Object.values(sched[c.id] || {}).reduce((a, b) => a + b, 0), receivable, outstanding, diff: round2(receivable - amount) };
  });

  // Per player across every court.
  const players = memberList
    .map((m) => {
      const lines = courts
        .map((c) => {
          const r = c.rows.find((x) => x.uid === m.uid);
          return r ? { courtId: c.id, label: c.label, payerName: c.payerName, phone: c.phone, games: r.games, owes: r.owes, self: r.self, received: r.received } : null;
        })
        .filter(Boolean);
      const games = lines.reduce((n, l) => n + l.games, 0);
      const total = round2(lines.reduce((n, l) => n + l.owes, 0));
      const due = round2(lines.filter((l) => !l.received).reduce((n, l) => n + l.owes, 0));
      return { uid: m.uid, name: m.name, lines, games, total, due };
    })
    .filter((x) => x.games > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    courts,
    players,
    totalPaid: round2(courts.reduce((n, c) => n + c.amount, 0)),
    totalReceivable: round2(courts.reduce((n, c) => n + c.receivable, 0)),
    totalOutstanding: round2(courts.reduce((n, c) => n + c.outstanding, 0)),
  };
}
