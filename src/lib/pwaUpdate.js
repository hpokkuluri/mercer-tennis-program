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
