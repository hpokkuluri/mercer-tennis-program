// POST { action: "add" | "remove", subscription } with the signed-in user's
// Firebase ID token. Stores this phone's push subscription under
// pushSubs/{uid} (server-only — see ../lib/server.js).
import { FieldValue } from "firebase-admin/firestore";
import { adminReady, db, userFrom, subId, json } from "../lib/server.js";

export default async (request) => {
  if (request.method !== "POST") return json(405, { ok: false });
  if (!adminReady()) return json(200, { ok: false, reason: "not-configured" });
  const user = await userFrom(request);
  if (!user) return json(401, { ok: false, reason: "unauthorized" });
  const { action, subscription } = await request.json().catch(() => ({}));
  if (!subscription?.endpoint || !/^https:\/\//.test(subscription.endpoint)) return json(400, { ok: false, reason: "bad-subscription" });
  const ref = db().collection("pushSubs").doc(user.uid);
  const id = subId(subscription.endpoint);
  if (action === "remove") {
    await ref.set({ subs: { [id]: FieldValue.delete() } }, { merge: true });
    return json(200, { ok: true });
  }
  const sub = { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth } };
  await ref.set({ subs: { [id]: sub }, updatedAt: new Date().toISOString() }, { merge: true });
  return json(200, { ok: true });
};
