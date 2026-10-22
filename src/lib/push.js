// Phone notifications (Web Push). The phone subscribes through the app's
// service worker (public/push-sw.js handles incoming pushes); the
// subscription is handed to the push-subscribe Netlify function, which
// stores it server-side. Sending goes through push-send, which checks the
// sender is on the team. See netlify/lib/server.js.
//
// iPhone: needs iOS 16.4+ and the app opened from its Home Screen icon.

import { USING_FIREBASE, getIdToken } from "./db";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

// "unsupported" | "ios-install" | "denied" | "off" | "on"
export async function pushStatus() {
  if (!USING_FIREBASE) return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIOS() && !standalone() ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function urlB64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function call(fn, body) {
  const token = await getIdToken();
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token || ""}` },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false }));
}

export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: perm === "denied" ? "denied" : "dismissed" };
  const cfg = await fetch("/.netlify/functions/push-config").then((r) => r.json()).catch(() => ({}));
  if (!cfg.configured || !cfg.publicKey) return { ok: false, reason: "not-configured" };
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(cfg.publicKey) });
  const res = await call("push-subscribe", { action: "add", subscription: sub.toJSON() });
  return res.ok ? { ok: true } : { ok: false, reason: res.reason || "save-failed" };
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return { ok: true };
  await call("push-subscribe", { action: "remove", subscription: sub.toJSON() }).catch(() => {});
  await sub.unsubscribe();
  return { ok: true };
}

// Fire-and-forget: notify these teammates. Never throws.
export function notify({ teamId, uids, title, body, url, tag }) {
  if (!USING_FIREBASE || !teamId || !uids?.length) return;
  call("push-send", { teamId, uids, title, body, url, tag }).catch(() => {});
}
