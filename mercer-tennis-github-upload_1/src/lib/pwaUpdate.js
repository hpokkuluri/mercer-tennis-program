// Lets any screen (Settings) trigger an immediate "is there a new version?"
// check, instead of waiting for the browser's own periodic check — useful
// because an installed iPhone home-screen app doesn't check as eagerly as
// a browser tab does.

let updateSWFn = null;

export function setUpdateSW(fn) {
  updateSWFn = fn;
}

export async function checkForUpdate() {
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update().catch(() => {});
  }
  if (updateSWFn) await updateSWFn();
}

// A stronger, last-resort reset for when a lighter "check for updates"
// still isn't enough (iOS home-screen apps can be stubborn about this) —
// unregisters the service worker, empties the Cache Storage it filled,
// and clears cookies for this site, then hard-reloads. Deliberately
// leaves localStorage/IndexedDB alone so it doesn't sign anyone out.
export async function hardRefresh() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // best effort
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best effort
  }
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  } catch {
    // best effort
  }
  window.location.reload();
}
