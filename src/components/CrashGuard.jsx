import { Component } from "react";
import { hardRefresh } from "../lib/pwaUpdate";

// Never leave a blank white screen. Two cases:
//  1. Right after a deploy, an open (old) copy of the app asks for a screen
//     file that no longer exists → reload once to pick up the new version.
//  2. Any other crash → show what went wrong with Reload / Reset buttons.
const KEY = "mtp.crashReloadAt";
const isChunkError = (e) => /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|Unable to preload|MIME type/i.test(String(e?.message || e));

export function reloadOnceForUpdate() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 15000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // no storage — still try once
  }
  window.location.reload();
  return true;
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (ev) => {
    if (reloadOnceForUpdate()) ev.preventDefault();
  });
}

export default class CrashGuard extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isChunkError(error)) reloadOnceForUpdate();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const btn = { padding: "13px 18px", borderRadius: 12, fontSize: 15, fontWeight: 700, border: "none", width: "100%" };
    return (
      <div data-testid="crash-screen" style={{ minHeight: "100dvh", background: "#93c100", color: "#1d2a00", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Something went wrong</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.45 }}>The app hit an error. Reloading usually fixes it — if not, Reset app clears the cached copy (you stay signed in).</div>
        <button type="button" onClick={() => window.location.reload()} style={{ ...btn, background: "#1d2a00", color: "white" }}>Reload</button>
        <button type="button" onClick={() => hardRefresh()} style={{ ...btn, background: "rgba(255,255,255,.7)", color: "#1d2a00" }}>Reset app</button>
        <div style={{ fontSize: 11.5, opacity: 0.7, wordBreak: "break-word" }}>Error: {String(error?.message || error).slice(0, 300)}</div>
      </div>
    );
  }
}
