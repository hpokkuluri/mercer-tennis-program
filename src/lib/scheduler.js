// Season auto-scheduler (Winter Schedule → Generate).
//
// Input: players with a rating (3.0, 3.5 …) and a total number of games,
// the court slots each week (e.g. Sat 9:00 one court, Sun 9:00 two courts),
// a start date and number of weeks (some weeks can be skipped for holidays),
// plus each player's vacation days.
//
// Rules, in order of importance:
//   1. never more than one game per player per day, never on a vacation day
//   2. every player gets exactly their number of games (as far as the
//      calendar allows)
//   3. players on the same court have similar ratings
//   4. each player's games are spread out over the season
// Randomness picks between equally good options, so "Shuffle" gives a new
// schedule each time. Several attempts are made; the best one is kept.

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isoAdd(iso, days) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekdayOf(iso) {
  return new Date(iso + "T12:00:00Z").getUTCDay();
}

// Mulberry32 — small seeded PRNG so a schedule can be reproduced from its seed.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Week list: `weeks` playing weeks starting the week of startDate, skipping
// any week whose anchor date is in `skip`. Each week's anchor is startDate + 7k.
export function buildWeeks(startDate, weeks, skip = []) {
  const out = [];
  const skipSet = new Set(skip);
  let k = 0;
  while (out.length < weeks && k < weeks + 60) {
    const anchor = isoAdd(startDate, 7 * k);
    if (!skipSet.has(anchor)) out.push({ index: out.length + 1, anchor });
    k += 1;
  }
  return out;
}

// Concrete game slots: one per (week, slot definition). A slot's date is the
// first date on/after the week anchor that falls on the slot's weekday.
export function buildSlots(weeks, slotDefs) {
  const out = [];
  for (const w of weeks) {
    for (const s of slotDefs) {
      const offset = (s.weekday - weekdayOf(w.anchor) + 7) % 7;
      out.push({ week: w.index, date: isoAdd(w.anchor, offset), def: s });
    }
  }
  return out.sort((a, b) => (a.date + a.def.time + a.def.title).localeCompare(b.date + b.def.time + b.def.title));
}

function onVacation(p, date) {
  return (p.vacations || []).some((v) => date >= v.start && date <= v.end);
}

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// variety 0 = strictly similar ratings; 1 = also rotate who plays together
// (ratings matter half as much, repeat partners cost extra).
function attempt(players, slots, perGame, rand, variety = 0) {
  const pairs = new Map();
  const together = (a, b) => pairs.get(pairKey(a, b)) || 0;
  const st = Object.fromEntries(players.map((p) => [p.id, { left: p.games, days: new Set(), last: -99 }]));
  const dates = [...new Set(slots.map((s) => s.date))];
  const dateIndex = Object.fromEntries(dates.map((d, i) => [d, i]));
  // Remaining playable days per player from a given date (inclusive), so
  // players who are running out of chances get picked first.
  const availFrom = {};
  for (const p of players) {
    const arr = new Array(dates.length + 1).fill(0);
    for (let i = dates.length - 1; i >= 0; i--) arr[i] = arr[i + 1] + (onVacation(p, dates[i]) ? 0 : 1);
    availFrom[p.id] = arr;
  }
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const games = [];
  // Slots on the same date are filled together so nobody lands on two courts that day.
  for (const date of dates) {
    const today = slots.filter((s) => s.date === date);
    const di = dateIndex[date];
    for (const slot of today) {
      const eligible = players.filter((p) => st[p.id].left > 0 && !st[p.id].days.has(date) && !onVacation(p, date));
      // urgency: games still owed vs. days still available (incl. today)
      const urg = (p) => st[p.id].left / Math.max(1, availFrom[p.id][di]);
      // pace: how far behind an even spread over the season this player is
      const pace = (p) => (p.games * (di + 1)) / dates.length - (p.games - st[p.id].left);
      const score = (p) => urg(p) * 10 + pace(p) * 3 + (di - st[p.id].last <= 1 ? -2 : 0) + rand() * 0.8;
      const ranked = eligible.map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s);
      if (ranked.length === 0) {
        games.push({ ...slot, players: [] });
        continue;
      }
      const anchor = ranked[0].p;
      const ratingWeight = variety ? 4.5 : 6;
      const pool = ranked.slice(1).map(({ p, s }) => ({ p, base: s - Math.abs(p.rating - anchor.rating) * ratingWeight + (urg(p) >= 1 ? 50 : 0) }));
      const chosen = [anchor];
      while (chosen.length < perGame && pool.length) {
        let bi = 0;
        let bs = -Infinity;
        pool.forEach((c, i) => {
          const sc = c.base - (variety ? 1.5 * chosen.reduce((n, q) => n + together(c.p.id, q.id), 0) : 0);
          if (sc > bs) {
            bs = sc;
            bi = i;
          }
        });
        chosen.push(pool.splice(bi, 1)[0].p);
      }
      for (let i = 0; i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) pairs.set(pairKey(chosen[i].id, chosen[j].id), together(chosen[i].id, chosen[j].id) + 1);
      for (const p of chosen) {
        st[p.id].left -= 1;
        st[p.id].days.add(date);
        st[p.id].last = di;
      }
      games.push({ ...slot, players: chosen.map((p) => p.id) });
    }
  }
  improve(games, byId, perGame, rand, variety);
  return games;
}

