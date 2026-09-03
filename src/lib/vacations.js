// Vacation days live on the team member record itself
// (team.members[uid].vacations = [{id, start, end}], start/end are
// "YYYY-MM-DD" date strings, inclusive on both ends). Kept as a plain
// array patched via updateMemberInTeam so no new backend functions were
// needed for either backend.

export function genVacationId() {
  return "vac_" + Math.random().toString(36).slice(2, 10);
}

// Does a single event date (YYYY-MM-DD) fall inside a vacation range?
export function dateInRange(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}

// Every upcoming Winter event this member is on the roster for (any
// status other than declined/cancelled) that falls inside the given
// vacation range — used both when a player adds a vacation (to warn
// them immediately) and when an admin assigns someone to a game.
export function conflictsForRange(events, uid, start, end) {
  return events.filter((e) => {
    if (e.mode !== "winter" || e.status === "cancelled") return false;
    const p = e.participants?.[uid];
    if (!p || p.status === "declined") return false;
    return dateInRange(e.date, start, end);
  });
}

// Does this member have a vacation covering this specific date? Used to
// flag a candidate in the Propose/Add-Players picker before an admin
// assigns them.
export function isOnVacation(member, dateStr) {
  return (member?.vacations || []).some((v) => dateInRange(dateStr, v.start, v.end));
}

// All vacation-vs-assignment conflicts across the whole team, for the
// admin-facing notifications list — every {member, vacation, event}
// triple where an assigned/pending/accepted participant's game date
// falls inside their own vacation range.
export function allTeamConflicts(team, events) {
  const out = [];
  for (const member of Object.values(team?.members || {})) {
    for (const v of member.vacations || []) {
      for (const e of conflictsForRange(events, member.uid, v.start, v.end)) {
        out.push({ member, vacation: v, event: e });
      }
    }
  }
  return out;
}

export function formatRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  const s = new Date(start + "T00:00:00").toLocaleDateString(undefined, opts);
  if (start === end) return s;
  const e = new Date(end + "T00:00:00").toLocaleDateString(undefined, opts);
  return `${s} – ${e}`;
}
