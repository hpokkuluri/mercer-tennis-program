// POST { teamId, uids, title, body, url, tag } with the signed-in user's
// Firebase ID token. Only a member of that team can send, only to other
// members of that team, and only short texts — so the endpoint can't be
// used to spam anyone else.
import { adminReady, db, userFrom, pushToUids, json } from "../lib/server.js";

export default async (request) => {
  if (request.method !== "POST") return json(405, { ok: false });
  if (!adminReady()) return json(200, { ok: false, reason: "not-configured" });
  const user = await userFrom(request);
  if (!user) return json(401, { ok: false, reason: "unauthorized" });
  const { teamId, uids, title, body, url, tag } = await request.json().catch(() => ({}));
  if (!teamId || !Array.isArray(uids) || !title) return json(400, { ok: false, reason: "missing-fields" });
  const team = db().collection("teams").doc(String(teamId));
  const me = await team.collection("members").doc(user.uid).get();
  if (!me.exists) return json(403, { ok: false, reason: "not-a-member" });
  const memberIds = new Set((await team.collection("members").get()).docs.map((d) => d.id));
  const targets = uids.filter((u) => typeof u === "string" && memberIds.has(u)).slice(0, 100);
  const safeUrl = typeof url === "string" && url.startsWith("/") ? url : "/";
  const sent = await pushToUids(targets, {
    title: String(title).slice(0, 80),
    body: String(body || "").slice(0, 240),
    url: safeUrl,
    tag: tag ? String(tag).slice(0, 60) : undefined,
  });
  return json(200, { ok: true, sent });
};
