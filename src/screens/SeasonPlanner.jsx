import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Header, Card, SectionLabel, PrimaryButton, SecondaryButton, HomeButton, ErrorText } from "../components/UI";
import { CheckIcon, PlusIcon, TrashIcon, WarningIcon } from "../components/Icons";
import { WEEKDAYS, buildWeeks, generateSchedule, isoAdd, weekdayOf } from "../lib/scheduler";

const input = {
  width: "100%",
  minWidth: 0,
  border: "var(--border-width, 1px) solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 9px",
  fontSize: 13.5,
  outline: "none",
  background: "var(--card)",
  boxSizing: "border-box",
};
const small = { fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 };

function nextSaturday() {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return isoAdd(iso, (6 - weekdayOf(iso) + 7) % 7 || 7);
}
const short = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const long = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

// SAT, SUN1, SUN2 … — the same day labels the season spreadsheet uses, so an
// exported plan can be imported again.
function dayLabels(slotDefs) {
  const per = {};
  slotDefs.forEach((s) => (per[s.weekday] = (per[s.weekday] || 0) + 1));
  const seen = {};
  return slotDefs.map((s) => {
    seen[s.weekday] = (seen[s.weekday] || 0) + 1;
    const base = WEEKDAYS[s.weekday].toUpperCase();
    return per[s.weekday] > 1 ? `${base}${seen[s.weekday]}` : base;
  });
}

const DEFAULT_SLOTS = [
  { weekday: 6, time: "09:00", title: "Saturday · Court" },
  { weekday: 0, time: "09:00", title: "Sunday · Court 1" },
  { weekday: 0, time: "09:00", title: "Sunday · Court 2" },
];

