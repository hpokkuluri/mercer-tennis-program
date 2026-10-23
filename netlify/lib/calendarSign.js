// Per-player calendar feed signatures. The secret is generated on first use
// and kept in Firestore serverConfig/calendar (server-only, like the push keys).
import crypto from "node:crypto";
import { db } from "./server.js";

let cached = null;
export async function calendarSecret() {
  if (cached) return cached;
  const ref = db().collection("serverConfig").doc("calendar");
  cached = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data().secret) return snap.data().secret;
    const secret = crypto.randomBytes(32).toString("hex");
    tx.set(ref, { secret, createdAt: new Date().toISOString() });
    return secret;
  });
  return cached;
}

export const sign = (secret, teamId, uid) => crypto.createHmac("sha256", secret).update(`${teamId}:${uid}`).digest("hex").slice(0, 32);
