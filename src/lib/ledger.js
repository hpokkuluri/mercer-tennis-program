// Winter games are paid for by each player, so everyone wants a plain
// answer to "how many games have I actually played, and what's still
// coming up." Nothing here is stored — it's derived every render from
// the events + that player's participant record, so there's no batch
// job and nothing can go stale:
//
//   - the event's date is still today or in the future  -> "pending"
//   - the date has passed and the player was accepted   -> "played"
//   - the date has passed and they weren't (declined, no
//     response, or gave the slot up and nobody claimed it) -> "not played"
//
// A cancelled event never counts against or for anyone.

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function bucketFor(event, participant) {
  const today = todayStr();
  if (event.date >= today) return "pending";
  if (participant.status === "accepted") return "played";
  return "notPlayed"; // declined, never responded, or open/unclaimed
}

export function computeLedger(events, uid) {
  const rows = events
    .filter((e) => e.mode === "winter" && e.status !== "cancelled" && e.participants?.[uid])
    .map((e) => {
      const p = e.participants[uid];
      return { event: e, participant: p, bucket: bucketFor(e, p) };
    })
    .sort((a, b) => (b.event.date + b.event.startTime).localeCompare(a.event.date + a.event.startTime));

  const counts = {
    assigned: rows.length,
    played: rows.filter((r) => r.bucket === "played").length,
    notPlayed: rows.filter((r) => r.bucket === "notPlayed").length,
    pending: rows.filter((r) => r.bucket === "pending").length,
  };

  return { rows, counts };
}