const spread = (g, byId) => {
  if (g.players.length < 2) return 0;
  const r = g.players.map((id) => byId[id].rating);
  return Math.max(...r) - Math.min(...r);
};

// Swap players between two games on different dates when that tightens the
// rating spread on both courts without breaking the one-game-per-day or
// vacation rules. Game counts never change.
function improve(games, byId, perGame, rand, variety = 0) {
  const playingOn = {};
  for (const g of games) for (const id of g.players) (playingOn[id] ||= new Set()).add(g.date);
  const pairs = new Map();
  const bump = (a, b, d) => pairs.set(pairKey(a, b), (pairs.get(pairKey(a, b)) || 0) + d);
  for (const g of games) for (let i = 0; i < g.players.length; i++) for (let j = i + 1; j < g.players.length; j++) bump(g.players[i], g.players[j], 1);
  // Change in sum-of-squares of pair counts if `out` leaves game g and `inn` joins it.
  const pairDelta = (g, out, inn) => {
    let d = 0;
    for (const x of g.players) {
      if (x === out) continue;
      const co = pairs.get(pairKey(out, x)) || 0;
      const ci = pairs.get(pairKey(inn, x)) || 0;
      d += (co - 1) ** 2 - co ** 2 + (ci + 1) ** 2 - ci ** 2;
    }
    return d;
  };
  const rw = variety ? 0.8 : 1;
  for (let it = 0; it < 6000; it++) {
    const a = games[Math.floor(rand() * games.length)];
    const b = games[Math.floor(rand() * games.length)];
    if (a === b || a.date === b.date || !a.players.length || !b.players.length) continue;
    const ia = Math.floor(rand() * a.players.length);
    const ib = Math.floor(rand() * b.players.length);
    const pa = a.players[ia];
    const pb = b.players[ib];
    if (pa === pb || a.players.includes(pb) || b.players.includes(pa)) continue;
    if (playingOn[pa].has(b.date) || playingOn[pb].has(a.date)) continue;
    if (onVacation(byId[pa], b.date) || onVacation(byId[pb], a.date)) continue;
    const before = (spread(a, byId) + spread(b, byId)) * rw;
    const pd = variety ? (pairDelta(a, pa, pb) + pairDelta(b, pb, pa)) * 0.03 : 0;
    a.players[ia] = pb;
    b.players[ib] = pa;
    const after = (spread(a, byId) + spread(b, byId)) * rw + pd;
    if (after < before || (after === before && rand() < 0.1)) {
      if (variety) {
        for (const x of a.players) if (x !== pb) {
          bump(pa, x, -1);
          bump(pb, x, 1);
        }
        for (const x of b.players) if (x !== pa) {
          bump(pb, x, -1);
          bump(pa, x, 1);
        }
      }
      playingOn[pa].delete(a.date);
      playingOn[pa].add(b.date);
      playingOn[pb].delete(b.date);
      playingOn[pb].add(a.date);
    } else {
      a.players[ia] = pa;
      b.players[ib] = pb;
    }
  }
}

export function evaluate(games, players, perGame) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const got = Object.fromEntries(players.map((p) => [p.id, 0]));
  for (const g of games) for (const id of g.players) got[id] += 1;
  const short = players.map((p) => ({ id: p.id, name: p.name, want: p.games, got: got[p.id] })).filter((x) => x.got !== x.want);
  const unfilled = games.filter((g) => g.players.length < perGame).length;
  const spreads = games.filter((g) => g.players.length > 1).map((g) => spread(g, byId));
  const avgSpread = spreads.length ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;
  const maxSpread = spreads.length ? Math.max(...spreads) : 0;
  const missing = short.reduce((n, x) => n + Math.abs(x.want - x.got), 0);
  const pairs = new Map();
  for (const g of games) for (let i = 0; i < g.players.length; i++) for (let j = i + 1; j < g.players.length; j++) pairs.set(pairKey(g.players[i], g.players[j]), (pairs.get(pairKey(g.players[i], g.players[j])) || 0) + 1);
  const counts = [...pairs.values()];
  const maxPair = counts.length ? Math.max(...counts) : 0;
  const pairSq = counts.reduce((n, c) => n + c * c, 0) / Math.max(1, counts.length);
  return { got, short, unfilled, avgSpread, maxSpread, missing, maxPair, pairCount: counts.length, pairSq, cost: missing * 1000 + unfilled * 1000 + avgSpread * 10 + maxSpread };
}

// players: [{ id, name, rating, games, vacations }]
// slotDefs: [{ weekday, time, title, label }]
export function generateSchedule({ players, startDate, weeks, skip = [], slotDefs, perGame = 4, seed = Date.now(), attempts = 25, variety = 0 }) {
  const ws = buildWeeks(startDate, weeks, skip);
  const slots = buildSlots(ws, slotDefs);
  const ps = players.map((p) => ({ ...p, rating: Number(p.rating) || 0, games: Math.max(0, Math.round(Number(p.games) || 0)) }));
  let best = null;
  for (let i = 0; i < attempts; i++) {
    const s = (seed + i * 7919) >>> 0;
    const games = attempt(ps, slots, perGame, rng(s), variety);
    const ev = evaluate(games, ps, perGame);
    if (variety) ev.cost += ev.pairSq * 1.2;
    if (!best || ev.cost < best.eval.cost) best = { games, eval: ev, seed: s };
  }
  const capacity = slots.length * perGame;
  const requested = ps.reduce((n, p) => n + p.games, 0);
  return { ...best, weeks: ws, capacity, requested };
}
