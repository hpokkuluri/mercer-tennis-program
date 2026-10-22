// Pure logic for the Wednesday / Friday night weekend reminders — kept
// separate from the scheduled function so it can be tested without
// Firebase or Gmail. See netlify/functions/weekend-reminders.mjs.

const TZ = "America/New_York";

// "YYYY-MM-DD" for a Date as seen in New York.
export function nyDate(d) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Games from tomorrow through the next 3 days: on Wednesday night that's
// Thu–Sun, on Friday night Sat–Mon — i.e. the coming weekend either way.
export function reminderWindow(now = new Date()) {
  const today = nyDate(now);
  return { today, start: addDays(today, 1), end: addDays(today, 4) };
}

function pretty(date) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

function hhmm12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}

const STATUS = { accepted: "Confirmed", pending: "Not confirmed yet", open: "Spot open", declined: "Declined" };

function gameLine(e) {
  const time = e.startTime ? `${hhmm12(e.startTime)}${e.endTime && e.endTime !== e.startTime ? `–${hhmm12(e.endTime)}` : ""}` : "";
  return `${pretty(e.date)}${time ? ` · ${time}` : ""} · ${e.title}${e.location ? ` · ${e.location}` : ""}`;
}

function lineup(e) {
  return Object.values(e.participants || {})
    .filter((p) => p.status !== "declined")
    .map((p) => `${p.name}${p.status === "accepted" ? "" : ` (${STATUS[p.status] || p.status})`}`)
    .join(", ");
}

// team: { name, members: {uid: {uid,name,email,isAdmin}} }, events: winter events in the window.
// Returns [{ to: [emails], subject, text }].
export function buildReminders({ team, events, appUrl, kind }) {
  const games = events
    .filter((e) => e.mode === "winter" && e.status !== "cancelled")
    .sort((a, b) => (a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || "")));
  if (games.length === 0) return [];
  const members = Object.values(team.members || {});
  const out = [];

  // 1. Each player: their own games (confirmed or still pending), with the lineup.
  for (const m of members) {
    if (!m.email) continue;
    const mine = games.filter((e) => {
      const p = e.participants?.[m.uid];
      return p && (p.status === "accepted" || p.status === "pending");
    });
    if (mine.length === 0) continue;
    const first = m.name.split(" ")[0];
    const blocks = mine.map((e) => {
      const me = e.participants[m.uid];
      return `• ${gameLine(e)}\n  With: ${lineup(e)}${me.status === "pending" ? "\n  You haven't confirmed this one yet — please accept or decline in the app." : ""}`;
    });
    out.push({
      to: [m.email],
      subject: `Reminder: your tennis this weekend — ${mine.map((e) => pretty(e.date)).join(", ")}`,
      text: `Hi ${first},\n\n${kind === "fri" ? "See you on court!" : "Heads-up for the weekend."} You're playing:\n\n${blocks.join("\n\n")}\n\nCan't make it? Open your spot to the team from the game's page so someone can take it: ${appUrl}\n\n— Mercer Tennis Program`,
    });
  }

  // 2. Admins: the whole weekend at a glance, flagging anything not fully confirmed.
  const admins = members.filter((m) => m.isAdmin && m.email).map((m) => m.email);
  if (admins.length > 0) {
    const problems = games.filter((e) => Object.values(e.participants || {}).some((p) => p.status !== "accepted"));
    const blocks = games.map((e) => {
      const ps = Object.values(e.participants || {});
      const ok = ps.filter((p) => p.status === "accepted").length;
      return `• ${gameLine(e)}\n  ${ok} of ${ps.length} confirmed: ${lineup(e)}`;
    });
    out.push({
      to: admins,
      subject: `Weekend lineup — ${games.length} game${games.length === 1 ? "" : "s"}${problems.length ? `, ${problems.length} need attention` : ", all confirmed"}`,
      text: `${team.name} — games ${pretty(games[0].date)} to ${pretty(games[games.length - 1].date)}:\n\n${blocks.join("\n\n")}\n\n${problems.length ? `${problems.length} game${problems.length === 1 ? " has" : "s have"} open, pending or declined spots.` : "Every spot is confirmed."}\n\n${appUrl}\n\n— Mercer Tennis Program`,
    });
  }
  return out;
}