export default function SeasonPlanner() {
  const { team, events, profile, isAdmin, createEvent, setSchedulerSetup } = useApp();
  const navigate = useNavigate();
  const members = useMemo(() => Object.values(team?.members || {}).sort((a, b) => a.name.localeCompare(b.name)), [team]);
  const saved = team?.scheduler || {};

  const [startDate, setStartDate] = useState(saved.startDate || nextSaturday());
  const [weeks, setWeeks] = useState(saved.weeks || 24);
  const [perGame, setPerGame] = useState(saved.perGame || 4);
  const [slotDefs, setSlotDefs] = useState(saved.slotDefs || DEFAULT_SLOTS);
  const [skip, setSkip] = useState(saved.skip || []);
  const [players, setPlayers] = useState(() =>
    Object.fromEntries(members.map((m) => [m.uid, { include: saved.players?.[m.uid]?.include ?? true, rating: saved.players?.[m.uid]?.rating ?? "", games: saved.players?.[m.uid]?.games ?? "" }]))
  );
  const [result, setResult] = useState(null);
  const [markConfirmed, setMarkConfirmed] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");

  const labels = dayLabels(slotDefs);
  const blank = { include: true, rating: "", games: "" };
  const getP = (uid) => players[uid] || blank;
  // Show enough weeks to cover skipped ones.
  const weekList = useMemo(() => buildWeeks(startDate, Number(weeks) + skip.length + 4, []), [startDate, weeks, skip.length]);
  const playing = useMemo(() => buildWeeks(startDate, Number(weeks) || 0, skip), [startDate, weeks, skip]);
  const chosen = members.filter((m) => getP(m.uid).include);
  const requested = chosen.reduce((n, m) => n + (Number(getP(m.uid).games) || 0), 0);
  const capacity = (Number(weeks) || 0) * slotDefs.length * (Number(perGame) || 4);
  const missingInput = chosen.filter((m) => getP(m.uid).rating === "" || getP(m.uid).games === "");

  const setP = (uid, patch) => setPlayers((ps) => ({ ...ps, [uid]: { ...(ps[uid] || blank), ...patch } }));
  const setSlot = (i, patch) => setSlotDefs((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const toggleSkip = (anchor) => setSkip((s) => (s.includes(anchor) ? s.filter((x) => x !== anchor) : [...s, anchor]));

  function run(seed) {
    setError("");
    setCreated(null);
    if (chosen.length < Number(perGame)) return setError(`Pick at least ${perGame} players.`);
    if (missingInput.length) return setError(`Enter a rating and number of games for: ${missingInput.map((m) => m.name).join(", ")}.`);
    const res = generateSchedule({
      players: chosen.map((m) => ({ id: m.uid, name: m.name, rating: getP(m.uid).rating, games: getP(m.uid).games, vacations: m.vacations || [] })),
      startDate,
      weeks: Number(weeks),
      skip,
      slotDefs,
      perGame: Number(perGame),
      seed,
    });
    setResult({ ...res, labels, slotDefs, ratings: Object.fromEntries(chosen.map((m) => [m.uid, Number(getP(m.uid).rating)])), ids: chosen.map((m) => m.uid) });
    setSchedulerSetup({ startDate, weeks: Number(weeks), perGame: Number(perGame), slotDefs, skip, players: Object.fromEntries(members.map((m) => [m.uid, getP(m.uid)])) }).catch(() => {});
  }

  const existingInRange = result
    ? events.filter((e) => e.mode === "winter" && e.status !== "cancelled" && result.games.some((g) => g.date === e.date && g.def.title === e.title))
    : [];

  async function createAll() {
    setCreating(true);
    let n = 0;
    let skipped = 0;
    for (const g of result.games) {
      if (g.players.length === 0) continue;
      if (existingInRange.some((e) => e.date === g.date && e.title === g.def.title)) {
        skipped += 1;
        continue;
      }
      const participants = {};
      g.players.forEach((uid) => {
        const m = team.members[uid];
        participants[uid] = { uid, name: m.name, initials: m.initials, color: m.color, status: markConfirmed ? "accepted" : "pending" };
      });
      const [h, mi] = g.def.time.split(":").map(Number);
      const end = `${String(Math.min(23, h + 2)).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
      try {
        await createEvent({
          type: "practice",
          title: g.def.title,
          date: g.date,
          startTime: g.def.time,
          endTime: end,
          location: "",
          note: `Week ${g.week}`,
          source: "planner",
          mode: "winter",
          organizerId: profile.uid,
          organizerName: profile.name,
          participants,
        });
        n += 1;
      } catch {
        // keep going
      }
    }
    setCreating(false);
    setCreated({ n, skipped });
  }

  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const ids = result.ids;
    const names = ids.map((id) => (team.members[id]?.name || "?").toUpperCase());
    const rows = [
      ["", "", "", "", ...names],
      ["", "", "", "RATING", ...ids.map((id) => result.ratings[id])],
      ["Wk", "Day", "Time", "GAMES", ...ids.map((id) => result.eval.got[id] || 0)],
    ];
    for (const g of result.games) {
      const idx = result.slotDefs.indexOf(g.def);
      const [y, m, d] = g.date.split("-").map(Number);
      rows.push([g.week, result.labels[idx], Number(g.def.time.replace(":", "")), `${m}/${d}/${y}`, ...ids.map((id, i) => (g.players.includes(id) ? names[i] : ""))]);
    }
    rows.push([]);
    rows.push(["LEGEND: NAME = SCHED'LD — generated by Mercer Tennis Program"]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 6 }, { wch: 6 }, { wch: 11 }, ...names.map(() => ({ wch: 10 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, `Tennis-Schedule-${startDate}.xlsx`);
  }

  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header title="Season Planner" right={<HomeButton />} />
        <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 14 }}>Only team admins can plan a season.</div>
      </div>
    );
  }

  const byId = Object.fromEntries(members.map((m) => [m.uid, m]));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Season Planner" right={<HomeButton />} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Give each player a rating and a number of games — the app builds the season: players of similar level on the same court, one game a day at most, nobody on a vacation day, games spread out evenly.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Season</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1.4 }}>
              <div style={small}>First week</div>
              <input data-testid="plan-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={input} />
            </div>
            <div style={{ flex: 0.8 }}>
              <div style={small}>Weeks</div>
              <input data-testid="plan-weeks" type="number" inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={input} />
            </div>
            <div style={{ flex: 0.8 }}>
              <div style={small}>Per court</div>
              <input type="number" inputMode="numeric" value={perGame} onChange={(e) => setPerGame(e.target.value)} style={input} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Courts each week</SectionLabel>
          {slotDefs.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ width: 40, fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)" }}>{labels[i]}</span>
              <select value={s.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })} style={{ ...input, width: 70 }}>
                {WEEKDAYS.map((d, wd) => (
                  <option key={d} value={wd}>{d}</option>
                ))}
              </select>
              <input type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} style={{ ...input, width: 96 }} />
              <input value={s.title} onChange={(e) => setSlot(i, { title: e.target.value })} placeholder="Name" style={input} />
              {slotDefs.length > 1 && (
                <button type="button" onClick={() => setSlotDefs((ds) => ds.filter((_, idx) => idx !== i))} style={{ border: "none", background: "var(--red-bg)", color: "var(--red-text)", borderRadius: "var(--radius-sm)", height: 34, width: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
          <SecondaryButton type="button" onClick={() => setSlotDefs((ds) => [...ds, { weekday: 0, time: "09:00", title: `Court ${ds.length + 1}` }])} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <PlusIcon /> Add court
          </SecondaryButton>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Weeks — tap to skip (holidays)</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {weekList
              .filter((w) => w.anchor <= (playing[playing.length - 1]?.anchor || w.anchor) || skip.includes(w.anchor))
              .map((w) => {
                const off = skip.includes(w.anchor);
                return (
                  <button
                    key={w.anchor}
                    type="button"
                    data-testid={`week-${w.anchor}`}
                    onClick={() => toggleSkip(w.anchor)}
                    style={{ fontSize: 12, fontWeight: 700, padding: "6px 9px", borderRadius: 999, border: "var(--border-width, 1px) solid var(--border)", background: off ? "var(--red-bg)" : "var(--card)", color: off ? "var(--red-text)" : "var(--text-muted)", textDecoration: off ? "line-through" : "none" }}
                  >
                    {short(w.anchor)}
                  </button>
                );
              })}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            {playing.length} playing weeks · {playing[0] && short(playing[0].anchor)} – {playing.length > 0 && short(playing[playing.length - 1].anchor)}
            {skip.length ? ` · ${skip.length} skipped` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Players</SectionLabel>
          <div style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 8, padding: "8px 12px", fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", borderBottom: "1px solid var(--border-soft, var(--border))" }}>
              <div style={{ flex: 1 }}>Player</div>
              <div style={{ width: 64 }}>Rating</div>
              <div style={{ width: 64 }}>Games</div>
            </div>
            {members.map((m) => {
              const p = getP(m.uid);
              return (
                <div key={m.uid} data-testid="plan-player" style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 12px", borderBottom: "1px solid var(--border-soft, var(--border))", opacity: p.include ? 1 : 0.5 }}>
                  <label style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, fontWeight: 600 }}>
                    <input type="checkbox" checked={p.include} onChange={(e) => setP(m.uid, { include: e.target.checked })} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    {(m.vacations || []).length > 0 && <span title="Has vacation days" style={{ fontSize: 12 }}>🏖️</span>}
                  </label>
                  <input data-testid={`rating-${m.name}`} type="number" step="0.5" min="1" max="7" inputMode="decimal" value={p.rating} disabled={!p.include} onChange={(e) => setP(m.uid, { rating: e.target.value })} placeholder="3.5" style={{ ...input, width: 64 }} />
                  <input data-testid={`games-${m.name}`} type="number" min="0" inputMode="numeric" value={p.games} disabled={!p.include} onChange={(e) => setP(m.uid, { games: e.target.value })} placeholder="0" style={{ ...input, width: 64 }} />
                </div>
              );
            })}
          </div>
          <div data-testid="plan-capacity" style={{ fontSize: 12.5, fontWeight: 600, color: requested === capacity ? "var(--green-text)" : "var(--amber-text)" }}>
            {requested} games requested · {capacity} spots ({weeks} weeks × {slotDefs.length} courts × {perGame})
            {requested < capacity ? ` — ${capacity - requested} spot${capacity - requested === 1 ? "" : "s"} will stay empty` : requested > capacity ? ` — ${requested - capacity} too many; some players will get fewer` : " ✓"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Vacation days already entered in the app are respected. Uncheck anyone sitting this season out.</div>
        </div>

        <ErrorText>{error}</ErrorText>
        <PrimaryButton data-testid="plan-generate" type="button" onClick={() => run(Date.now())}>
          {result ? "Generate again" : "Generate schedule"}
        </PrimaryButton>

        {result && (
          <div data-testid="plan-result" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {result.eval.short.length === 0 ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--green-text)" }}>
                  <CheckIcon width={14} height={14} /> Every player gets exactly their games.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--amber-text)" }}>
                  <WarningIcon width={13} height={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Couldn't fit everyone's games (vacations or too few courts): {result.eval.short.map((x) => `${x.name} ${x.got}/${x.want}`).join(", ")}</span>
                </div>
              )}
              {result.eval.unfilled > 0 && (
                <div style={{ fontSize: 12.5, color: "var(--amber-text)" }}>
                  {result.eval.unfilled} court{result.eval.unfilled === 1 ? " is" : "s are"} short of {perGame} players (marked below).
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Rating gap on a court: {result.eval.avgSpread.toFixed(2)} on average, {result.eval.maxSpread.toFixed(1)} at most · {result.games.length} games over {result.weeks.length} weeks
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <SecondaryButton data-testid="plan-shuffle" type="button" onClick={() => run(Date.now())} style={{ flex: 1 }}>🔀 Shuffle</SecondaryButton>
                <SecondaryButton data-testid="plan-excel" type="button" onClick={downloadExcel} style={{ flex: 1 }}>Download Excel</SecondaryButton>
              </div>
            </Card>

            {result.weeks.map((w) => {
              const gs = result.games.filter((g) => g.week === w.index);
              return (
                <div key={w.index} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}>Week {w.index}</div>
                  {gs.map((g, i) => {
                    const rs = g.players.map((id) => result.ratings[id] || 0);
                    const avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
                    return (
                      <Card key={i} data-testid="plan-game" style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 3, borderColor: g.players.length < perGame ? "var(--amber-text)" : undefined }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                          <span>{long(g.date)} · {g.def.time} · {g.def.title}</span>
                          <span>avg {avg.toFixed(1)}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {g.players.map((id) => `${byId[id]?.name.split(" ")[0]} (${result.ratings[id]})`).join(" · ") || "—"}
                          {g.players.length < perGame && <span style={{ color: "var(--amber-text)" }}> · {perGame - g.players.length} open</span>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })}

            <Card style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Put it on the Winter Schedule</div>
              {existingInRange.length > 0 && (
                <div style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--amber-text)" }}>
                  <WarningIcon width={12} height={12} style={{ flexShrink: 0, marginTop: 2 }} />
                  {existingInRange.length} of these games already exist and will be skipped. To replace them, use Import → Clear Winter schedule first.
                </div>
              )}
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                <input type="checkbox" checked={markConfirmed} onChange={(e) => setMarkConfirmed(e.target.checked)} />
                <span>Mark everyone confirmed (untick to have players accept each game in the app)</span>
              </label>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>No emails are sent when creating; weekly reminders still go out.</div>
              {created ? (
                <div data-testid="plan-created" style={{ fontSize: 13, fontWeight: 700, color: "var(--green-text)" }}>
                  Created {created.n} games{created.skipped ? ` (${created.skipped} already existed)` : ""}.{" "}
                  <button type="button" onClick={() => navigate("/winter")} style={{ border: "none", background: "none", color: "var(--text)", textDecoration: "underline", fontWeight: 700, padding: 0 }}>
                    View schedule
                  </button>
                </div>
              ) : (
                <PrimaryButton data-testid="plan-create" type="button" onClick={createAll} disabled={creating}>
                  {creating ? "Creating…" : `Create ${result.games.filter((g) => g.players.length && !existingInRange.some((e) => e.date === g.date && e.title === g.def.title)).length} games`}
                </PrimaryButton>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
