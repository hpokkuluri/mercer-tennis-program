// When a game starts and ends, in the phone's local time (the team is all
// in New York). A game is "over" — played — once its end time passes; with
// no end time on file it's assumed to last 90 minutes.

export function gameStart(e) {
  return e?.date ? new Date(`${e.date}T${e.startTime || "00:00"}`) : null;
}

export function gameEnd(e) {
  if (!e?.date) return null;
  if (e.endTime && (!e.startTime || e.endTime > e.startTime)) return new Date(`${e.date}T${e.endTime}`);
  const s = gameStart(e);
  return new Date(s.getTime() + (e.startTime ? 90 : 24 * 60) * 60000);
}

export const isOver = (e, now = new Date()) => Boolean(e?.date) && gameEnd(e) <= now;
export const isLive = (e, now = new Date()) => Boolean(e?.date) && gameStart(e) <= now && now < gameEnd(e);
export const notOver = (e, now = new Date()) => !e?.date || !isOver(e, now);
