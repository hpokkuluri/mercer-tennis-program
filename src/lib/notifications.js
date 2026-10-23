// Shared logic behind the bell badge on the Hub and the full list on the
// Notifications screen, so the two never drift apart — the badge count
// is just the sum of what each of these returns.

import { isOpenEvent } from "./groups";
import { allTeamConflicts } from "./vacations";

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const upcoming = (e) => !e.date || e.date >= todayStr();

// The signed-in player's next game (accepted, waiting on them, or their spot
// currently open), soonest first.
export function myNextGame(events, uid) {
  return events
    .filter((e) => e.status !== "cancelled" && upcoming(e) && ["accepted", "pending", "open"].includes(e.participants?.[uid]?.status))
    .sort((a, b) => (a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || "")))[0] || null;
}

export function pendingInvites(events, uid) {
  return events.filter((e) => e.participants?.[uid]?.status === "pending" && e.status !== "cancelled" && upcoming(e));
}

export function openToJoinEvents(events, uid) {
  return events.filter((e) => isOpenEvent(e) && e.status !== "cancelled" && !e.participants?.[uid] && upcoming(e));
}

// This player's own vacation-vs-assignment conflicts (they're on the
// roster for a Winter game that falls inside a range they marked away).
export function myVacationConflicts(team, events, uid) {
  return allTeamConflicts(team, events).filter((c) => c.member.uid === uid);
}

// Admin-only: everyone else's conflicts, so an admin can act on them —
// excludes the admin's own (already covered by myVacationConflicts).
export function teammateVacationConflicts(team, events, uid) {
  return allTeamConflicts(team, events).filter((c) => c.member.uid !== uid);
}

// Winter slots someone else opened up that this player could claim —
// excludes slots already claimed and any event this player is already on.
export function openSlotsToClaim(events, uid) {
  const out = [];
  events
    .filter((e) => e.mode === "winter" && e.status !== "cancelled" && upcoming(e))
    .forEach((e) => {
      if (e.participants?.[uid]) return;
      Object.values(e.participants || {})
        .filter((p) => p.status === "open" && p.uid !== uid)
        .forEach((opener) => out.push({ event: e, opener }));
    });
  return out;
}

// Total count for the Hub's bell badge — every category the current
// user has something to look at, admin-only categories included.
export function alertCount(team, events, profile, isAdmin) {
  const uid = profile.uid;
  let count =
    pendingInvites(events, uid).length +
    openToJoinEvents(events, uid).length +
    myVacationConflicts(team, events, uid).length +
    openSlotsToClaim(events, uid).length;
  if (isAdmin) count += teammateVacationConflicts(team, events, uid).length;
  return count;
}
