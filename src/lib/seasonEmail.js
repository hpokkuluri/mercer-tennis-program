import { sendSeasonScheduleEmail } from "./email";
import { notify } from "./push";
import { todayStr } from "./notifications";

const day = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const t12 = (t) => (t ? new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");

export function playerSeasonGames(events, uid) {
  const today = todayStr();
  return events
    .filter((e) => e.mode === "winter" && e.status !== "cancelled" && e.date >= today && ["accepted", "pending", "open"].includes(e.participants?.[uid]?.status))
    .sort((a, b) => (a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || "")));
}

export function buildSeasonEmail({ member, events, team, appUrl }) {
  const games = playerSeasonGames(events, member.uid);
  if (games.length === 0) return null;
  const first = member.name.split(" ")[0];
  const byMonth = {};
  for (const e of games) {
    const m = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
    (byMonth[m] ||= []).push(e);
  }
  const lines = Object.entries(byMonth).map(([m, list]) => {
    const rows = list.map((e) => {
      const others = Object.values(e.participants || {})
        .filter((p) => p.uid !== member.uid && p.status !== "declined")
        .map((p) => (team.members?.[p.uid]?.name || p.name || "").split(" ")[0]);
      return `  • ${day(e.date)}${e.startTime ? ` ${t12(e.startTime)}` : ""} — ${e.title}${e.location ? `, ${e.location}` : ""}\n      with ${others.join(", ") || "—"}`;
    });
    return `${m.toUpperCase()}\n${rows.join("\n")}`;
  });
  const days = {};
  games.forEach((e) => {
    const k = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
    days[k] = (days[k] || 0) + 1;
  });
  return {
    to: member.email,
    subject: `Your ${team.name} Winter schedule — ${games.length} game${games.length === 1 ? "" : "s"}`,
    text: [
      `Hi ${first},`,
      "",
      `Here's your Winter schedule for ${team.name}: ${games.length} game${games.length === 1 ? "" : "s"} (${Object.entries(days).map(([d, n]) => `${n} on ${d}s`).join(", ")}), from ${day(games[0].date)} to ${day(games[games.length - 1].date)}. You're confirmed for all of them — no need to accept anything.`,
      "",
      ...lines.flatMap((l) => [l, ""]),
      "Can't make one? Open the game in the app and tap \"Can't make it? Open your spot\" — the team is told right away and the first to claim it takes it.",
      "Reminders with that weekend's line-up come every Wednesday and Friday at 6 PM.",
      "Tip: in the app, More → Game History & Ledger → \"Add my games to my calendar\" puts all of these in your phone's calendar.",
      "",
      appUrl,
      "",
      "— Mercer Tennis Program",
    ].join("\n"),
    count: games.length,
  };
}

// Sends each player (with an email) their own schedule. Returns how many went out.
export async function sendSeasonSchedules({ team, events, appUrl, onlyUids }) {
  let sent = 0;
  let attempted = 0;
  const reached = [];
  for (const m of Object.values(team.members || {})) {
    if (onlyUids && !onlyUids.includes(m.uid)) continue;
    const mail = buildSeasonEmail({ member: m, events, team, appUrl });
    if (!mail) continue;
    reached.push(m.uid);
    if (!m.email) continue;
    attempted += 1;
    const res = await sendSeasonScheduleEmail(mail).catch(() => ({ sent: false }));
    if (res.sent) sent += 1;
  }
  notify({ teamId: team.id, uids: reached, title: "Your Winter schedule is ready 🎾", body: "All your games are in the app — tap to see them.", url: "/#/ledger" });
  return { sent, attempted, players: reached.length, noEmail: reached.filter((u) => !team.members[u]?.email).length };
}
