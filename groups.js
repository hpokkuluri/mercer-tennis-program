// Shared helper for Summer "open sign-up" events: players don't get invited
// individually — anyone on the team can tap Join, and joins are grouped in
// order into teams of `teamSize` (default 4). The first `teamSize` people to
// join lock in Team 1; the next batch queues up as "pending" until it also
// fills, at which point Team 2 (and so on) is formed.

export function computeGroups(event) {
  const teamSize = event.teamSize || 4;
  const order = (event.joinOrder || []).filter((uid) => event.participants?.[uid]);
  const groups = [];
  for (let i = 0; i < order.length; i += teamSize) {
    const uids = order.slice(i, i + teamSize);
    groups.push({ index: groups.length, uids, full: uids.length === teamSize });
  }
  return { teamSize, groups, totalJoined: order.length };
}

export function isOpenEvent(event) {
  return event.mode === "summer" && Array.isArray(event.joinOrder);
}

export function summaryLine(event) {
  const { teamSize, groups, totalJoined } = computeGroups(event);
  if (totalJoined === 0) return `Open — 0/${teamSize} joined`;
  const fullCount = groups.filter((g) => g.full).length;
  const last = groups[groups.length - 1];
  if (last.full) {
    return `${fullCount} team${fullCount === 1 ? "" : "s"} formed (${teamSize}/${teamSize})`;
  }
  const teamsWord = fullCount === 1 ? "1 team formed" : fullCount > 1 ? `${fullCount} teams formed` : null;
  const forming = `Team ${last.index + 1} forming — ${last.uids.length}/${teamSize}`;
  return teamsWord ? `${teamsWord} · ${forming}` : forming;
}
