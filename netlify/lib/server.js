// Server-side helpers shared by the Netlify functions: Firebase Admin
// (Firestore + Auth) and Web Push.
//
// Needs FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (a Firebase service
// account key) — the same pair weekend-reminders uses. Nothing else: the
// Web Push (VAPID) keys are generated on first use and kept in Firestore at
// serverConfig/push. Neither serverConfig nor pushSubs has a rule in
// firestore.rules, so the app itself can never read them — only these
// functions (Admin SDK) can.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import webpush from "web-push";
import crypto from "node:crypto";

export function adminReady() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!clientEmail || !privateKey || !projectId) return false;
  if (!getApps().length) {
    // Pasted keys often arrive with literal "\n" or wrapped in quotes.
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return true;
}

export const db = () => getFirestore();

// Signed-in Firebase user from "Authorization: Bearer <idToken>", or null.
export async function userFrom(request) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

let vapidCache = null;
export async function vapidKeys() {
  if (vapidCache) return vapidCache;
  const ref = db().collection("serverConfig").doc("push");
  const keys = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data().publicKey) return snap.data();
    const fresh = webpush.generateVAPIDKeys();
    tx.set(ref, { ...fresh, createdAt: new Date().toISOString() });
    return fresh;
  });
  vapidCache = { publicKey: keys.publicKey, privateKey: keys.privateKey };
  webpush.setVapidDetails("mailto:" + (process.env.GMAIL_USER || "mercertennisprogram@gmail.com"), vapidCache.publicKey, vapidCache.privateKey);
  return vapidCache;
}

export const subId = (endpoint) => crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 24);

// payload: { title, body, url, tag }. Drops subscriptions the browser has
// retired (404/410). Returns how many devices were reached.
export async function pushToUids(uids, payload) {
  if (!uids.length) return 0;
  await vapidKeys();
  let sent = 0;
  const data = JSON.stringify(payload);
  for (const uid of [...new Set(uids)]) {
    const ref = db().collection("pushSubs").doc(uid);
    const snap = await ref.get();
    const subs = (snap.exists && snap.data().subs) || {};
    const dead = [];
    await Promise.all(
      Object.entries(subs).map(async ([id, sub]) => {
        try {
          await webpush.sendNotification(sub, data, { TTL: 60 * 60 * 24 });
          sent += 1;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) dead.push(id);
          else console.log(`push: ${uid}/${id} failed ${err.statusCode || ""} ${err.message}`);
        }
      })
    );
    if (dead.length) {
      const { FieldValue } = await import("firebase-admin/firestore");
      await ref.update(Object.fromEntries(dead.map((id) => [`subs.${id}`, FieldValue.delete()])));
    }
  }
  return sent;
}

export const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
