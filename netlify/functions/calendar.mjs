// GET ?t=<teamId>&u=<uid>&s=<signature> → that player's games as a
// calendar feed (text/calendar). Phones subscribe to this URL, so their
// calendar keeps updating. The signature (from calendar-link) stops anyone
// from guessing someone else's feed.
import crypto from "node:crypto";
import { adminReady, db } from "../lib/server.js";
import { calendarSecret, sign } from "../lib/calendarSign.js";
import { buildIcs } from "../../src/lib/ics.js";

export default async (request) => {
  if (!adminReady()) return new Response("Calendar isn't set up yet.", { status: 503 });
  const q = new URL(request.url).searchParams;
  const t = q.get("t") || "";
  const u = q.get("u") || "";
  const s = q.get("s") || "";
  const want = sign(await calendarSecret(), t, u);
  if (!t || !u || s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return new Response("Not found", { status: 404 });
  const team = db().collection("teams").doc(t);
  const [teamSnap, memSnap] = await Promise.all([team.get(), team.collection("members").get()]);
  if (!teamSnap.exists) return new Response("Not found", { status: 404 });
  const members = Object.fromEntries(memSnap.docs.map((d) => [d.id, d.data()]));
  if (!members[u]) return new Response("Not found", { status: 404 });
  const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const evSnap = await team.collection("events").where("date", ">=", since).get();
  const events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ics = buildIcs({ events, uid: u, members, teamName: teamSnap.data().name, appUrl: process.env.URL || "https://mercertennisprogram.netlify.app" });
  return new Response(ics, { status: 200, headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=900", "content-disposition": 'inline; filename="mercer-tennis.ics"' } });
};
