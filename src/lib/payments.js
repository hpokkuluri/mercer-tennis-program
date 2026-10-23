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
        const claimed = !received && Boolean(p.claimed?.[c.id]?.[uid]);
        return { uid, name: member?.name || "(removed player)", games, scheduled, overridden: games !== scheduled, owes: round2(games * rate), self, received, claimed };
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
          return r ? { courtId: c.id, court: c, label: c.label, payerName: c.payerName, phone: c.phone, games: r.games, owes: r.owes, self: r.self, received: r.received, claimed: r.claimed } : null;
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

// ---------------------------------------------------------------------
// Reading Hari's own payment sheet (the "Mercer County Indoor Season"
// block): a header row of player names, then per court a "Games" row and a
// "$ To Pay" row, with the payer ("Alladi / Zelle"), Zelle number and total
// to the right of the "$ To Pay" row:
//
//   SAT   Games     9   9  10 …                      96
//         $ To Pay  …                Alladi / Zelle  732 407 9616  $1,229.76  …
//
// Returns { courts: [{ label, counts: {NAME: n}, payerName, phone, amount }] }
// or null if no such block is found. `aoa` is a sheet as an array of rows.
// ---------------------------------------------------------------------

const COURT_RE = /^(SAT|SUN|SA|SU|MON|TUE|WED|THU|FRI)\s*-?\s*\d*$/i;
const NOT_PLAYER = /pay|zelle|receiv|total|outstanding|phone|amount|games|court|player|week|cost|season|day|time|date|^o$|^psc$/i;
const isName = (v) => {
  const s = String(v ?? "").trim();
  return s.length >= 2 && /^[A-Za-z][A-Za-z .'-]*$/.test(s) && !NOT_PLAYER.test(s);
};
const toNum = (v) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[$,\s]/g, "");
  return s && !Number.isNaN(Number(s)) ? Number(s) : null;
};
export const normCourt = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function parsePaymentSheet(aoa) {
  const gameRows = [];
  aoa.forEach((row, r) => {
    const gi = row.findIndex((c) => /^games$/i.test(String(c ?? "").trim()));
    if (gi < 0) return;
    const label = row.slice(0, gi).map((c) => String(c ?? "").trim()).find((c) => COURT_RE.test(c));
    if (label) gameRows.push({ r, gi, label });
  });
  if (gameRows.length === 0) return null;

  // Header: the row above the first "Games" row with the most player names.
  let header = -1;
  let best = 0;
  for (let r = gameRows[0].r - 1; r >= Math.max(0, gameRows[0].r - 12); r--) {
    const n = (aoa[r] || []).filter(isName).length;
    if (n > best) {
      best = n;
      header = r;
    }
  }
  if (header < 0 || best < 2) return null;
  const cols = [];
  (aoa[header] || []).forEach((v, c) => {
    if (c > gameRows[0].gi && isName(v)) cols.push({ c, name: String(v).replace(/\s+/g, " ").trim() });
  });
  const lastPlayerCol = Math.max(...cols.map((x) => x.c));

  const courts = gameRows.map(({ r, label }) => {
    const counts = {};
    for (const { c, name } of cols) {
      const n = toNum(aoa[r]?.[c]);
      if (n && n > 0) counts[name] = Math.round(n);
    }
    // Payer details sit to the right of the players on the "$ To Pay" row below.
    const payRow = aoa[r + 1] || [];
    const extra = payRow.slice(lastPlayerCol + 1).map((c) => String(c ?? "").trim()).filter(Boolean);
    const payerCell = extra.find((x) => /[A-Za-z]/.test(x) && !/^\$/.test(x));
    const payerName = payerCell ? payerCell.split("/")[0].trim() : "";
    const phone = extra.find((x) => (x.replace(/\D/g, "").length >= 10) && !/\$/.test(x) && !/\./.test(x.replace(/\s/g, ""))) || "";
    const money = extra.filter((x) => x !== phone && x !== payerCell).map(toNum).filter((n) => n != null && n >= 100 && n < 1000000);
    return { label: label.toUpperCase().replace(/\s+/g, ""), counts, payerName, phone, amount: money.length ? money[0] : null };
  });
  return { courts, players: cols.map((x) => x.name) };
}

const squash = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
// Sheet name → roster member: full name, else a unique first name (SHIV.K = "Shiv K").
export function matchMember(name, members) {
  const list = Object.values(members || {});
  const k = squash(name);
  const full = list.filter((m) => squash(m.name) === k);
  if (full.length === 1) return full[0];
  const first = list.filter((m) => squash(m.name.split(/\s+/)[0]) === k);
  return first.length === 1 ? first[0] : null;
}

const SLOT_GUESS = { SAT: "Saturday · Court", SUN: "Sunday · Court", SUN1: "Sunday · Court 1", SUN2: "Sunday · Court 2" };

// Merge a parsed payment sheet into the stored payments: the sheet's game
// counts become the counts for every player on that court (0 if not listed),
// and its payer / Zelle / amount fill in the court. Courts are matched by
// label (SAT, SUN1 …); new labels become new courts.
export function applyPaymentSheet(payments, parsed, members) {
  const p = JSON.parse(JSON.stringify(payments || defaultPayments()));
  p.overrides ||= {};
  const unmatched = new Set();
  for (const sc of parsed.courts) {
    let court = p.courts.find((c) => normCourt(c.label) === normCourt(sc.label));
    if (!court) {
      court = { id: `c${normCourt(sc.label).toLowerCase()}${p.courts.length}`, label: sc.label, slotTitle: SLOT_GUESS[normCourt(sc.label)] || "", payerName: "", payerUid: "", amount: "", phone: "" };
      p.courts.push(court);
    }
    const counts = {};
    for (const m of Object.values(members || {})) counts[m.uid] = 0;
    for (const [name, n] of Object.entries(sc.counts)) {
      const m = matchMember(name, members);
      if (m) counts[m.uid] = n;
      else unmatched.add(name);
    }
    p.overrides[court.id] = counts;
    if (sc.payerName) {
      court.payerName = sc.payerName;
      court.payerUid = matchMember(sc.payerName, members)?.uid || "";
    }
    if (sc.phone) court.phone = sc.phone;
    if (sc.amount) court.amount = round2(sc.amount);
  }
  return { payments: p, unmatched: [...unmatched] };
}
