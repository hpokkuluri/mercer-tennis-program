import { useEffect, useState } from "react";

const KEY = "mtp.installBanner.dismissed";
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

let deferredPrompt = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event("mtp-installable"));
  });
}

// Hub: one-time nudge to put the app on the home screen (needed on iPhone
// for notifications). Hidden once installed or dismissed.
export default function InstallBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const [canPrompt, setCanPrompt] = useState(Boolean(deferredPrompt));
  useEffect(() => {
    const on = () => setCanPrompt(true);
    window.addEventListener("mtp-installable", on);
    return () => window.removeEventListener("mtp-installable", on);
  }, []);

  if (dismissed || standalone()) return null;
  const ios = isIOS();
  if (!ios && !canPrompt) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // private mode — fine, it just shows again next time
    }
  };

  return (
    <div data-testid="install-banner" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)" }}>
      <img src="/icons/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>Install the app</div>
        {ios ? (
          <>
            In Safari tap <b>Share</b> <span aria-hidden>⬆️</span> → <b>Add to Home Screen</b>. Open it from the icon to get notifications.
          </>
        ) : (
          <>
            Add it to your home screen for a full-screen app and notifications.
            <div>
              <button
                type="button"
                onClick={async () => {
                  deferredPrompt?.prompt();
                  await deferredPrompt?.userChoice.catch(() => {});
                  deferredPrompt = null;
                  close();
                }}
                className="display"
                style={{ marginTop: 8, border: "none", borderRadius: 999, padding: "7px 14px", fontWeight: 700, background: "var(--accent)", color: "var(--accent-text)" }}
              >
                Install
              </button>
            </div>
          </>
        )}
      </div>
      <button type="button" onClick={close} aria-label="Dismiss" style={{ border: "none", background: "none", fontSize: 18, color: "var(--text-faint)", lineHeight: 1, padding: 2 }}>×</button>
    </div>
  );
}
