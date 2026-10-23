// POST (signed-in) → { https, webcal } — this player's personal calendar
// feed URL for the calendar function.
import { adminReady, db, userFrom, json } from "../lib/server.js";
import { calendarSecret, sign } from "../lib/calendarSign.js";

export default async (request) => {
  if (!adminReady()) return json(200, { ok: false, reason: "not-configured" });
  const user = await userFrom(request);
  if (!user) return json(401, { ok: false, reason: "unauthorized" });
  const { teamId } = await request.json().catch(() => ({}));
  if (!teamId) return json(400, { ok: false });
  const me = await db().collection("teams").doc(String(teamId)).collection("members").doc(user.uid).get();
  if (!me.exists) return json(403, { ok: false, reason: "not-a-member" });
  const base = (process.env.URL || "https://mercertennisprogram.netlify.app").replace(/\/$/, "");
  const path = `/.netlify/functions/calendar?t=${encodeURIComponent(teamId)}&u=${encodeURIComponent(user.uid)}&s=${sign(await calendarSecret(), teamId, user.uid)}`;
  return json(200, { ok: true, https: base + path, webcal: base.replace(/^https?:/, "webcal:") + path });
};
